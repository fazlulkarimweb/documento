import type {
  IngestResponse,
  DraftResponse,
  FeedbackResponse,
  Skill,
  SkillsListResponse,
  DocumentListResponse,
  DraftListResponse,
  StatsResponse,
  StoredDocument,
  StoredDraft,
} from "./types"

function uid() {
  return crypto.randomUUID()
}

const MOCK_SKILLS_KEY = "li-mock-skills-v1"
const MOCK_DOCS_KEY = "li-mock-docs-v1"
const MOCK_DRAFTS_KEY = "li-mock-drafts-v1"

// ---------- generic local store helpers ----------
function load<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {}
  localStorage.setItem(key, JSON.stringify(seed))
  return seed
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

// ---------- skills ----------
function loadMockSkills(): Skill[] {
  return load<Skill[]>(MOCK_SKILLS_KEY, [
    {
      draft_type: "legal-memo",
      content:
        '# Skill: legal-memo\n## Metadata\n- Pattern Type: Direct_Override\n- Description: Enforce memorandum header labeling, active voice in background sections, and dual signatory requirements.\n\n## Instructions\n- Headers must explicitly state "LEGAL MEMORANDUM".\n- Ensure the background section is written exclusively in the active voice.\n- All memos must be signed by authorized signatories.',
      metadata: { description: "Enforce memorandum header labeling, active voice in background sections, and dual signatory requirements." },
    },
  ])
}
function saveMockSkills(s: Skill[]) {
  save(MOCK_SKILLS_KEY, s)
}

// ---------- documents ----------
interface MockDocument {
  document_id: string
  status: string
  metadata: { filename: string; page_count: number; document_id: string }
  chunks: Record<string, string>
  ingested_at: string
}
function loadMockDocs(): MockDocument[] {
  return load<MockDocument[]>(MOCK_DOCS_KEY, [])
}
function saveMockDocs(d: MockDocument[]) {
  save(MOCK_DOCS_KEY, d)
}

// ---------- drafts ----------
interface MockDraft {
  draft_id: string
  draft_type: string
  status: string
  draft_content: string
  edited_content?: string | null
  source_chunks: Record<string, string>
  grounding_score: number
  document_ids: string[]
  instructions?: string
  created_at: string
  updated_at: string
}
function loadMockDrafts(): MockDraft[] {
  return load<MockDraft[]>(MOCK_DRAFTS_KEY, [])
}
function saveMockDrafts(d: MockDraft[]) {
  save(MOCK_DRAFTS_KEY, d)
}

// ---------- ingest ----------
export async function mockIngest(file: File): Promise<IngestResponse> {
  await new Promise((r) => setTimeout(r, 900))
  const document_id = uid()
  const ingested_at = new Date().toISOString()
  const chunks: Record<string, string> = {
    [uid()]:
      '## LEGAL NOTICE / URGENT DEMAND FOR POSSESSION\n\nDATE: May 1, 2026 On behalf of Md Jahir (the "Landlord")\n\nFROM: Advocate Rahat Khan Road 12, House 45, Uttara, Dhaka\n\nTO: Md Karim (the "Tenant") Flat 4B, Bluebell Apartments',
    [uid()]:
      "Statement of Defaults: November 2025 through April 2026 UNPAID. Total Arrears: 270,000 BDT (excluding utility surcharges of 12,400 BDT).",
    [uid()]:
      "Pursuant to Clause 14 (Termination for Default) of the Lease Agreement, the Landlord hereby exercises the right to terminate your tenancy effective immediately. Vacation of Property by no later than May 15, 2026.",
  }
  const docs = loadMockDocs()
  docs.unshift({
    document_id,
    status: "ingested",
    metadata: { filename: file.name, page_count: 4, document_id },
    chunks,
    ingested_at,
  })
  saveMockDocs(docs)
  return {
    document_id,
    status: "success",
    metadata: { filename: file.name, page_count: 4, document_id },
    chunks,
    message: "Document ingested, chunked, and indexed successfully (mock)",
    ingested_at,
  }
}

