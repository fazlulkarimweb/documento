# Legal Draft Skill - AI Engineer Assessment

## Project Overview
You are building an internal workflow for Pearson Specter Litt to process messy legal-style documents. The system must ingest noisy inputs (scanned PDFs, handwritten notes), extract structured information, perform grounded retrieval, generate legal-style drafts, and improve over time by learning from operator edits.

## Core Objectives
1.  **Document Processing:** OCR and text extraction from noisy/messy files into structured data.
2.  **Grounded Retrieval:** A retrieval layer that anchors generation to source evidence with inspectability.
3.  **Draft Generation:** Producing grounded, structured drafts (e.g., case summaries, memos).
4.  **Learning Loop:** Capturing operator edits to improve future draft quality and learn patterns.

## The Mandatory Test-First Loop
Every feature or bug fix must follow this loop:
1.  **RED Phase:** Create/update a test in `/tests` capturing the requirement or bug.
2.  **STUB Phase:** Create minimal signatures for logic to compile.
3.  **VERIFY FAILURE:** Run `pytest`. It MUST fail.
4.  **GREEN Phase:** Implement the feature.
5.  **REFACTOR & PASS:** Run tests and iterate until they pass.

**Test Command:**
```bash
.venv/bin/python -m pytest
```

## Engineering Standards
- **Language:** Python 3.10+ with strict type hinting.
- **Async:** Use `asyncio` for I/O bound tasks (LLM calls, file processing) where beneficial.
- **Testing:** `pytest` with markers (`unit`, `integration`, `smoke`). Mock all external API calls in unit tests.
- **Grounding:** Every claim in a generated draft MUST be backed by a retrieved passage. No hallucinations.
- **Surgical Updates:** Only change the specific prompt or schema requested. Do not refactor LangGraph wiring unless directed.

## Technical Requirements & Rubric
### 1. Document Processing (25 pts)
- Handle messy/noisy inputs.
- Quality OCR and extraction.
- Structured output usable by downstream RAG/Drafting.

### 2. Retrieval & Grounding (25 pts)
- High retrieval relevance.
- Inspectable evidence/citations.
- Controlled generation (staying within the bounds of evidence).

### 3. Draft Quality (10 pts)
- Usefulness, clarity, and consistency with source documents.

### 4. Improvement from Edits (25 pts)
- Capture edits from "operators".
- Extract reusable patterns/rules from those edits.
- Demonstrate meaningful improvement in future outputs.

### 5. System Design (10 pts)
- Modularity, maintainability, and error handling.

### 6. Documentation (5 pts)
- Clear setup, architecture overview, and evaluation results.

## Workspace Structure
- `src/`: Core implementation.
- `tests/`: Test suite.
- `data/`: Sample messy documents and ground truth.
- `memory/`: (Private) State and learned patterns.

## Operational Mandates
- Maintain `CHANGELOG.md`.
- Ensure all logic is traceable and grounded.
- Prioritize engineering quality and grounding over visual polish.
