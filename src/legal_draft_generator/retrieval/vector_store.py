from __future__ import annotations
import sqlite3
import sqlite_vec
import json
from legal_draft_generator.config import get_settings
from typing import List, Dict, Any
import uuid
import struct

class VectorStore:
    def __init__(self):
        settings = get_settings()
        self.db = sqlite3.connect(settings.DB_PATH)
        self.db.enable_load_extension(True)
        sqlite_vec.load(self.db)
        self.db.enable_load_extension(False)
        self._ensure_tables()

    def _ensure_tables(self):
        # Table for text and metadata
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                text TEXT,
                metadata TEXT
            )
        """)
        
        # Virtual table for vector search (sqlite-vec v0.1.x)
        # Using a check to see if it exists because CREATE VIRTUAL TABLE doesn't support IF NOT EXISTS in all versions easily
        try:
            self.db.execute("SELECT * FROM vec_documents LIMIT 0")
        except sqlite3.OperationalError:
            self.db.execute("CREATE VIRTUAL TABLE vec_documents USING vec0(embedding float[1536])")
        
        self.db.commit()

    async def add_documents(self, texts: List[str], metadatas: List[Dict[str, Any]], embeddings: List[List[float]]) -> List[str]:
        point_ids = []
        for text, meta, emb in zip(texts, metadatas, embeddings):
            doc_id = str(uuid.uuid4())
            point_ids.append(doc_id)
            
            # Insert into documents table
            # doc_id is a string, but sqlite-vec rowid must be integer. 
            # We'll use a mapping or just let sqlite assign a rowid and store our UUID in the table.
            cursor = self.db.execute(
                "INSERT INTO documents (id, text, metadata) VALUES (?, ?, ?)",
                (doc_id, text, json.dumps(meta))
            )
            rowid = cursor.lastrowid
            
            # Convert embedding to bytes
            emb_bytes = struct.pack(f"{len(emb)}f", *emb)
            
            # Insert into vector table
            self.db.execute(
                "INSERT INTO vec_documents (rowid, embedding) VALUES (?, ?)",
                (rowid, emb_bytes)
            )
        
        self.db.commit()
        return point_ids

    async def search(self, query_vector: List[float], limit: int = 5, filter_dict: Dict | None = None) -> List[Dict[str, Any]]:
        # Convert query vector to bytes
        query_bytes = struct.pack(f"{len(query_vector)}f", *query_vector)
        
        # We use a nested subquery for the KNN search to ensure sqlite-vec optimizer sees the LIMIT
        # and to handle filtering correctly.
        
        inner_sql = "SELECT rowid, distance FROM vec_documents WHERE embedding MATCH ? "
        inner_params = [query_bytes]
        
        if filter_dict:
            for k, v in filter_dict.items():
                if k == "document_id":
                    # document_id is stored inside the metadata JSON for each chunk
                    if isinstance(v, list):
                        placeholders = ",".join(["?"] * len(v))
                        inner_sql += f" AND rowid IN (SELECT rowid FROM documents WHERE json_extract(metadata, '$.document_id') IN ({placeholders}))"
                        inner_params.extend(v)
                    else:
                        inner_sql += " AND rowid IN (SELECT rowid FROM documents WHERE json_extract(metadata, '$.document_id') = ?)"
                        inner_params.append(v)
                else:
                    # Generic JSON filter
                    inner_sql += f" AND rowid IN (SELECT rowid FROM documents WHERE json_extract(metadata, '$.{k}') = ?)"
                    inner_params.append(v)
        
        inner_sql += " LIMIT ?"
        inner_params.append(limit)
        
        sql = f"""
            SELECT 
                d.id, d.text, d.metadata, v.distance
            FROM ({inner_sql}) v
            JOIN documents d ON v.rowid = d.rowid
            ORDER BY v.distance
        """
        
        cursor = self.db.execute(sql, inner_params)
        results = []
        for row in cursor:
            doc_id, text, metadata_json, distance = row
            results.append({
                "id": doc_id,
                "text": text,
                **json.loads(metadata_json)
            })
            
        return results
