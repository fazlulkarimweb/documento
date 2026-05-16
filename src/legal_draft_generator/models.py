from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class DocumentIngestionResponse(BaseModel):
    document_id: str
    status: str
    metadata: Dict
    chunks: Dict[str, str]  # Map of chunk_id -> chunk_text (or empty if too big)
    message: str

class DraftGenerationRequest(BaseModel):
    document_ids: List[str]
    draft_type: str
    focus_query: Optional[str] = None

class Citation(BaseModel):
    source_document_id: str
    source_file_name: str
    text_segment: str

class DraftGenerationResponse(BaseModel):
    draft_id: str
    status: str
    draft_content: str
    citations: List[Citation]
    source_chunks: Dict[str, str]  # Map of chunk_id -> chunk_text
    grounding_confidence: Optional[float] = None

class FeedbackRequest(BaseModel):
    draft_type: str
    original_content: str
    edited_content: str

class FeedbackResponse(BaseModel):
    status: str
    updated_skill: str
    message: str

class SystemMetricsResponse(BaseModel):
    ingestion_metrics: Dict
    retrieval_grounding_metrics: Dict
    draft_quality_metrics: Dict
    learning_loop_effectiveness: Dict
    overall_system_health: Dict

class SkillResponse(BaseModel):
    draft_type: str
    content: str
    metadata: Optional[Dict] = None

class SkillsListResponse(BaseModel):
    skills: List[SkillResponse]

class SkillUpdateRequest(BaseModel):
    content: str  # The full new content for SKILL.md
