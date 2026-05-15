from __future__ import annotations
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest
from documento.config import get_settings
from typing import List, Dict, Any
import uuid

class VectorStore:
    def __init__(self):
        settings = get_settings()
        if settings.QDRANT_CLUSTER == ":memory:":
            self.client = QdrantClient(":memory:")
        else:
            self.client = QdrantClient(
                url=settings.QDRANT_CLUSTER,
                api_key=settings.QDRANT_API_KEY
            )
        self.collection_name = "documents"
        self._ensure_collection()

    def _ensure_collection(self):
        collections = self.client.get_collections().collections
        exists = any(c.name == self.collection_name for c in collections)
        if not exists:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=rest.VectorParams(
                    size=1536,  # Assuming OpenAI embeddings
                    distance=rest.Distance.COSINE
                )
            )
        
        # Always try to ensure the payload index exists for efficient filtering
        # This handles cases where the collection already exists but lacks the index
        collection_info = self.client.get_collection(self.collection_name)
        if "document_id" not in collection_info.payload_schema:
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="document_id",
                field_schema=rest.PayloadSchemaType.KEYWORD
            )

    async def add_documents(self, texts: List[str], metadatas: List[Dict[str, Any]], embeddings: List[List[float]]) -> List[str]:
        points = []
        point_ids = []
        for text, meta, emb in zip(texts, metadatas, embeddings):
            point_id = str(uuid.uuid4())
            point_ids.append(point_id)
            points.append(rest.PointStruct(
                id=point_id,
                vector=emb,
                payload={**meta, "text": text}
            ))
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        return point_ids

    async def search(self, query_vector: List[float], limit: int = 5, filter_dict: Dict | None = None) -> List[Dict[str, Any]]:
        query_filter = None
        if filter_dict:
            must_filters = []
            for k, v in filter_dict.items():
                if isinstance(v, list):
                    must_filters.append(rest.FieldCondition(key=k, match=rest.MatchAny(any=v)))
                else:
                    must_filters.append(rest.FieldCondition(key=k, match=rest.MatchValue(value=v)))
            query_filter = rest.Filter(must=must_filters)

        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=limit,
            query_filter=query_filter
        )
        
        return [{"id": r.id, **r.payload} for r in results.points]
