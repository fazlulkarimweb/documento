# UI Architecture — Legal Intelligence Document Workflow

This document describes how the Next.js frontend is organized, how data flows between screens, and how it integrates with the backend (or mock layer) to deliver the four core objectives: **Document Processing → Grounded Retrieval → Draft Generation → Learning Loop**.

---

## 1. High-Level Overview

```
                    ┌─────────────────────────────────────────────┐
                    │                  Browser                    │
                    │  Next.js 16 App Router (React 19, TS)       │
                    │                                             │
   Operator ──────▶ │  ┌───────────┐  ┌──────────┐  ┌──────────┐  │
                    │  │ Dashboard │  │Documents │  │ Drafts   │  │
                    │  └─────┬─────┘  └────┬─────┘  └────┬─────┘  │
                    │        └──────┬──────┴────────────┘         │
                    │               ▼                             │
                    │        lib/api.ts  ◀── NEXT_PUBLIC_MOCK ──▶ lib/mockAPI.ts
                    └───────────────┬─────────────────────────────┘
                                    │ HTTPS (JSON / multipart)
                                    ▼
                          NEXT_PUBLIC_API (FastAPI backend)
                          /api/v1/documents
                          /api/v1/drafts/generate
                          /api/v1/drafts/feedback
```

The UI is a **thin, stateless client**. All long-running work (OCR, embedding, retrieval, LLM generation, pattern extraction) lives on the backend. The frontend's job is to:

1. Capture inputs (files, draft type, focus query, edits).
2. Render structured outputs (chunks, drafts, citations, confidence).
3. Surface the **evidence trail** so operators can trust every generated sentence.

---

## 2. Route Map

| Route                     | Purpose                                                       | Primary Components                                               |
| ------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/`                       | Dashboard — overview, recent docs, recent drafts, KPIs.       | `KpiCards`, `RecentDocuments`, `RecentDrafts`                    |
| `/documents`              | Document library + uploader.                                  | `DocumentUploader`, `DocumentTable`                              |
| `/documents/[id]`         | Single document — metadata, page count, chunk inspector.      | `DocumentMeta`, `ChunkList`, `ChunkViewer`                       |
| `/drafts`                 | Draft library.                                                | `DraftTable`, `DraftFilters`                                     |
| `/drafts/new`             | Compose a new draft — pick docs, draft type, focus query.     | `DocumentMultiSelect`, `DraftTypeSelect`, `FocusQueryInput`      |
| `/drafts/[id]`            | Review, edit, and submit feedback on a draft.                 | `DraftEditor`, `CitationPopover`, `ConfidenceBadge`, `FeedbackBar` |
| `/settings`               | Toggle mock mode, view API endpoint, manage draft templates.  | `EnvBanner`, `DraftTypeManager`                                  |

Layout: a persistent left sidebar (`AppSidebar`), top breadcrumb header (`AppHeader`), and a content slot.

---

## 3. Component Tree

```
app/
├── layout.tsx                  ← <html>, fonts, ThemeProvider, Toaster, AppShell
│
├── (shell)/
│   ├── AppShell.tsx            ← sidebar + header layout wrapper
│   ├── AppSidebar.tsx
│   └── AppHeader.tsx           ← breadcrumbs, mock-mode badge, user menu
│
├── page.tsx                    ← Dashboard
│   ├── KpiCards
│   ├── RecentDocuments
│   └── RecentDrafts
│
├── documents/
│   ├── page.tsx                ← list + upload
│   │   ├── DocumentUploader    ← drag/drop, any file type, progress
│   │   └── DocumentTable
│   └── [id]/page.tsx
│       ├── DocumentMeta
│       ├── ChunkList           ← virtualised list of chunks
│       └── ChunkViewer         ← highlight + copy chunk_id
│
└── drafts/
    ├── page.tsx                ← DraftTable + filters
    ├── new/page.tsx
    │   ├── DocumentMultiSelect
    │   ├── DraftTypeSelect     ← legal-memo, case-summary, demand-letter, ...
    │   ├── FocusQueryInput     ← optional free-text guidance
    │   └── GenerateButton
    └── [id]/page.tsx
        ├── DraftEditor         ← Markdown editor (contentEditable)
        ├── CitationPopover     ← click [chunk-id] to inspect source
        ├── SourceChunksPanel   ← side panel listing all source_chunks
        ├── ConfidenceBadge     ← grounding_score 0–1
        └── FeedbackBar         ← "Save & Teach" → /feedback
```

---

## 4. Data Flow

### 4.1 Ingest

```
DocumentUploader
  └─ FormData(file)
       └─ api.ingestDocument(file)
            └─ POST /api/v1/documents  (multipart)
                 └─ { document_id, metadata, chunks } → Zustand/SWR cache
                      └─ redirect to /documents/[document_id]
```

The uploader accepts **any MIME type** and shows the backend status (`success`/`error`) plus the page count returned in `metadata`.

### 4.2 Draft Generation

```
/drafts/new
  ├─ DocumentMultiSelect → document_ids[]
  ├─ DraftTypeSelect     → draft_type ("legal-memo" | "case-summary" | ...)
  └─ FocusQueryInput     → focus_query (optional)
       └─ api.generateDraft({ document_ids, draft_type, focus_query })
            └─ POST /api/v1/drafts/generate
                 └─ { draft_id, draft_content, citations[], source_chunks, grounding_score }
                      └─ navigate to /drafts/[draft_id]
