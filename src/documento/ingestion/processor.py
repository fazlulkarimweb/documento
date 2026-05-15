from __future__ import annotations
import io
import tempfile
import os
from typing import Dict, Any, List
from docling.document_converter import DocumentConverter

class DocumentProcessor:
    def __init__(self):
        self.converter = DocumentConverter()

    async def process_file(
        self, 
        file_content: bytes, 
        filename: str
    ) -> Dict[str, Any]:
        """
        Processes a document using Docling: extracts high-quality text and metadata.
        """
        # Docling often works best with file paths for complex formats
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name

        try:
            result = self.converter.convert(tmp_path)
            
            # Export to markdown for structured text representation
            text = result.document.export_to_markdown()
            
            metadata = {
                "filename": filename,
                "page_count": len(result.pages) if hasattr(result, 'pages') else 1,
            }

            return {
                "text": text,
                "metadata": metadata
            }
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
