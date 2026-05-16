from __future__ import annotations
from typing import Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from legal_draft_generator.config import get_settings
import json
import os

class Learner:
    def __init__(self):
        settings = get_settings()
        self.llm = ChatOpenAI(
            model=settings.QUICK_THINK_LLM,
            openai_api_key=settings.OPENROUTER_API_KEY,
            openai_api_base="https://openrouter.ai/api/v1"
        )
        self.memory_dir = "memory"
        os.makedirs(self.memory_dir, exist_ok=True)

    async def learn_from_edit(
        self, 
        original_content: str, 
        edited_content: str, 
        draft_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        Analyzes the difference between original and edited content to extract a pattern for a specific draft type.
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI research engineer at Pearson Specter Litt. 
            Analyze the following edit made by a legal operator for a '{draft_type}' draft. 
            Identify the underlying preference or correction pattern. 
            Output a JSON object with 'pattern_type', 'description', and 'suggested_instruction'."""),
            ("human", "Original:\n{original}\n\nEdited:\n{edited}")
        ])

        chain = prompt | self.llm
        response = await chain.ainvoke({
            "draft_type": draft_type,
            "original": original_content,
            "edited": edited_content
        })

        try:
            # Basic JSON extraction from LLM response
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            pattern = json.loads(content)
            pattern["draft_type"] = draft_type
            
            # Save the pattern by draft type to allow multiple patterns or a consolidated one
            # For simplicity, we'll append to a list or overwrite the latest for that type
            pattern_file = os.path.join(self.memory_dir, f"patterns_{draft_type}.json")
            
            patterns = []
            if os.path.exists(pattern_file):
                with open(pattern_file, "r") as f:
                    patterns = json.load(f)
            
            patterns.append(pattern)
            
            with open(pattern_file, "w") as f:
                json.dump(patterns, f)
            
            return pattern
        except Exception:
            return None
