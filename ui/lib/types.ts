export type DraftType = "legal-memo" | "case-summary" | "demand-letter" | "client-brief"

export interface DocumentChunks {
  [chunkId: string]: string
}

export interface DocumentMetadata {
  filename: string
  page_count: number
  document_id: string
}

export interface IngestResponse {
  document_id: string
  status: string
  metadata: DocumentMetadata
  chunks: DocumentChunks
  message: string
}

export interface Citation {
  source_document_id: string
  source_file_name: string
  text_segment: string
}

export interface DraftResponse {
  draft_id: string
  status: string
  draft_content: string
  citations: Citation[]
  source_chunks: DocumentChunks
  grounding_confidence: number
}

export interface FeedbackRequest {
  draft_type: DraftType | string
  original_content: string
  edited_content: string
}

export interface LearnedPattern {
  pattern_type: string
  description: string
  suggested_instruction: string
  draft_type: string
}

export interface FeedbackResponse {
  status: string
  learned_pattern: LearnedPattern
  message: string
}

export interface StoredDocument extends IngestResponse {
  ingested_at: string
}

export interface StoredDraft extends DraftResponse {
  draft_type: DraftType | string
  focus_query?: string
  document_ids: string[]
  created_at: string
  edited_content?: string
}
