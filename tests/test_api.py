import pytest
from httpx import AsyncClient, ASGITransport
import io
from unittest.mock import MagicMock, patch, AsyncMock

@pytest.fixture
def mock_app():
    # We patch the instances that were already created in legal_draft_generator.main
    with patch("legal_draft_generator.main.processor") as mock_proc, \
         patch("legal_draft_generator.main.vector_store") as mock_vs, \
         patch("legal_draft_generator.main.learner") as mock_learner, \
         patch("legal_draft_generator.main.get_embeddings") as mock_emb:
        
        from legal_draft_generator.main import app
        yield app

@pytest.mark.asyncio
@pytest.mark.unit
async def test_document_ingestion_endpoint(mock_app):
    """
    Test POST /api/v1/documents with mocks
    """
    from legal_draft_generator.main import processor, vector_store, get_embeddings
    
    processor.process_file = AsyncMock(return_value={
        "text": "test text",
        "metadata": {"filename": "test.pdf"},
        "entities": {}
    })
    
    mock_emb_inst = AsyncMock()
    mock_emb_inst.aembed_documents.return_value = [[0.1] * 1536]
    get_embeddings.return_value = mock_emb_inst
    
    vector_store.add_documents = AsyncMock(return_value=["chunk-1"])
    vector_store.add_file = AsyncMock(return_value="2026-05-16T10:00:00Z")
    
    transport = ASGITransport(app=mock_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("test.pdf", io.BytesIO(b"dummy pdf content"), "application/pdf")}
        response = await ac.post("/api/v1/documents", files=files)
    
    if response.status_code != 201:
        print(response.json())
        
    assert response.status_code == 201
    json_data = response.json()
    assert "document_id" in json_data
    assert json_data["status"] == "success"
    assert "metadata" in json_data
    assert "chunks" in json_data
    assert isinstance(json_data["chunks"], dict)
    assert len(json_data["chunks"]) > 0
    # Check if content is present since mock text is short
    assert "chunk-1" in json_data["chunks"]
    assert json_data["chunks"]["chunk-1"] == "test text"

@pytest.mark.asyncio
@pytest.mark.unit
async def test_draft_generation_endpoint(mock_app):
    """
    Test POST /api/v1/drafts/generate with mocks
    """
    from legal_draft_generator.main import vector_store, get_embeddings
    
    mock_emb_inst = AsyncMock()
    mock_emb_inst.aembed_query.return_value = [0.1] * 1536
    get_embeddings.return_value = mock_emb_inst
    
    vector_store.search = AsyncMock(return_value=[{"id": "chunk-1", "text": "context text", "document_id": "doc-1", "filename": "test.pdf"}])
    vector_store.save_draft = AsyncMock(return_value="2026-05-16T10:00:00Z")
    
    with patch("legal_draft_generator.main.Drafter") as MockDrafter:
        instance = MockDrafter.return_value
        instance.generate_draft = AsyncMock(return_value={
            "draft_id": "draft-123",
            "content": "Generated draft",
            "citations": [],
            "grounding_confidence": 0.9
        })
        
        transport = ASGITransport(app=mock_app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "document_ids": ["doc-1"],
                "draft_type": "case_fact_summary"
            }
            response = await ac.post("/api/v1/drafts/generate", json=payload)
    
    if response.status_code != 200:
        print(response.json())
        
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["draft_id"] == "draft-123"
    assert "source_chunks" in json_data
    assert isinstance(json_data["source_chunks"], dict)
    assert len(json_data["source_chunks"]) > 0
    # Check if a known key from mock is present
    assert "chunk-1" in json_data["source_chunks"]
    assert json_data["source_chunks"]["chunk-1"] == "context text"

@pytest.mark.asyncio
@pytest.mark.unit
async def test_feedback_loop_endpoint(mock_app):
    """
    Test POST /api/v1/drafts/feedback with mocks
    """
    from legal_draft_generator.main import learner
    learner.learn_from_edit = AsyncMock(return_value="# Updated Skill Content")
    
    transport = ASGITransport(app=mock_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "draft_type": "case_fact_summary",
            "original_content": "orig",
            "edited_content": "edit"
        }
        response = await ac.post("/api/v1/drafts/feedback", json=payload)
    
    if response.status_code != 200:
        print(response.json())
        
    assert response.status_code == 200
    assert response.json()["status"] == "success"

@pytest.mark.asyncio
@pytest.mark.unit
async def test_system_eval_metrics_endpoint(mock_app):
    """
    Test GET /api/v1/system/eval-metrics
    """
    transport = ASGITransport(app=mock_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/system/eval-metrics")
    
    assert response.status_code == 200
    assert "overall_system_health" in response.json()
