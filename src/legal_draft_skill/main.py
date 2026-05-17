from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from legal_draft_skill.models import (
    DocumentIngestionResponse,
    DocumentListResponse,
    DraftGenerationRequest,
    DraftGenerationResponse,
    DraftListResponse,
    DraftDetailResponse,
    DraftPatchRequest,
    FeedbackRequest,
    FeedbackResponse,
    SkillResponse,
    SkillsListResponse,
    SkillUpdateRequest,
    SystemMetricsResponse,
    StatsResponse
)
from legal_draft_skill.ingestion.processor import DocumentProcessor
from legal_draft_skill.retrieval.vector_store import VectorStore
from legal_draft_skill.generation.drafter import Drafter
from legal_draft_skill.feedback.learner import Learner
from legal_draft_skill.config import get_settings
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import Optional, List
import uuid
import asyncio
import os
import shutil
from datetime import datetime
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up models and connections
    print("Pre-loading AI models and weights...")
    get_embeddings()
    # Processor is already instantiated at module level, but we could 
    # trigger a dummy conversion here if Docling supported a specific 'warmup'
    yield
    print("Shutting down...")

app = FastAPI(title="Legal Draft Generator API", version="0.1.0", lifespan=lifespan)

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

# Pre-initialize embeddings to avoid loading on request
_embeddings_instance = None

def get_embeddings():
    global _embeddings_instance
    if _embeddings_instance is None:
        settings = get_settings()
        _embeddings_instance = OpenAIEmbeddings(
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base="https://openrouter.ai/api/v1"
        )
    return _embeddings_instance

# --- Document Endpoints ---

@app.post("/api/v1/documents", response_model=DocumentIngestionResponse, status_code=201)
async def ingest_document(
    file: UploadFile = File(...)
):
    try:
        await vector_store.log_event("ingest_attempt", {"filename": file.filename})
        content = await file.read()
        processed = await processor.process_file(
            content, file.filename
        )
        
        doc_id = str(uuid.uuid4())
        embeddings_model = get_embeddings()
        
        # Chunking
        text = processed["text"]
        chunks = text_splitter.split_text(text or " ")
        
        # Embedding and Storing chunks
        embeddings = await embeddings_model.aembed_documents(chunks)
        metadatas = [
            {**processed["metadata"], "document_id": doc_id, "chunk_index": i}
            for i in range(len(chunks))
        ]
        
        chunk_ids = await vector_store.add_documents(chunks, metadatas, embeddings)
        
        # Persist top-level file object
        ingested_at = await vector_store.add_file(doc_id, processed["metadata"])
        
        # Populate chunks dict with full content
        chunks_map = {cid: ctext for cid, ctext in zip(chunk_ids, chunks)}

        metadata = {**processed["metadata"], "document_id": doc_id}
        
        await vector_store.log_event("ingest_success", {"document_id": doc_id})
        
        return DocumentIngestionResponse(
            document_id=doc_id,
            status="success",
            metadata=metadata,
            chunks=chunks_map,
            message="Document ingested, chunked, and indexed successfully",
            ingested_at=ingested_at
        )
    except Exception as e:
        await vector_store.log_event("ingest_error", {"filename": file.filename, "error": str(e)})
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/documents", response_model=DocumentListResponse)
async def list_documents(limit: int = 50, offset: int = 0, q: Optional[str] = None):
    docs, total = await vector_store.list_files(limit=limit, offset=offset, q=q)
    return DocumentListResponse(documents=docs, total=total)