```

### 4.3 Grounded Rendering

The draft viewer parses `draft_content` (Markdown) and detects `[uuid]` tokens. Each token is replaced with an interactive `<CitationPopover chunkId="uuid" />`:

- **Hover** → preview `source_chunks[chunkId]`.
- **Click** → opens `SourceChunksPanel` scrolled to that chunk and shows the originating `source_file_name`.

`grounding_score` is rendered as a colored badge:

| Range        | Color   | Meaning                       |
| ------------ | ------- | ----------------------------- |
| ≥ 0.85       | green   | Strongly grounded             |
| 0.6 – 0.85   | amber   | Review recommended            |
| < 0.6        | red     | Low confidence — manual edit  |

### 4.4 Feedback / Learning Loop

```
DraftEditor (operator edits Markdown)
  └─ on "Save & Teach":
       api.submitFeedback({
         draft_type,
         original_content,   // snapshot from generation response
         edited_content,     // current editor value
       })
       └─ POST /api/v1/drafts/feedback
            └─ { learned_pattern: { pattern_type, description, suggested_instruction, draft_type } }
                 └─ toast.success(learned_pattern.description)
                      └─ pattern appended to /settings → DraftTypeManager
```

The learned pattern is shown to the operator immediately (toast + sidebar entry) so they can see **what** the system learned from their edit. Future generations of the same `draft_type` will follow `suggested_instruction`.

---

## 5. State Management

- **Server state** — SWR (`useSWR`) for `GET`-like calls and revalidation; `mutate()` after mutations to keep lists fresh.
- **Form state** — `react-hook-form` + `zod` schemas (one schema per request body).
- **Cross-component UI state** — React Context (`AppContext`) for: current document selection, mock-mode flag, theme.
- **Persistence** — none on the client. The backend is the source of truth. The only client-side stored item is the theme preference.

---

## 6. API Client (`lib/api.ts`)

A single typed module exposes:

```ts
ingestDocument(file: File): Promise<IngestResponse>
generateDraft(input: GenerateDraftInput): Promise<DraftResponse>
submitFeedback(input: FeedbackInput): Promise<FeedbackResponse>
listDocuments(): Promise<DocumentSummary[]>
listDrafts(): Promise<DraftSummary[]>
```

Internally it branches:

```ts
const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";
const BASE = process.env.NEXT_PUBLIC_API ?? "http://localhost:8000";

export async function generateDraft(input) {
  if (MOCK) return mockAPI.generateDraft(input);
  const res = await fetch(`${BASE}/api/v1/drafts/generate`, { ... });
  if (!res.ok) throw new ApiError(res);
  return res.json();
}
```

All types are colocated in `lib/types.ts` and mirror the backend OpenAPI schema.

---

## 7. Mock Layer (`lib/mockAPI.ts`)

When `NEXT_PUBLIC_MOCK=true`:

- In-memory `Map<documentId, IngestResponse>` seeded with the sample `messy_legal_notice.pdf` payload.
- `generateDraft` returns the sample `legal-memo` (anchored to source chunks + `grounding_score: 0.94`).
- `submitFeedback` echoes back a canned `learned_pattern` and pushes it into a local list visible on `/settings`.
- A persistent **"MOCK MODE"** badge is rendered in `AppHeader` so operators can never confuse mock data with real data.

---

## 8. Styling & Theming

- **Tailwind v4** with a constrained palette of 5 tokens defined in `app/globals.css`:
  - `--background`, `--foreground`, `--primary` (deep navy), `--muted`, `--accent` (warm gold).
- **shadcn/ui** for primitives (Card, Tabs, Dialog, Sheet, Table, Badge, Sonner).
- **Typography** — Geist Sans for UI; Geist Mono for chunk IDs and citation tokens.
- **Density** — comfortable on `/drafts/[id]` (long-form reading), compact on tables.
- **Accessibility** — semantic landmarks (`<main>`, `<nav>`, `<aside>`), focus-visible rings on all interactive elements, `aria-live="polite"` for toast confirmations and confidence badges.

---

## 9. Error & Loading States

| State          | Treatment                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| Loading        | Skeletons (`<Skeleton/>`) for tables; inline spinner for generation.      |
| Network error  | Sonner toast + retry button; preserves form input.                        |
| 4xx from API   | Inline error card with the backend's `message` field.                     |
| Empty          | `<EmptyState>` with an action button (e.g., "Upload your first document"). |

Generation specifically shows a **streamed progress message** ("Retrieving chunks… Drafting… Verifying citations…") with an indeterminate progress bar. If the backend doesn't stream, the progress is time-based but bounded.

---

## 10. Security & Privacy

- No PII is logged in the browser console.
- All API calls go through `lib/api.ts`, which strips request bodies from error reports.
- Files are uploaded directly to the backend — the Next.js app never persists them.
- The Docker image runs as a non-root user (`nextjs:1001`) with `NEXT_TELEMETRY_DISABLED=1`.

---

## 11. Extensibility Checklist

When adding a new **draft type** (e.g., `contract-redline`):

1. Add it to `DRAFT_TYPES` in `lib/types.ts`.
2. Add an icon + label in `DraftTypeSelect`.
3. (Optional) Add a tailored prompt template on the backend.
4. Add a mock response in `lib/mockAPI.ts` so mock mode still works.

When adding a new **screen**:

1. Create a folder under `app/`.
2. Add an entry to `AppSidebar`.
3. Add a breadcrumb mapping in `AppHeader`.
4. Reuse `AppShell` — never hand-roll a layout.
