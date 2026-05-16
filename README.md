# Legal Draft Generator 

## Introduction
Legal Draft Generator is a production-ready legal document intelligence system built for Pearson Specter Litt. It specializes in processing "messy" legal documents, performing strictly grounded retrieval (RAG), and continuously improving through a type-centric learning loop that captures operator edits.

## Video Presentation
Here is the video part 1: Intro: [Intro Video Link](https://www.loom.com/share/c209704d540942c6b41c46dabe621170)
Here is the video part 2: Architecture: [Architecture Video Link](https://www.loom.com/share/2b612e4c9e574602bd5e867b4a88c362)


## Core Features
- **Docling-Powered Ingestion:** Advanced parsing of multiple formats (PDF, DOCX, Images, etc.) with high-fidelity Markdown export and OCR. [Docling Project](https://github.com/docling-project/docling)
- **Grounded Retrieval:** Integrated with Qdrant vector database for precise evidence retrieval with chunk-level traceability.
- **Dynamic Grounding Score:** Real-time calculation of grounding confidence based on citation coverage and density.
- **Type-Centric Learning Loop:** Extracts reusable patterns from operator edits and injects them into future drafts of the same type.

## Setup Instructions

### Local Development
1.  **Clone the repository.**
2.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install -e ".[test]"
    ```
4.  **Install System Dependencies (Required for OCR):**
    ```bash
    sudo apt-get update && sudo apt-get install -y tesseract-ocr
    ```
5.  **Configure `.env`:**
    ```env
    QDRANT_API_KEY=your_key
    QDRANT_CLUSTER=your_cluster_url_or_:memory:
    OPENROUTER_API_KEY=your_key
    QUICK_THINK_LLM=openai/gpt-4o-mini
    DEEP_THINK_LLM=openai/gpt-4o
    ```
6.  **Run the application:**
    ```bash
    uvicorn legal_draft_generator.main:app --reload
    ```
7.  **Run tests:**
    ```bash
    pytest tests/
    ```

### Running with Docker
The system is containerized for easy deployment and environment consistency.

1.  **Build the Docker image:**
    ```bash
    docker build -t legal_draft_generator-app .
    ```
2.  **Run the container:**
    ```bash
    docker run -p 8000:8000 --env-file .env legal_draft_generator-app
    ```
    *Note: Ensure your `.env` file is present in the root directory before running.*

## API Usage Guide

### 1. Ingest Document
Parses and indexes any file supported by Docling.
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/documents' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@data/raw/messy_legal_notice.pdf;type=application/pdf'
```

**Sample Output:**
```json
{
  "document_id": "af8f23dc-805c-4c9d-9101-4aa8b0ec479a",
  "status": "success",
  "chunks": {
    "280c57a6-ca5e-4215-b081-bbb0dd709932": "## LEGAL NOTICE / URGENT DEMAND FOR POSSESSION...",
    "ba17144c-a79d-46e1-9d55-e197e9fdc90e": "Total Arrears: 270,000 BDT..."
  },
  "message": "Document ingested, chunked, and indexed successfully"
}
```

### 2. Generate Grounded Draft
Retrieves evidence and generates a cited legal draft.
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/drafts/generate' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "document_ids": ["doc-uuid-here"],
  "draft_type": "legal-memo",
  "focus_query": "Summarize the financial arrears"
}'
```

**Sample Output:**
```json
{
  "draft_id": "a8c43f98-fb7d-424f-bc88-80587bdb8603",
  "status": "success",
  "draft_content": "**MEMORANDUM By AI**\n\n concerns regarding the authenticity of a signature on page 4 [7d9ec063...].",
  "citations": [
    {
      "source_document_id": "af8f23dc...",
      "source_file_name": "messy_legal_notice.pdf",
      "text_segment": "The signature on the ledger is smudged..."
    }
  ],
  "source_chunks": {
    "7d9ec063-6dee-4093-bfc4-0393907e0f4f": "Note for Mike: Check the Harvey file ASAP..."
  },
  "grounding_confidence": 0.94
}
```

### 3. Submit Feedback (Learning Loop)
Updates the system's preferences for a specific draft type.
```bash
curl -X 'POST' \
  'http://localhost:8000/api/v1/drafts/feedback' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "draft_type": "legal-memo",
  "original_content": "...",
  "edited_content": "**MEMORANDUM By AI**\n..."
}'
```

**Sample Output:**
```json
{
  "status": "success",
  "learned_pattern": {
    "pattern_type": "AI_Attribution_In_Header",
    "suggested_instruction": "Ensure all legal draft headers include the suffix 'By AI'...",
    "draft_type": "legal-memo"
  }
}
```
*Note: In the next generation for `legal-memo`, this pattern is automatically injected into the LLM context.*

## Architecture Overview
The system is built on a modular, high-performance pipeline designed for legal intelligence:

1.  **Ingestion (Docling):** Uses [Docling](https://github.com/docling-project/docling) for advanced parsing of PDFs, images, and complex office formats. It provides high-fidelity Markdown export and OCR, essential for handling the "messy" documents typical of Pearson Specter Litt's casework.
2.  **Vector Store (Qdrant):** Documents are chunked and indexed in **Qdrant**. We utilize keyword payload indexing for `document_id` to ensure strict, isolated retrieval during the RAG process.
3.  **Grounded Drafting (OpenRouter):** Generation is handled via **OpenRouter**, allowing us to utilize powerful models like GPT-4o or Claude 3. All generated content is strictly cited against specific chunk IDs from the vector store. I am using gemini-3-flash here.
4.  **Learning Loop (Feedback Analysis):** An asynchronous-ready process analyzes operator edits to extract reusable patterns, which are then injected into future generations to improve style and accuracy.

**Extensibility:**
The architecture is intentionally modular. While it currently integrates Docling, Qdrant, and OpenRouter, the system is designed to easily incorporate additional APIs (e.g., custom OCR services, legal database connectors, or alternative LLM providers) as requirements evolve.

## Assumptions & Tradeoffs

**Assumptions:**
- **Local Tesseract Availability:** It is assumed that Tesseract OCR is installed on the host machine or containerized environment to handle raw image text extraction when Docling processes image-based PDFs or raw images.
- **LLM Context Limits:** The system assumes the chosen LLMs (via OpenRouter) have sufficient context windows to process the aggregated chunks of a document. For extremely large documents, more advanced RAG strategies (like re-ranking or map-reduce) might be necessary.
- **Single-Tenant Execution:** The current implementation of the learning loop assumes a generalized set of preferences per draft type. In a multi-tenant environment, patterns would need to be scoped by `operator_id` or `tenant_id`.

**Tradeoffs:**
- **Docling vs. Simple PDF Parsers:** Docling provides superior handling of complex legal layouts, tables, and noisy inputs, but it is computationally heavier and slower than simpler tools like PyPDF. This tradeoff prioritizes extraction quality over sheer ingestion speed, which is crucial for messy legal documents.
- **Local JSON Memory vs. Relational Database:** Learned patterns are currently persisted as local JSON files (`patterns_{draft_type}.json`). This allows for transparency and simplicity in this assessment but would need to be migrated to a structured relational database (e.g., PostgreSQL) for transactional safety and scalability in a full production environment.
- **Chunk-Level vs. Page-Level Grounding:** The system uses 1000-character recursive chunking for grounding. While this improves semantic search precision over page-level retrieval, it can occasionally split related context across multiple chunks.
- **Real-time Scoring vs. LLM-as-a-Judge:** Grounding confidence is calculated using a fast heuristic algorithm (citation density and coverage) rather than an LLM-as-a-Judge approach. This reduces latency and API costs but provides a proxy metric rather than deep semantic verification of grounding accuracy.

## Evaluation Results
The system was validated against the provided "messy" suite:
- **OCR Robustness:** Successfully extracted financial arrears (282,400 BDT) from noisy/handwritten-style PDFs.
- **Grounding Accuracy:** Drafts consistently cited specific CHUNK IDs as instructed.
- **Learning Loop:** Verified that patterns like "By AI" attribution are correctly learned and injected into future drafts.

---
*Developed for the Pearson Specter Litt AI Engineer Assessment.*
