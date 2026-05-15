# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-05-15
### Added
- Initial project structure based on AI Engineer Assessment requirements.
- `GEMINI.md` with project-specific mandates and standards.
- `pyproject.toml` with dependencies.
- `README.md` with setup instructions and architecture overview.
- Basic directory structure (`src/`, `tests/`, `data/`, `memory/`).
- **Production-ready FastAPI application** in `src/documento/main.py`.
- **Document Ingestion** with Docling
- **Grounded Retrieval** using Qdrant vector database.
- **Draft Generation** using OpenRouter (OpenAI models) with citation logic.
- **Learning Loop** to capture operator edits and extract reusable patterns.
- **System Metrics** endpoint for evaluation tracking.
- **Comprehensive Unit Tests** with mocks in `tests/test_api.py`.
