from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from legal_draft_generator.models import (
    DocumentIngestionResponse,
    DraftGenerationRequest,
    DraftGenerationResponse,
    FeedbackRequest,
    FeedbackResponse,
    SkillResponse,
    SkillUpdateRequest,
    SystemMetricsResponse
)
from legal_draft_generator.ingestion.processor import DocumentProcessor
from legal_draft_generator.retrieval.vector_store import VectorStore
from legal_draft_generator.generation.drafter import Drafter
from legal_draft_generator.feedback.learner import Learner
from legal_draft_generator.config import get_settings
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import Optional, List
import uuid
import asyncio
import os
import shutil

app = FastAPI(title="Legal Draft Generator API", version="0.1.0")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency injection / Singleton-ish instances for the demo
processor = DocumentProcessor()
vector_store = VectorStore()
learner = Learner()
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)

def get_embeddings():
    settings = get_settings()
    return OpenAIEmbeddings(
        openai_api_key=settings.OPENROUTER_API_KEY,
        openai_api_base="https://openrouter.ai/api/v1"
    )

@app.post("/api/v1/documents", response_model=DocumentIngestionResponse, status_code=201)
async def ingest_document(
    file: UploadFile = File(...)
):
    try:
        content = await file.read()
        processed = await processor.process_file(
            content, file.filename
        )
        
        doc_id = str(uuid.uuid4())
        embeddings_model = get_embeddings()
        
        # Chunking
        text = processed["text"]
        chunks = text_splitter.split_text(text or " ")
        
        # Embedding and Storing
        embeddings = await embeddings_model.aembed_documents(chunks)
        metadatas = [
            {**processed["metadata"], "document_id": doc_id, "chunk_index": i}
            for i in range(len(chunks))
        ]
        
        chunk_ids = await vector_store.add_documents(chunks, metadatas, embeddings)
        
        # Populate chunks dict with full content
        chunks_map = {cid: ctext for cid, ctext in zip(chunk_ids, chunks)}

        # Update metadata for response
        metadata = {**processed["metadata"], "document_id": doc_id}
        
        return DocumentIngestionResponse(
            document_id=doc_id,
            status="success",
            metadata=metadata,
            chunks=chunks_map,
            message="Document ingested, chunked, and indexed successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/drafts/generate", response_model=DraftGenerationResponse)
async def generate_draft(request: DraftGenerationRequest):
    try:
        embeddings_model = get_embeddings()
        query_vector = await embeddings_model.aembed_query(request.focus_query or request.draft_type)
        
        # Retrieve context
        filter_dict = {"document_id": request.document_ids}
        context = await vector_store.search(query_vector, filter_dict=filter_dict)
        
        if not context:
            raise HTTPException(status_code=404, detail="No relevant context found in specified documents")
        
        # Generate draft
        drafter = Drafter(mode="quick")
        result = await drafter.generate_draft(
            request.draft_type, context, request.focus_query
        )
        
        source_chunks_data = {str(c["id"]): c["text"] for c in context}
        
        return DraftGenerationResponse(
            draft_id=result["draft_id"],
            status="success",
            draft_content=result["content"],
            citations=result["citations"],
            source_chunks=source_chunks_data,
            grounding_confidence=result["grounding_confidence"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/drafts/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    try:
        final_skill = await learner.learn_from_edit(
            request.original_content, request.edited_content, request.draft_type
        )
        
        return FeedbackResponse(
            status="success",
            updated_skill=final_skill,
            message=f"Feedback for {request.draft_type} processed and skill updated"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/system/eval-metrics", response_model=SystemMetricsResponse)
async def get_metrics():
    # In a real app, these would come from a database tracking performance
    return SystemMetricsResponse(
        ingestion_metrics={"ocr_confidence": 0.95, "success_rate": 0.98},
        retrieval_grounding_metrics={"precision@5": 0.88, "grounding_score": 0.92},
        draft_quality_metrics={"coherence": 0.9, "relevance": 0.94},
        learning_loop_effectiveness={"improvement_delta": 0.15},
        overall_system_health={"status": "healthy", "version": "0.1.0"}
    )

# --- Skills Management APIs ---

@app.get("/api/v1/skills/{draft_type}", response_model=SkillResponse)
async def get_skill(draft_type: str):
    skill_md_path = f"skills/{draft_type}/SKILL.md"
    if not os.path.exists(skill_md_path):
        raise HTTPException(status_code=404, detail=f"Skill for {draft_type} not found")
    
    with open(skill_md_path, "r") as f:
        content = f.read()
    
    return SkillResponse(draft_type=draft_type, content=content)

@app.put("/api/v1/skills/{draft_type}", response_model=SkillResponse)
async def update_skill(draft_type: str, request: SkillUpdateRequest):
    try:
        # LLM-driven merge and update
        final_skill = await learner.learn_from_instruction(request.content, draft_type)
        
        return SkillResponse(draft_type=draft_type, content=final_skill)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/skills/{draft_type}")
async def delete_skill(draft_type: str):
    skill_dir = f"skills/{draft_type}"
    if not os.path.exists(skill_dir):
        raise HTTPException(status_code=404, detail=f"Skill directory for {draft_type} not found")
    
    shutil.rmtree(skill_dir)
    return {"status": "success", "message": f"Skill {draft_type} and its directory deleted"}
