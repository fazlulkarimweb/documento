export type DraftType = string

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
  ingested_at?: string
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
  source_chunks: DocumentChunks
  grounding_score: number
  draft_type?: string
  document_ids?: string[]
  instructions?: string
  edited_content?: string | null
  created_at?: string
  updated_at?: string
  citations?: Citation[]
}

export interface FeedbackRequest {
  draft_type: string
  original_content: string
  edited_content: string
}

export interface FeedbackResponse {
  status: string
  updated_skill?: string
  message: string
}

export interface Skill {
  draft_type: string
  content: string
  metadata?: Record<string, unknown> | null
}

export interface SkillsListResponse {
  skills: Skill[]
}

export interface StoredDocument {
  document_id: string
  status: string
  metadata: DocumentMetadata
  chunks?: DocumentChunks
  chunk_count: number
  ingested_at: string
}

export interface StoredDraft {
  draft_id: string
  draft_type: string
  status: string
  grounding_score: number
  document_ids: string[]
  instructions?: string
  created_at: string
  updated_at: string
  preview?: string
}

export interface DocumentListResponse {
  documents: StoredDocument[]
  total: number
}

export interface DraftListResponse {
  drafts: StoredDraft[]
  total: number
}

export interface StatsResponse {
  documents: number
  drafts: number
  skills: number
  avg_grounding_score: number
}
