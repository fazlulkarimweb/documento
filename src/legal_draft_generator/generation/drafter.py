from __future__ import annotations
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from legal_draft_generator.config import get_settings
from legal_draft_generator.models import Citation
import uuid
import os
import json

class Drafter:
    def __init__(self, mode: str = "quick"):
        settings = get_settings()
        model_name = settings.QUICK_THINK_LLM if mode == "quick" else settings.DEEP_THINK_LLM
        
        self.llm = ChatOpenAI(
            model=model_name,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base="https://openrouter.ai/api/v1"
        )
        self.memory_dir = "memory"

    async def generate_draft(
        self, 
        draft_type: str, 
        retrieved_context: List[Dict[str, Any]], 
        focus_query: str | None = None
    ) -> Dict[str, Any]:
        """
        Generates a grounded draft with citations, incorporating learned patterns if available.
        """
        context_text = "\n\n".join([
            f"CHUNK ID: {c.get('id')}\nDocument ID: {c.get('document_id')}\nFile: {c.get('filename')}\nContent: {c.get('text')}"
            for c in retrieved_context
        ])

        # Retrieve learned patterns from Skill architecture
        learned_instructions = ""
        skill_md_path = f"skills/{draft_type}/SKILL.md"
        if os.path.exists(skill_md_path):
            try:
                with open(skill_md_path, "r") as f:
                    skill_content = f.read()
                    if "## Instructions" in skill_content:
                        instructions_section = skill_content.split("## Instructions")[1].strip()
                        if instructions_section:
                            learned_instructions = f"\n\nLEARNED SKILL INSTRUCTIONS FOR {draft_type.upper()}:\n{instructions_section}\n"
            except Exception:
                pass

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a legal assistant at Pearson Specter Litt. 
            Generate a {draft_type} based ONLY on the provided context. 
            If the context is insufficient, state so. 
            IMPORTANT: Every claim must be cited using the exact CHUNK ID in the format [CHUNK ID]. 
            Example: \"The tenant owes 270,000 BDT [abc-123].\"
            {learned_instructions}"""),
            ("human", "Context:\n{context}\n\nQuery: {query}")
        ])

        chain = prompt | self.llm
        response = await chain.ainvoke({
            "draft_type": draft_type,
            "context": context_text,
            "query": focus_query or f"Please provide a {draft_type}.",
            "learned_instructions": learned_instructions
        })

        content = response.content
        
        # Improved citation parsing
        citations = []
        unique_cited_chunks = set()
        for ctx in retrieved_context:
            chunk_id = str(ctx.get('id'))
            if f"[{chunk_id}]" in content:
                unique_cited_chunks.add(chunk_id)
                citations.append(Citation(
                    source_document_id=ctx.get('document_id', 'unknown'),
                    source_file_name=ctx.get('filename', 'unknown'),
                    text_segment=ctx.get('text', '')[:200]
                ))

        # Calculate Real Grounding Confidence
        # Factor 1: Citation Coverage (How many chunks were used vs retrieved)
        coverage = len(unique_cited_chunks) / len(retrieved_context) if retrieved_context else 0
        
        # Factor 2: Citation Density (Presence of citations in the text)
        # We look for [uuid] patterns. For simplicity, we count valid markers.
        import re
        citation_count = len(re.findall(r'\[[a-f0-9\-]{36}\]', content))
        # Arbitrary density goal: 1 citation per 250 chars
        density = min(1.0, (citation_count * 250) / max(1, len(content)))
        
        # Combined score (weighted average)
        grounding_score = round((coverage * 0.4) + (density * 0.6), 2)

        return {
            "draft_id": str(uuid.uuid4()),
            "content": content,
            "citations": citations,
            "grounding_confidence": grounding_score
        }
