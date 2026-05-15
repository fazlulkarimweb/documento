import type {
  IngestResponse,
  DraftResponse,
  FeedbackResponse,
  DraftType,
} from "./types"
import { mockIngest, mockGenerateDraft, mockFeedback } from "./mock-api"

const API_BASE = process.env.NEXT_PUBLIC_API || "http://localhost:8000"
const USE_MOCK =
  (process.env.NEXT_PUBLIC_MOCK || "true").toLowerCase() === "true"

export const isMock = USE_MOCK

export async function ingestDocument(file: File): Promise<IngestResponse> {
  if (USE_MOCK) return mockIngest(file)
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${API_BASE}/api/v1/documents`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`)
  return res.json()
}

export async function generateDraft(opts: {
  document_ids: string[]
  draft_type: DraftType | string
  focus_query?: string
}): Promise<DraftResponse> {
  if (USE_MOCK) return mockGenerateDraft(opts)
  const res = await fetch(`${API_BASE}/api/v1/drafts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(opts),
  })
  if (!res.ok) throw new Error(`Draft generation failed: ${res.status}`)
  return res.json()
}

export async function submitFeedback(opts: {
  draft_type: string
  original_content: string
  edited_content: string
}): Promise<FeedbackResponse> {
  if (USE_MOCK) return mockFeedback(opts)
  const res = await fetch(`${API_BASE}/api/v1/drafts/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(opts),
  })
  if (!res.ok) throw new Error(`Feedback failed: ${res.status}`)
  return res.json()
}