@app.get("/api/v1/documents/{document_id}", response_model=DocumentIngestionResponse)
async def get_document(document_id: str):
    doc = await vector_store.get_file(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@app.delete("/api/v1/documents/{document_id}")
async def delete_document(document_id: str):
    await vector_store.delete_file(document_id)
    return {"status": "deleted", "document_id": document_id}

# --- Draft Endpoints ---

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
        drafter = Drafter()
        result = await drafter.generate_draft(
            request.draft_type, context, request.focus_query
        )
        
        source_chunks_data = {str(c["id"]): c["text"] for c in context}
        
        draft_id = result["draft_id"]
        now = datetime.utcnow().isoformat() + "Z"
        
        draft_response = {
            "draft_id": draft_id,
            "status": "success",
            "draft_content": result["content"],
            "source_chunks": source_chunks_data,
            "draft_type": request.draft_type,
            "document_ids": request.document_ids,
            "instructions": request.focus_query,
            "created_at": now,
            "updated_at": now,
            "grounding_score": result["grounding_score"]
        }
        
        # Persist draft
        await vector_store.save_draft(draft_response)
        
        return DraftGenerationResponse(**draft_response)
    except Exception as e:
        await vector_store.log_event("draft_error", {"error": str(e), "draft_type": request.draft_type})
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/drafts", response_model=DraftListResponse)
async def list_drafts(limit: int = 50, offset: int = 0, draft_type: Optional[str] = None, document_id: Optional[str] = None):
    drafts, total = await vector_store.list_drafts(limit=limit, offset=offset, draft_type=draft_type, document_id=document_id)
    return DraftListResponse(drafts=drafts, total=total)

@app.get("/api/v1/drafts/{draft_id}", response_model=DraftDetailResponse)
async def get_draft(draft_id: str):
    draft = await vector_store.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft

@app.patch("/api/v1/drafts/{draft_id}", response_model=DraftDetailResponse)
async def patch_draft(draft_id: str, request: DraftPatchRequest):
    draft = await vector_store.update_draft_content(draft_id, request.edited_content)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft

@app.delete("/api/v1/drafts/{draft_id}")
async def delete_draft(draft_id: str):
    await vector_store.delete_draft(draft_id)
    return {"status": "deleted", "draft_id": draft_id}

# --- Feedback & Stats Endpoints ---

@app.post("/api/v1/drafts/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    try:
        final_skill = await learner.learn_from_edit(
            request.original_content, request.edited_content, request.draft_type
        )
        
        await vector_store.log_event("feedback_applied", {"draft_type": request.draft_type})
        
        return FeedbackResponse(
            status="success",
            updated_skill=final_skill,
            message=f"Feedback for {request.draft_type} processed and skill updated"
        )
    except Exception as e:
        await vector_store.log_event("feedback_error", {"draft_type": request.draft_type, "error": str(e)})
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/stats", response_model=StatsResponse)
async def get_stats():
    stats = await vector_store.get_stats()
    return StatsResponse(**stats)

@app.get("/api/v1/system/eval-metrics", response_model=SystemMetricsResponse)
async def get_metrics():
    metrics = await vector_store.get_eval_metrics()
    return SystemMetricsResponse(**metrics)

# --- Skills Management APIs ---

import yaml

@app.get("/api/v1/skills", response_model=SkillsListResponse)
async def list_skills():
    skills_list = []
    base_skills_dir = "skills"
    if os.path.exists(base_skills_dir):
        for draft_type in sorted(os.listdir(base_skills_dir)):
            skill_md_path = os.path.join(base_skills_dir, draft_type, "SKILL.md")
            if os.path.isfile(skill_md_path):
                with open(skill_md_path, "r") as f:
                    content = f.read()

                # Try to parse frontmatter
                metadata = {}
                if content.startswith("```yaml"):
                    try:
                        parts = content.split("```", 2)
                        if len(parts) >= 3:
                            yaml_content = parts[1].strip()
                            if yaml_content.startswith("yaml"):
                                yaml_content = yaml_content[4:].strip()
                            metadata = yaml.safe_load(yaml_content)
                    except Exception:
                        pass
                elif content.startswith("---"):
                    try:
                        parts = content.split("---", 2)
                        if len(parts) >= 3:
                            metadata = yaml.safe_load(parts[1])
                    except Exception:
                        pass

                skills_list.append(SkillResponse(draft_type=draft_type, content=content, metadata=metadata))

    return SkillsListResponse(skills=skills_list)

@app.get("/api/v1/skills/{draft_type}", response_model=SkillResponse)
async def get_skill(draft_type: str):
    skill_md_path = f"skills/{draft_type}/SKILL.md"
    if not os.path.exists(skill_md_path):
        raise HTTPException(status_code=404, detail=f"Skill for {draft_type} not found")

    with open(skill_md_path, "r") as f:
        content = f.read()

    # Try to parse frontmatter
    metadata = {}
    if content.startswith("```yaml"):
        try:
            parts = content.split("```", 2)
            if len(parts) >= 3:
                yaml_content = parts[1].strip()
                if yaml_content.startswith("yaml"):
                    yaml_content = yaml_content[4:].strip()
                metadata = yaml.safe_load(yaml_content)
        except Exception:
            pass
    elif content.startswith("---"):
        try:
            parts = content.split("---", 2)
            if len(parts) >= 3:
                metadata = yaml.safe_load(parts[1])
        except Exception:
            pass

    return SkillResponse(draft_type=draft_type, content=content, metadata=metadata)


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
