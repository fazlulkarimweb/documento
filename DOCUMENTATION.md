# Documentation: Legal Draft Agent

This comprehensive guide covers installation, API usage, system architecture, and evaluation metrics for the Legal Draft Agent system.

---

## 1. Installation and Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher (only for UI development)
- Tesseract OCR (required for processing images and scanned PDFs)

### Install System Dependencies (Linux)
```bash
sudo apt-get update && sudo apt-get install -y tesseract-ocr
```

### Local Development Setup
```bash
git clone <repository-url>
cd legal-draft-agent

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install the package in editable mode with test dependencies
pip install -e ".[test]"
```

### Configuration
Create a `.env` file in the root directory:
```env
PROVIDER=openrouter
LLM=google/gemini-2.0-flash-001
API_KEY=your_key_here
DB_PATH=legal_drafts.db
```

### Running the Application
```bash
# Start both Backend and UI using the CLI
legal-draft-agent start
```

---

## 2. Advanced Orchestration

### Running with Makefile
The `Makefile` simplifies common development tasks:
- `make up`: Start all services (Backend + UI) using Docker Compose.
- `make down`: Stop and remove all containers.
- `make logs`: View logs for all running services.
- `make test`: Run the backend test suite.
- `make run`: Run the backend locally using the CLI (requires active venv).

### Running with Docker Compose
Ensure your `.env` file is present in the root directory, then run:
```bash
docker compose up --build
```
The services will be available at:
- **UI:** http://localhost:3000
- **Backend API:** http://localhost:8000

---

## 3. API Usage Guide

The system exposes a RESTful API (default port 8000). Detailed Swagger documentation is available at `http://localhost:8000/docs`.

### Ingest Document
Parses and indexes any file supported by Docling.
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/documents' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@data/raw/messy_legal_notice.pdf;type=application/pdf'
```

### Generate Grounded Draft
Retrieves evidence and generates a cited legal draft.
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/drafts/generate' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "document_ids": ["af8f23dc..."],
  "draft_type": "legal-memo",
  "focus_query": "Summarize the financial arrears"
}'
```

### Submit Feedback (Learning Loop)
Updates the system's preferences based on the diff between original and edited content.
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/drafts/feedback' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "draft_type": "legal-memo",
  "original_content": "**MEMORANDUM**...",
  "edited_content": "**LEGAL MEMORANDUM**..."
}'
```

---

## 4. Manage Agent Skills (CRUD)

Directly manage the agent's persistent behaviors via the API.

- **Get All Skills:** `GET /api/v1/skills`
- **Create Skill:** `POST /api/v1/skills` (Requires `draft_type` and `content`)
- **Get Specific Skill:** `GET /api/v1/skills/{draft_type}`
- **Update Skill:** `PUT /api/v1/skills/{draft_type}` (LLM-driven merge)
- **Delete Skill:** `DELETE /api/v1/skills/{draft_type}`

---

## 5. Architecture Overview

The system is built on a modular, high-performance pipeline:

1.  **Ingestion (Docling):** Uses [Docling](https://github.com/docling-project/docling) for advanced parsing of PDFs, images, and complex office formats. It provides high-fidelity Markdown export and OCR.
2.  **Vector Store (SQLite + sqlite-vec):** Documents are chunked and indexed in a local **SQLite** database using the **sqlite-vec** extension for high-performance vector search.
3.  **Grounded Drafting:** Generation is handled via LLM providers (e.g., OpenRouter). All generated content is strictly cited against specific chunk IDs from the local database.
4.  **Agent Skills (Persistent Learning):** An LLM-driven process analyzes operator edits and direct instructions to maintain structured **Skills** (`skills/<draft_type>/SKILL.md`).

---

## 6. Evaluation Results

The system has been validated against diverse legal-style document suites:
- **OCR Robustness:** Successfully extracted financial data from noisy and handwritten-style PDFs.
- **Grounding Accuracy:** Drafts consistently cite specific source chunks with high precision.
- **Learning Loop:** Verified that stylistic preferences (e.g., standard headers, active voice) are correctly learned from operator edits and applied to future generations.
