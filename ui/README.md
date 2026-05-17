# Legal Intelligence — Legal Document Workflow UI

A professional Next.js (App Router) frontend for the **Legal Intelligence** legal workflow platform. It ingests messy legal documents (scanned PDFs, handwritten notes, images), shows OCR-extracted chunks, generates grounded legal drafts with citations, and captures operator edits as a learning loop.

> Backend contract: any service that implements `POST /api/v1/documents`, `POST /api/v1/drafts/generate`, and `POST /api/v1/drafts/feedback` as defined in [`docs/UI_ARCHITECTURE.md`](./docs/UI_ARCHITECTURE.md).

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Quick Start (Local)](#quick-start-local)
6. [Run with Docker](#run-with-docker)
7. [Run with Docker Compose](#run-with-docker-compose)
8. [Connecting to the Backend](#connecting-to-the-backend)
9. [Mock Mode](#mock-mode)
10. [API Reference](#api-reference)
11. [UI Architecture](#ui-architecture)
12. [Troubleshooting](#troubleshooting)

---

## Features

- **Universal Document Ingestion** — Upload any file type (PDF, PNG, JPG, DOCX, TXT, handwritten scans). The UI streams the file to the backend's OCR + chunking pipeline.
- **Grounded Draft Generation** — Pick a draft type (e.g. `legal-memo`, `case-summary`, `demand-letter`), optionally provide a focus query, and generate a draft anchored to source chunks with inline citations and a confidence score.
- **Citation Inspector** — Click any `[chunk-id]` citation to inspect the exact text segment and source document it came from.
- **Edit & Learn** — Operators edit drafts inline; the diff is sent to `/api/v1/drafts/feedback` so the system extracts a learned pattern per `draft_type`.
- **Mock Mode** — Run the entire UI without a backend using `NEXT_PUBLIC_MOCK=true`, backed by `lib/mockAPI.ts`.

## Tech Stack

| Layer        | Choice                                                       |
| ------------ | ------------------------------------------------------------ |
| Framework    | Next.js 16 (App Router, React 19, TypeScript)                |
| Styling      | Tailwind CSS v4 + shadcn/ui (Radix primitives)               |
| Icons        | lucide-react                                                 |
| Forms        | react-hook-form + zod                                        |
| Data Fetch   | `fetch` + SWR-style client wrappers in `lib/api.ts`          |
| Notifications| sonner                                                       |
| Runtime      | Node.js 20 (Alpine) inside Docker, standalone Next.js output |

## Project Structure

```
.
├── app/                       # Next.js App Router routes
│   ├── layout.tsx
│   ├── page.tsx               # Dashboard
│   ├── documents/             # Ingest + document list
│   ├── drafts/                # Draft generation + review
│   └── globals.css
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   └── ...                    # Feature components (uploader, draft-viewer, citation-popover, ...)
├── lib/
│   ├── api.ts                 # Typed API client (switches on NEXT_PUBLIC_MOCK)
│   ├── mockAPI.ts             # In-memory mock responses
│   └── utils.ts
├── docs/
│   └── UI_ARCHITECTURE.md     # Full UI architecture document
├── public/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
└── next.config.mjs            # output: "standalone" for Docker
```

## Environment Variables

Copy `.env.example` to `.env.local` and adjust:

```bash
cp .env.example .env.local
```

| Variable             | Required | Default                  | Description                                                                                          |
| -------------------- | :------: | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API`    |    ✅    | `http://localhost:8000`  | Base URL of the backend API. Used for all `/api/v1/*` calls.                                         |
| `NEXT_PUBLIC_MOCK`   |    ✅    | `false`                  | When `true`, the UI bypasses the network and reads from `lib/mockAPI.ts`. Useful for demos / offline.|

> Both variables are `NEXT_PUBLIC_*` because they need to be available in the browser bundle.

---

## Quick Start (Local)

**Prerequisites:** Node.js ≥ 20, pnpm ≥ 9.

```bash
# 1. Install dependencies
pnpm install

# 2. Configure env
cp .env.example .env.local
#   Edit .env.local:
#   NEXT_PUBLIC_API=http://localhost:8000
#   NEXT_PUBLIC_MOCK=false

# 3. Start the dev server
pnpm dev
```

Open **http://localhost:3000**.

To run the production build locally:

```bash
pnpm build
pnpm start
```

---

## Run with Docker

The image uses a multi-stage build and Next.js **standalone** output for a small (~180 MB) final image running as a non-root user.

### Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_API=http://host.docker.internal:8000 \
  --build-arg NEXT_PUBLIC_MOCK=false \
  -t psl-legal-ui:latest .
```

> ⚠️ `NEXT_PUBLIC_*` variables are **baked in at build time** because Next.js inlines them into the client bundle. To change them, rebuild the image.

### Run

```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_API=http://host.docker.internal:8000 \
  -e NEXT_PUBLIC_MOCK=false \
  --name psl-legal-ui \
  psl-legal-ui:latest
```

- On **Linux**, replace `host.docker.internal` with your host IP (e.g. `172.17.0.1`) or run with `--network=host`.
- On **macOS / Windows (Docker Desktop)**, `host.docker.internal` resolves automatically.

App is now available at **http://localhost:3000**.

### Stop

```bash
docker stop psl-legal-ui
```

---

## Run with Docker Compose

The repo ships with a `docker-compose.yml` that builds and runs the UI in one command.

```bash
# Optional: export overrides
export NEXT_PUBLIC_API=http://host.docker.internal:8000
export NEXT_PUBLIC_MOCK=false

docker compose up --build
```

To run detached:

```bash
docker compose up -d --build
```

Logs / stop:

```bash
docker compose logs -f web
docker compose down
```

---

## Connecting to the Backend

The UI expects a backend exposing these endpoints (FastAPI by default):

| Method | Path                          | Purpose                          |
| ------ | ----------------------------- | -------------------------------- |
| POST   | `/api/v1/documents`           | Ingest + OCR + chunk + index     |
| POST   | `/api/v1/drafts/generate`     | Generate a grounded legal draft  |
| POST   | `/api/v1/drafts/feedback`     | Submit operator edits, learn pattern |

If the backend runs on a different host/port, update `NEXT_PUBLIC_API` and **rebuild** the Docker image (or restart `pnpm dev`).

### CORS

If you see CORS errors in the browser console, the backend must allow the UI origin:

```python
# FastAPI example
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Mock Mode

Set `NEXT_PUBLIC_MOCK=true` to run the UI without a backend. All three API calls return canned data from `lib/mockAPI.ts`, including:

- A sample ingested document (`messy_legal_notice.pdf`) with three chunks.
- A sample generated `legal-memo` anchored to source chunks with `grounding_score`.
- A sample feedback response with a `learned_pattern`.

This is ideal for design reviews, screenshots, and CI smoke tests.

---

## API Reference

### 1) Ingest Document

```bash
curl -X POST 'http://localhost:8000/api/v1/documents' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@messy_legal_notice.pdf;type=application/pdf'
```

Response:
```json
{
  "document_id": "af8f23dc-...",
  "status": "success",
  "metadata": { "filename": "messy_legal_notice.pdf", "page_count": 4, "document_id": "..." },
  "chunks": { "<chunk_id>": "<text>" },
  "message": "Document ingested, chunked, and indexed successfully"
}
```

### 2) Generate Draft

```bash
curl -X POST 'http://localhost:8000/api/v1/drafts/generate' \
  -H 'Content-Type: application/json' \
  -d '{
    "document_ids": ["0b2105a5-..."],
    "draft_type": "legal-memo",
    "focus_query": "Summarize rent arrears and termination notice"
  }'
```

Response includes `draft_id`, `draft_content` (Markdown), `citations[]`, `source_chunks{}`, and `grounding_score` (0–1).

### 3) Submit Feedback

```bash
curl -X POST 'http://localhost:8000/api/v1/drafts/feedback' \
  -H 'Content-Type: application/json' \
  -d '{
    "draft_type": "legal-memo",
    "original_content": "...",
    "edited_content": "..."
  }'
```

Returns a `learned_pattern` the system will apply to future drafts of that type.

---

## UI Architecture

See **[`docs/UI_ARCHITECTURE.md`](./docs/UI_ARCHITECTURE.md)** for:

- Route map and screen-level breakdown
- Component tree and data flow
- State management strategy
- API client / mock-mode toggle
- Citation grounding model
- Feedback / learning loop UX

---

## Troubleshooting

| Symptom                                          | Fix                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `ECONNREFUSED` to `localhost:8000` in container  | Use `host.docker.internal` (Mac/Win) or `--network=host` (Linux) and rebuild.                    |
| Env var change has no effect                     | `NEXT_PUBLIC_*` are baked at build time — rebuild the image / restart `pnpm dev`.                |
| CORS errors in browser                           | Allow `http://localhost:3000` origin on the backend.                                             |
| Large PDFs time out                              | Increase backend timeout; the UI shows a progress indicator but does not chunk uploads.          |
| Want to demo without backend                     | Set `NEXT_PUBLIC_MOCK=true`.                                                                     |

---

## License
Proprietary — internal use.
