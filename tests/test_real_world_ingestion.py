import pytest
from httpx import AsyncClient, ASGITransport
import os

@pytest.mark.asyncio
@pytest.mark.integration
async def test_ingest_scanned_contract():
    """
    Integration test for a simulated scanned PNG contract.
    Ensures OCR runs and returns extracted text.
    """
    from legal_draft_skill.main import app
    file_path = "data/raw/scanned_contract.png"
    if not os.path.exists(file_path):
        pytest.skip("scanned_contract.png not found")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        with open(file_path, "rb") as f:
            files = {"file": ("scanned_contract.png", f, "image/png")}
            response = await ac.post("/api/v1/documents", files=files)
    
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["status"] == "success"
    # Verify metadata
    assert json_data["metadata"]["page_count"] >= 1
    assert "chunks" in json_data
    assert len(json_data["chunks"]) > 0

@pytest.mark.asyncio
@pytest.mark.integration
async def test_ingest_messy_pdf():
    """
    Integration test for an inconsistently formatted PDF.
    Ensures PDF parsing extracts the text correctly.
    """
    from legal_draft_skill.main import app
    file_path = "data/raw/messy_record.pdf"
    if not os.path.exists(file_path):
        pytest.skip("messy_record.pdf not found")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        with open(file_path, "rb") as f:
            files = {"file": ("messy_record.pdf", f, "application/pdf")}
            response = await ac.post("/api/v1/documents", files=files)
    
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["status"] == "success"
    assert "document_id" in json_data
    assert json_data["metadata"]["page_count"] > 0
    assert len(json_data["chunks"]) > 0

@pytest.mark.asyncio
@pytest.mark.integration
async def test_ingest_handwritten_note():
    """
    Integration test for a handwritten note image.
    Tests OCR performance on non-standard text.
    """
    from legal_draft_skill.main import app
    file_path = "data/raw/handwritten_note.png"
    if not os.path.exists(file_path):
        pytest.skip("handwritten_note.png not found")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        with open(file_path, "rb") as f:
            files = {"file": ("handwritten_note.png", f, "image/png")}
            response = await ac.post("/api/v1/documents", files=files)
    
    assert response.status_code == 201
    assert response.json()["status"] == "success"
    assert len(response.json()["chunks"]) > 0

@pytest.mark.asyncio
@pytest.mark.integration
async def test_ingest_extra_messy_pdf():
    """
    Integration test for the highly messy PDF with scribbles, typos, and cross-outs.
    """
    from legal_draft_skill.main import app
    file_path = "data/raw/extra_messy_record.pdf"
    if not os.path.exists(file_path):
        pytest.skip("extra_messy_record.pdf not found")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        with open(file_path, "rb") as f:
            files = {"file": ("extra_messy.pdf", f, "application/pdf")}
            response = await ac.post("/api/v1/documents", files=files)
    
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["status"] == "success"
    assert json_data["metadata"]["page_count"] >= 1
    assert len(json_data["chunks"]) > 0
    print(f"Extra Messy PDF Ingested. ID: {json_data['document_id']}")

@pytest.mark.asyncio
@pytest.mark.smoke
async def test_full_workflow_smoke():
    """
    A smoke test that runs through ingestion and then generation.
    """
    from legal_draft_skill.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Ingest
        with open("data/raw/noisy_ocr.txt", "rb") as f:
            files = {"file": ("noisy.txt", f, "text/plain")}
            ingest_resp = await ac.post("/api/v1/documents", files=files)
        
        assert ingest_resp.status_code == 201
        doc_id = ingest_resp.json()["document_id"]
        
        # 2. Generate Draft
        gen_payload = {
            "document_ids": [doc_id],
            "draft_type": "internal_memo",
            "focus_query": "What is the case status?"
        }
        gen_resp = await ac.post("/api/v1/drafts/generate", json=gen_payload)
        
        assert gen_resp.status_code == 200
        assert "draft_content" in gen_resp.json()
        assert "grounding_score" in gen_resp.json()
