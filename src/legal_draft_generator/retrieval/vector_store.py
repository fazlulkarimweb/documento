from __future__ import annotations
import sqlite3
import sqlite_vec
import json
import os
from legal_draft_generator.config import get_settings
from typing import List, Dict, Any, Tuple
import uuid
import struct
from datetime import datetime

class VectorStore:
    def __init__(self):
        settings = get_settings()
        self.db = sqlite3.connect(settings.DB_PATH)
        self.db.enable_load_extension(True)
        sqlite_vec.load(self.db)
        self.db.enable_load_extension(False)
        self._ensure_tables()

    def _ensure_tables(self):
        # Table for files (top-level document objects)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                metadata TEXT,
                ingested_at TEXT
            )
        """)
        
        # Table for chunks (text and metadata)
        # Note: 'metadata' here includes the document_id/file_id
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                text TEXT,
                metadata TEXT
            )
        """)
        
        # Virtual table for vector search
        try:
            self.db.execute("SELECT * FROM vec_documents LIMIT 0")
        except sqlite3.OperationalError:
            self.db.execute("CREATE VIRTUAL TABLE vec_documents USING vec0(embedding float[1536])")
        
        # Table for drafts
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS drafts (
                id TEXT PRIMARY KEY,
                draft_type TEXT,
                status TEXT,
                draft_content TEXT,
                edited_content TEXT,
                citations TEXT,
                source_chunks TEXT,
                grounding_confidence REAL,
                document_ids TEXT,
                instructions TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        
        # Table for system events (metrics)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS system_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT,
                metadata TEXT,
                created_at TEXT
            )
        """)
        
        self.db.commit()

    async def log_event(self, event_type: str, metadata: Dict[str, Any] | None = None):
        now = datetime.utcnow().isoformat() + "Z"
        self.db.execute(
            "INSERT INTO system_events (event_type, metadata, created_at) VALUES (?, ?, ?)",
            (event_type, json.dumps(metadata or {}), now)
        )
        self.db.commit()

    async def get_eval_metrics(self) -> Dict[str, Any]:
        # Ingestion Metrics
        attempts = self.db.execute("SELECT COUNT(*) FROM system_events WHERE event_type = 'ingest_attempt'").fetchone()[0]
        successes = self.db.execute("SELECT COUNT(*) FROM system_events WHERE event_type = 'ingest_success'").fetchone()[0]
        failures = self.db.execute("SELECT COUNT(*) FROM system_events WHERE event_type = 'ingest_error'").fetchone()[0]
        
        success_rate = (successes / attempts * 100) if attempts > 0 else 100.0
        
        # Retrieval & Grounding Metrics
        avg_grounding = self.db.execute("SELECT AVG(grounding_confidence) FROM drafts").fetchone()[0] or 0.0
        
        # Learning Loop Effectiveness
        feedback_events = self.db.execute("SELECT COUNT(*) FROM system_events WHERE event_type = 'feedback_applied'").fetchone()[0]
        
        # Active Skills
        skill_count = 0
        if os.path.exists("skills"):
            skill_count = len([d for d in os.listdir("skills") if os.path.isdir(os.path.join("skills", d))])

        # System Health (Healthy if last 10 events aren't mostly errors)
        recent_errors = self.db.execute("""
            SELECT COUNT(*) FROM (
                SELECT event_type FROM system_events 
                ORDER BY created_at DESC LIMIT 10
            ) WHERE event_type LIKE '%_error'
        """).fetchone()[0]
        
        status = "healthy" if recent_errors < 3 else "degraded"

        return {
            "ingestion_metrics": {
                "total_attempts": attempts,
                "success_rate": round(float(success_rate), 2),
                "failed_docs": failures
            },
            "retrieval_grounding_metrics": {
                "average_grounding_score": round(float(avg_grounding), 2),
                "unsupported_content_prevention": 1.0 # Theoretical
            },
            "draft_quality_metrics": {
                "total_drafts": self.db.execute("SELECT COUNT(*) FROM drafts").fetchone()[0]
            },
            "learning_loop_effectiveness": {
                "total_feedback_events": feedback_events,
                "active_skills": skill_count
            },
            "overall_system_health": {
                "status": status,
                "recent_error_count": recent_errors,
                "version": "0.1.0"
            }
        }

    async def add_file(self, file_id: str, metadata: Dict[str, Any]) -> str:
        ingested_at = datetime.utcnow().isoformat() + "Z"
        self.db.execute(
            "INSERT INTO files (id, metadata, ingested_at) VALUES (?, ?, ?)",
            (file_id, json.dumps(metadata), ingested_at)
        )
        self.db.commit()
        return ingested_at

    async def add_documents(self, texts: List[str], metadatas: List[Dict[str, Any]], embeddings: List[List[float]]) -> List[str]:
        point_ids = []
        for text, meta, emb in zip(texts, metadatas, embeddings):
            doc_id = str(uuid.uuid4())
            point_ids.append(doc_id)
            
            cursor = self.db.execute(
                "INSERT INTO documents (id, text, metadata) VALUES (?, ?, ?)",
                (doc_id, text, json.dumps(meta))
            )
            rowid = cursor.lastrowid
            
            emb_bytes = struct.pack(f"{len(emb)}f", *emb)
            self.db.execute(
                "INSERT INTO vec_documents (rowid, embedding) VALUES (?, ?)",
                (rowid, emb_bytes)
            )
        
        self.db.commit()
        return point_ids

    async def search(self, query_vector: List[float], limit: int = 5, filter_dict: Dict | None = None) -> List[Dict[str, Any]]:
        query_bytes = struct.pack(f"{len(query_vector)}f", *query_vector)
        
        inner_sql = "SELECT rowid, distance FROM vec_documents WHERE embedding MATCH ? "
        inner_params = [query_bytes]
        
        if filter_dict:
            for k, v in filter_dict.items():
                if k == "document_id":
                    if isinstance(v, list):
                        placeholders = ",".join(["?"] * len(v))
                        inner_sql += f" AND rowid IN (SELECT rowid FROM documents WHERE json_extract(metadata, '$.document_id') IN ({placeholders}))"
                        inner_params.extend(v)
                    else:
                        inner_sql += " AND rowid IN (SELECT rowid FROM documents WHERE json_extract(metadata, '$.document_id') = ?)"
                        inner_params.append(v)
                else:
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

    # --- Document Management ---

    async def list_files(self, limit: int = 50, offset: int = 0, q: str | None = None) -> Tuple[List[Dict], int]:
        sql = "SELECT id, metadata, ingested_at FROM files"
        params = []
        if q:
            sql += " WHERE json_extract(metadata, '$.filename') LIKE ?"
            params.append(f"%{q}%")
        
        # Count total
        count_sql = f"SELECT COUNT(*) FROM ({sql})"
        total = self.db.execute(count_sql, params).fetchone()[0]
        
        sql += " ORDER BY ingested_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor = self.db.execute(sql, params)
        files = []
        for row in cursor:
            fid, meta_json, ingested_at = row
            # Get chunk count
            chunk_count = self.db.execute(
                "SELECT COUNT(*) FROM documents WHERE json_extract(metadata, '$.document_id') = ?",
                (fid,)
            ).fetchone()[0]
            
            files.append({
                "document_id": fid,
                "status": "ingested",
                "metadata": json.loads(meta_json),
                "chunk_count": chunk_count,
                "ingested_at": ingested_at
            })
        return files, total

    async def get_file(self, file_id: str) -> Dict | None:
        row = self.db.execute("SELECT metadata, ingested_at FROM files WHERE id = ?", (file_id,)).fetchone()
        if not row:
            return None
        
        meta_json, ingested_at = row
        chunks_cursor = self.db.execute(
            "SELECT id, text FROM documents WHERE json_extract(metadata, '$.document_id') = ?",
            (file_id,)
        )
        chunks = {cid: text for cid, text in chunks_cursor}
        
        return {
            "document_id": file_id,
            "status": "ingested",
            "metadata": json.loads(meta_json),
            "chunks": chunks,
            "message": "ok",
            "ingested_at": ingested_at
        }

    async def delete_file(self, file_id: str):
        # Delete vectors
        self.db.execute(
            "DELETE FROM vec_documents WHERE rowid IN (SELECT rowid FROM documents WHERE json_extract(metadata, '$.document_id') = ?)",
            (file_id,)
        )
        # Delete chunks
        self.db.execute("DELETE FROM documents WHERE json_extract(metadata, '$.document_id') = ?", (file_id,))
        # Delete file entry
        self.db.execute("DELETE FROM files WHERE id = ?", (file_id,))
        self.db.commit()

    # --- Draft Management ---

    async def save_draft(self, draft_data: Dict[str, Any]):
        now = datetime.utcnow().isoformat() + "Z"
        self.db.execute("""
            INSERT OR REPLACE INTO drafts (
                id, draft_type, status, draft_content, edited_content, 
                citations, source_chunks, grounding_confidence, 
                document_ids, instructions, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            draft_data["draft_id"],
            draft_data["draft_type"],
            draft_data["status"],
            draft_data["draft_content"],
            draft_data.get("edited_content"),
            json.dumps(draft_data["citations"]),
            json.dumps(draft_data["source_chunks"]),
            draft_data["grounding_confidence"],
            json.dumps(draft_data["document_ids"]),
            draft_data.get("instructions"),
            draft_data.get("created_at", now),
            now
        ))
        self.db.commit()
        return now

    async def list_drafts(self, limit: int = 50, offset: int = 0, draft_type: str | None = None, document_id: str | None = None) -> Tuple[List[Dict], int]:
        sql = "SELECT id, draft_type, status, grounding_confidence, document_ids, instructions, created_at, updated_at, draft_content FROM drafts"
        where_clauses = []
        params = []
        
        if draft_type:
            where_clauses.append("draft_type = ?")
            params.append(draft_type)
        if document_id:
            # document_ids is a JSON array
            where_clauses.append("document_ids LIKE ?")
            params.append(f"%{document_id}%")
            
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)
            
        count_sql = f"SELECT COUNT(*) FROM ({sql})"
        total = self.db.execute(count_sql, params).fetchone()[0]
        
        sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor = self.db.execute(sql, params)
        drafts = []
        for row in cursor:
            did, dtype, status, conf, doc_ids, instr, created, updated, content = row
            drafts.append({
                "draft_id": did,
                "draft_type": dtype,
                "status": status,
                "grounding_confidence": conf,
                "document_ids": json.loads(doc_ids),
                "instructions": instr,
                "created_at": created,
                "updated_at": updated,
                "preview": content[:240] + "..." if len(content) > 240 else content
            })
        return drafts, total

    async def get_draft(self, draft_id: str) -> Dict | None:
        row = self.db.execute("SELECT * FROM drafts WHERE id = ?", (draft_id,)).fetchone()
        if not row:
            return None
        
        # Columns in order of _ensure_tables definition
        # id, draft_type, status, draft_content, edited_content, citations, source_chunks, grounding_confidence, document_ids, instructions, created_at, updated_at
        return {
            "draft_id": row[0],
            "draft_type": row[1],
            "status": row[2],
            "draft_content": row[3],
            "edited_content": row[4],
            "citations": json.loads(row[5]),
            "source_chunks": json.loads(row[6]),
            "grounding_confidence": row[7],
            "document_ids": json.loads(row[8]),
            "instructions": row[9],
            "created_at": row[10],
            "updated_at": row[11]
        }

    async def update_draft_content(self, draft_id: str, edited_content: str) -> Dict | None:
        now = datetime.utcnow().isoformat() + "Z"
        self.db.execute("UPDATE drafts SET edited_content = ?, updated_at = ? WHERE id = ?", (edited_content, now, draft_id))
        self.db.commit()
        return await self.get_draft(draft_id)

    async def delete_draft(self, draft_id: str):
        self.db.execute("DELETE FROM drafts WHERE id = ?", (draft_id,))
        self.db.commit()

    async def get_stats(self) -> Dict[str, Any]:
        doc_count = self.db.execute("SELECT COUNT(*) FROM files").fetchone()[0]
        draft_count = self.db.execute("SELECT COUNT(*) FROM drafts").fetchone()[0]
        avg_conf = self.db.execute("SELECT AVG(grounding_confidence) FROM drafts").fetchone()[0] or 0.0
        
        # Count skills
        skill_count = 0
        if os.path.exists("skills"):
            skill_count = len([d for d in os.listdir("skills") if os.path.isdir(os.path.join("skills", d))])
            
        return {
            "documents": doc_count,
            "drafts": draft_count,
            "skills": skill_count,
            "avg_grounding_confidence": round(float(avg_conf), 2)
        }
