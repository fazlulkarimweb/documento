from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class DocumentIngestionResponse(BaseModel):
    document_id: str
    status: str
    metadata: Dict
    chunks: Dict[str, str]
    message: str
    ingested_at: Optional[str] = None

class DocumentListItem(BaseModel):
    document_id: str
    status: str
    metadata: Dict
    chunk_count: int
    ingested_at: str

class DocumentListResponse(BaseModel):
    documents: List[DocumentListItem]
    total: int

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
    source_chunks: Dict[str, str]
    draft_type: str
    document_ids: List[str]
    instructions: Optional[str] = None
    created_at: str
    updated_at: str
    grounding_confidence: Optional[float] = None

class DraftListItem(BaseModel):
    draft_id: str
    draft_type: str
    status: str
    grounding_confidence: float
    document_ids: List[str]
    instructions: Optional[str] = None
    created_at: str
    updated_at: str
    preview: str

class DraftListResponse(BaseModel):
    drafts: List[DraftListItem]
    total: int

class DraftDetailResponse(DraftGenerationResponse):
    edited_content: Optional[str] = None

class DraftPatchRequest(BaseModel):
    edited_content: str

class FeedbackRequest(BaseModel):
    draft_type: str
    original_content: str
    edited_content: str
    operator_id: Optional[str] = None

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

class StatsResponse(BaseModel):
    documents: int
    drafts: int
    skills: int
    avg_grounding_confidence: float

class SkillResponse(BaseModel):

    draft_type: str
    content: str
    metadata: Optional[Dict] = None

class SkillsListResponse(BaseModel):
    skills: List[SkillResponse]

class SkillUpdateRequest(BaseModel):
    content: str  # The full new content for SKILL.md