export async function mockListDocuments(): Promise<DocumentListResponse> {
  await new Promise((r) => setTimeout(r, 150))
  const docs = loadMockDocs()
  const stored: StoredDocument[] = docs.map((d) => ({
    document_id: d.document_id,
    status: d.status,
    metadata: d.metadata,
    chunk_count: Object.keys(d.chunks).length,
    ingested_at: d.ingested_at,
  }))
  return { documents: stored, total: stored.length }
}

export async function mockGetDocument(id: string): Promise<IngestResponse> {
  await new Promise((r) => setTimeout(r, 120))
  const doc = loadMockDocs().find((d) => d.document_id === id)
  if (!doc) throw new Error(`Document ${id} not found`)
  return {
    document_id: doc.document_id,
    status: doc.status,
    metadata: doc.metadata,
    chunks: doc.chunks,
    message: "ok",
    ingested_at: doc.ingested_at,
  }
}

export async function mockDeleteDocument(
  id: string,
): Promise<{ status: string; document_id: string }> {
  await new Promise((r) => setTimeout(r, 150))
  const docs = loadMockDocs().filter((d) => d.document_id !== id)
  saveMockDocs(docs)
  return { status: "deleted", document_id: id }
}

// ---------- drafts ----------
export async function mockGenerateDraft(opts: {
  document_ids: string[]
  draft_type: string
  instructions?: string
}): Promise<DraftResponse> {
  await new Promise((r) => setTimeout(r, 1400))
  const chunkId = uid()
  const draft_id = uid()
  const now = new Date().toISOString()
  const draft_content = `**LEGAL MEMORANDUM**

**TO:** Senior Partners
**FROM:** Senior Counsel, Legal Intelligence
**DATE:** ${new Date().toLocaleDateString()}
**RE:** ${opts.instructions?.slice(0, 120) || "Notice to Vacate and Rent Arrears"}

**1. Parties and Subject Property**
The Landlord, Md Jahir, is seeking the eviction of the tenant, Md Karim, from the residential premises located at Flat 4B, Bluebell Apartments, Sector 12, Uttara, Dhaka [${chunkId}].

**2. Breach of Tenancy and Arrears**
The tenant is in material breach of the lease agreement dated January 1, 2024. The defaults span six months from November 2025 through April 2026. The total outstanding debt is 282,400 BDT.

**3. Final Demands and Deadlines**
*   **Payment:** Full sum of 282,400 BDT within 7 days of the May 1, 2026 notice.
*   **Vacation of Property:** Tenant must hand over vacant possession no later than **May 15, 2026**.`

  const source_chunks = {
    [chunkId]:
      "Pursuant to Clause 14 (Termination for Default) of the Lease Agreement, the Landlord hereby exercises the right to terminate your tenancy effective immediately.",
  }

  const drafts = loadMockDrafts()
  drafts.unshift({
    draft_id,
    draft_type: opts.draft_type,
    status: "generated",
    draft_content,
    edited_content: null,
    source_chunks,
    grounding_score: 0.94,
    document_ids: opts.document_ids,
    instructions: opts.instructions,
    created_at: now,
    updated_at: now,
  })
  saveMockDrafts(drafts)

  return {
    draft_id,
    status: "success",
    draft_content,
    source_chunks,
    grounding_score: 0.94,
    draft_type: opts.draft_type,
    document_ids: opts.document_ids,
    instructions: opts.instructions,
    edited_content: null,
    created_at: now,
    updated_at: now,
  }
}

