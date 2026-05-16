import type {
  IngestResponse,
  DraftResponse,
  FeedbackResponse,
  Skill,
  SkillsListResponse,
  DocumentListResponse,
  DraftListResponse,
  StatsResponse,
} from "./types"
import {
  mockIngest,
  mockGenerateDraft,
  mockFeedback,
  mockListSkills,
  mockGetSkill,
  mockUpdateSkill,
  mockDeleteSkill,
  mockListDocuments,
  mockGetDocument,
  mockDeleteDocument,
  mockListDrafts,
  mockGetDraft,
  mockUpdateDraft,
  mockDeleteDraft,
  mockGetStats,
} from "./mock-api"

const API_BASE = process.env.NEXT_PUBLIC_API || "http://localhost:8000"
const USE_MOCK =
  (process.env.NEXT_PUBLIC_MOCK || "true").toLowerCase() === "true"

export const isMock = USE_MOCK
export const apiBase = API_BASE

async function jsonOrThrow<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    let detail = ""
    try {
      const body = await res.json()
      detail = body.detail || JSON.stringify(body)
    } catch {}
    throw new Error(`${label} failed: ${res.status}${detail ? ` — ${detail}` : ""}`)
  }
  return res.json()
}

// ---------- Documents ----------
export async function ingestDocument(file: File): Promise<IngestResponse> {
  if (USE_MOCK) return mockIngest(file)
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${API_BASE}/api/v1/documents`, {
    method: "POST",
    body: form,
  })
  return jsonOrThrow<IngestResponse>(res, "Ingest")
}

export async function listDocuments(): Promise<DocumentListResponse> {
  if (USE_MOCK) return mockListDocuments()
  const res = await fetch(`${API_BASE}/api/v1/documents`, {
    headers: { accept: "application/json" },
  })
  return jsonOrThrow<DocumentListResponse>(res, "List documents")
}

export async function getDocument(id: string): Promise<IngestResponse> {
  if (USE_MOCK) return mockGetDocument(id)
  const res = await fetch(
    `${API_BASE}/api/v1/documents/${encodeURIComponent(id)}`,
    { headers: { accept: "application/json" } },
  )
  return jsonOrThrow<IngestResponse>(res, "Get document")
}

export async function deleteDocument(
  id: string,
): Promise<{ status: string; document_id: string }> {
  if (USE_MOCK) return mockDeleteDocument(id)
  const res = await fetch(
    `${API_BASE}/api/v1/documents/${encodeURIComponent(id)}`,
    { method: "DELETE", headers: { accept: "application/json" } },
  )
  return jsonOrThrow(res, "Delete document")
}

// ---------- Drafts ----------
export async function generateDraft(opts: {
  document_ids: string[]
  draft_type: string
  instructions?: string
}): Promise<DraftResponse> {
  if (USE_MOCK) return mockGenerateDraft(opts)
  const res = await fetch(`${API_BASE}/api/v1/drafts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      document_ids: opts.document_ids,
      draft_type: opts.draft_type,
      focus_query: opts.instructions,
    }),
  })
  return jsonOrThrow<DraftResponse>(res, "Draft generation")
}

export async function listDrafts(): Promise<DraftListResponse> {
  if (USE_MOCK) return mockListDrafts()
  const res = await fetch(`${API_BASE}/api/v1/drafts`, {
    headers: { accept: "application/json" },
  })
  return jsonOrThrow<DraftListResponse>(res, "List drafts")
}

export async function getDraft(id: string): Promise<DraftResponse> {
  if (USE_MOCK) return mockGetDraft(id)
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(id)}`,
    { headers: { accept: "application/json" } },
  )
  return jsonOrThrow<DraftResponse>(res, "Get draft")
}

export async function updateDraft(
  id: string,
  patch: { edited_content?: string | null },
): Promise<DraftResponse> {
  if (USE_MOCK) return mockUpdateDraft(id, patch)
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(patch),
    },
  )
  return jsonOrThrow<DraftResponse>(res, "Update draft")
}

export async function deleteDraft(
  id: string,
): Promise<{ status: string; draft_id: string }> {
  if (USE_MOCK) return mockDeleteDraft(id)
  const res = await fetch(
    `${API_BASE}/api/v1/drafts/${encodeURIComponent(id)}`,
    { method: "DELETE", headers: { accept: "application/json" } },
  )
  return jsonOrThrow(res, "Delete draft")
}

// ---------- Feedback ----------
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
  return jsonOrThrow<FeedbackResponse>(res, "Feedback")
}

// ---------- Skills ----------
export async function listSkills(): Promise<SkillsListResponse> {
  if (USE_MOCK) return mockListSkills()
  const res = await fetch(`${API_BASE}/api/v1/skills`, {
    headers: { accept: "application/json" },
  })
  return jsonOrThrow<SkillsListResponse>(res, "List skills")
}

export async function getSkill(draft_type: string): Promise<Skill> {
  if (USE_MOCK) return mockGetSkill(draft_type)
  const res = await fetch(
    `${API_BASE}/api/v1/skills/${encodeURIComponent(draft_type)}`,
    { headers: { accept: "application/json" } },
  )
  return jsonOrThrow<Skill>(res, "Get skill")
}

export async function updateSkill(
  draft_type: string,
  content: string,
): Promise<Skill> {
  if (USE_MOCK) return mockUpdateSkill(draft_type, content)
  const res = await fetch(
    `${API_BASE}/api/v1/skills/${encodeURIComponent(draft_type)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ content }),
    },
  )
  return jsonOrThrow<Skill>(res, "Update skill")
}

export async function deleteSkill(
  draft_type: string,
): Promise<{ status: string; message: string }> {
  if (USE_MOCK) return mockDeleteSkill(draft_type)
  const res = await fetch(
    `${API_BASE}/api/v1/skills/${encodeURIComponent(draft_type)}`,
    { method: "DELETE", headers: { accept: "application/json" } },
  )
  return jsonOrThrow(res, "Delete skill")
}

// ---------- Stats ----------
export async function getStats(): Promise<StatsResponse> {
  if (USE_MOCK) return mockGetStats()
  const res = await fetch(`${API_BASE}/api/v1/stats`, {
    headers: { accept: "application/json" },
  })
  return jsonOrThrow<StatsResponse>(res, "Stats")
}
