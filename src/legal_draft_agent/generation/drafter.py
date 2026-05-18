from __future__ import annotations
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from legal_draft_agent.config import get_settings
import uuid
import os
import json
import re

class Drafter:
    def __init__(self):
        settings = get_settings()
        
        kwargs = {
            "model": settings.LLM,
            "openai_api_key": settings.API_KEY,
        }
        if settings.PROVIDER == "openrouter":
            kwargs["openai_api_base"] = "https://openrouter.ai/api/v1"

        self.llm = ChatOpenAI(**kwargs)
        self.memory_dir = "memory"

    async def generate_draft(
        self, 
        draft_type: str, 
        retrieved_context: List[Dict[str, Any]], 
        focus_query: str | None = None
    ) -> Dict[str, Any]:
        """
        Generates a grounded draft with numerical citations resolved via a sources block.
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
            ("system", """You are a legal assistant at Legal Intelligence. 
            Generate a {draft_type} based ONLY on the provided context. 
            
            STRICT CITATION RULES:
            1. Cite every claim using bracketed numbers (e.g., [1], [2]).
            2. At the end of the document, provide a 'Sources:' section that maps each number to its exact CHUNK ID UUID.
            
            Format Example:
            ... The tenant occupies Flat 4B [1]. ...
            
            Sources:
            [1] 50d097e9-6943-4f05-9265-6834e6a060f1
            
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
        
        # --- Footnote Resolution & Grounding Analysis ---
        
        # 1. Build Index -> UUID Map from the "Sources:" section
        uuid_map = {}
        sources_match = re.search(r"Sources:?[\s\S]*", content, re.IGNORECASE)
        if sources_match:
            sources_block = sources_match.group(0)
            mappings = re.findall(r"\[(\d+)\]\s*([a-fA-F0-9\-]{36})", sources_block)
            for index, chunk_id in mappings:
                uuid_map[index] = chunk_id.lower()

        # 2. Identify cited chunks for coverage score
        unique_cited_chunks = set()
        
        # Split content into body and sources to identify numerical citations in body only
        body_text = re.split(r"Sources:?", content, flags=re.IGNORECASE)[0]
        numerical_citations = re.findall(r"\[(\d+)\]", body_text)
        
        for index in set(numerical_citations):
            if index in uuid_map:
                unique_cited_chunks.add(uuid_map[index])

        # 3. Calculate Real Grounding Score
        retrieved_ids = {c.get('id').lower() for c in retrieved_context if c.get('id')}
        valid_cited_chunks = unique_cited_chunks.intersection(retrieved_ids)
        
        coverage = len(valid_cited_chunks) / len(retrieved_context) if retrieved_context else 0
        
        # Density based on valid numerical citation occurrences in the body
        valid_citation_count = sum(1 for idx in numerical_citations if idx in uuid_map)
        density = min(1.0, (valid_citation_count * 250) / max(1, len(body_text)))
        
        grounding_score = round((coverage * 0.4) + (density * 0.6), 2)

        return {
            "draft_id": str(uuid.uuid4()),
            "content": content.strip(), # Return full content including Sources section
            "grounding_score": grounding_score
        }