export async function mockListDrafts(): Promise<DraftListResponse> {
  await new Promise((r) => setTimeout(r, 150))
  const drafts = loadMockDrafts()
  const stored: StoredDraft[] = drafts.map((d) => ({
    draft_id: d.draft_id,
    draft_type: d.draft_type,
    status: d.status,
    grounding_score: d.grounding_score,
    document_ids: d.document_ids,
    instructions: d.instructions,
    created_at: d.created_at,
    updated_at: d.updated_at,
    preview: d.draft_content.replace(/[*#]/g, "").slice(0, 240),
  }))
  return { drafts: stored, total: stored.length }
}

export async function mockGetDraft(id: string): Promise<DraftResponse> {
  await new Promise((r) => setTimeout(r, 120))
  const d = loadMockDrafts().find((x) => x.draft_id === id)
  if (!d) throw new Error(`Draft ${id} not found`)
  return {
    draft_id: d.draft_id,
    status: d.status,
    draft_content: d.draft_content,
    source_chunks: d.source_chunks,
    grounding_score: d.grounding_score,
    draft_type: d.draft_type,
    document_ids: d.document_ids,
    instructions: d.instructions,
    edited_content: d.edited_content ?? null,
    created_at: d.created_at,
    updated_at: d.updated_at,
  }
}

export async function mockUpdateDraft(
  id: string,
  patch: { edited_content?: string | null },
): Promise<DraftResponse> {
  await new Promise((r) => setTimeout(r, 200))
  const drafts = loadMockDrafts()
  const d = drafts.find((x) => x.draft_id === id)
  if (!d) throw new Error(`Draft ${id} not found`)
  if (patch.edited_content !== undefined) d.edited_content = patch.edited_content
  d.updated_at = new Date().toISOString()
  saveMockDrafts(drafts)
  return mockGetDraft(id)
}

export async function mockDeleteDraft(
  id: string,
): Promise<{ status: string; draft_id: string }> {
  await new Promise((r) => setTimeout(r, 150))
  const drafts = loadMockDrafts().filter((d) => d.draft_id !== id)
  saveMockDrafts(drafts)
  return { status: "deleted", draft_id: id }
}

// ---------- feedback ----------
export async function mockFeedback(opts: {
  draft_type: string
  original_content: string
  edited_content: string
}): Promise<FeedbackResponse> {
  await new Promise((r) => setTimeout(r, 800))
  const skills = loadMockSkills()
  const existing = skills.find((s) => s.draft_type === opts.draft_type)
  const updated_skill = `# Skill: ${opts.draft_type}\n## Metadata\n- Pattern Type: Direct_Override\n- Description: Updated from operator edits.\n\n## Instructions\n- Match the operator's edited tone and structure for ${opts.draft_type}.`
  if (existing) {
    existing.content = updated_skill
  } else {
    skills.unshift({ draft_type: opts.draft_type, content: updated_skill, metadata: null })
  }
  saveMockSkills(skills)
  return {
    status: "success",
    updated_skill,
    message: `Feedback for ${opts.draft_type} processed and skill updated (mock)`,
  }
}

// ---------- skills ----------
export async function mockListSkills(): Promise<SkillsListResponse> {
  await new Promise((r) => setTimeout(r, 250))
  return { skills: loadMockSkills() }
}

export async function mockGetSkill(draft_type: string): Promise<Skill> {
  await new Promise((r) => setTimeout(r, 200))
  const s = loadMockSkills().find((x) => x.draft_type === draft_type)
  if (!s) throw new Error(`Skill ${draft_type} not found`)
  return s
}

export async function mockUpdateSkill(
  draft_type: string,
  content: string,
): Promise<Skill> {
  await new Promise((r) => setTimeout(r, 350))
  const skills = loadMockSkills()
  const existing = skills.find((s) => s.draft_type === draft_type)
  const merged = existing ? `${existing.content}\n\n${content}` : content
  if (existing) existing.content = merged
  else skills.unshift({ draft_type, content: merged, metadata: null })
  saveMockSkills(skills)
  return { draft_type, content: merged, metadata: null }
}

export async function mockDeleteSkill(
  draft_type: string,
): Promise<{ status: string; message: string }> {
  await new Promise((r) => setTimeout(r, 250))
  const skills = loadMockSkills().filter((s) => s.draft_type !== draft_type)
  saveMockSkills(skills)
  return {
    status: "success",
    message: `Skill ${draft_type} and its directory deleted`,
  }
}

// ---------- stats ----------
export async function mockGetStats(): Promise<StatsResponse> {
  await new Promise((r) => setTimeout(r, 80))
  const docs = loadMockDocs()
  const drafts = loadMockDrafts()
  const skills = loadMockSkills()
  const avg =
    drafts.length === 0
      ? 0
      : drafts.reduce((a, d) => a + d.grounding_score, 0) / drafts.length
  return {
    documents: docs.length,
    drafts: drafts.length,
    skills: skills.length,
    avg_grounding_score: Number(avg.toFixed(2)),
  }
}
