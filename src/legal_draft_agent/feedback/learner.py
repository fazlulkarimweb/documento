from __future__ import annotations
from typing import Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from legal_draft_agent.config import get_settings
import json
import os
import difflib

class Learner:
    def __init__(self):
        settings = get_settings()
        kwargs = {
            "model": settings.LLM,
            "openai_api_key": settings.API_KEY,
        }
        if settings.PROVIDER == "openrouter":
            kwargs["openai_api_base"] = "https://openrouter.ai/api/v1"

        self.llm = ChatOpenAI(**kwargs)

    async def learn_from_edit(
        self, 
        original_content: str, 
        edited_content: str, 
        draft_type: str
    ) -> str:
        """
        Learns from an operator edit by identifying the diff and letting the LLM merge it.
        """
        # Calculate a unified diff to focus the LLM on changes
        diff = difflib.unified_diff(
            original_content.splitlines(),
            edited_content.splitlines(),
            fromfile='original',
            tofile='edited',
            lineterm=''
        )
        diff_text = "\n".join(list(diff))
        
        update_context = f"""The operator edited a {draft_type} draft. 
        
        DIFF OF CHANGES:
        {diff_text if diff_text else "No visible text changes detected in diff."}
        
        FULL EDITED CONTENT (for context):
        {edited_content}"""
        
        return await self._orchestrate_skill_update(draft_type, update_context)

    async def learn_from_instruction(
        self, 
        new_instruction: str, 
        draft_type: str
    ) -> str:
        """
        Integrates a direct instruction by letting the LLM merge it into the existing skill.
        """
        update_context = f"The operator provided a new direct instruction for {draft_type} drafts:\n{new_instruction}"
        return await self._orchestrate_skill_update(draft_type, update_context)

    async def create_new_skill(
        self, 
        instructions: str, 
        draft_type: str
    ) -> str:
        """
        Generates a brand new, detailed SKILL.md definition based on initial instructions.
        """
        skill_dir = f"skills/{draft_type}"
        skill_md_path = os.path.join(skill_dir, "SKILL.md")

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are the Lead Legal Knowledge Engineer at Legal Intelligence.
            Your task is to create a new, high-fidelity 'Agent Skill' for our legal AI.
            
            DRAFT TYPE: {draft_type}
            USER INSTRUCTIONS: {instructions}

            TASK:
            1. Create a detailed SKILL.md file that encapsulates these instructions.
            2. Include a YAML frontmatter block with metadata (name, description, context: fork, allowed-tools: [read_file], effort: high/medium).
            3. Structure the Markdown into sections: # Drafting Skill, ## 1. Trigger Context, ## 2. Formatting & Structure, ## 3. Operational Rules.
            4. Be specific, actionable, and use professional legal terminology.
            
            OUTPUT FORMAT (MUST START WITH YAML):
            ```yaml
            name: {draft_type}
            description: [Brief summary]
            context: fork
            allowed-tools:
              - read_file
            effort: high
            ```
            # [Title]
            ...
            
            Output ONLY the raw content for the SKILL.md file. No conversational filler or surrounding markdown code blocks - just the raw file content starting with the YAML block."""),
        ])

        chain = prompt | self.llm
        response = await chain.ainvoke({
            "draft_type": draft_type,
            "instructions": instructions
        })

        final_content = response.content.strip()
        
        # Clean up any potential markdown wrap
        if final_content.startswith("```yaml"):
            # If it's wrapped in a block, we need to extract everything including the yaml
            # but sometimes the LLM might just return the raw text starting with ```yaml
            # We want to keep the YAML but remove the triple backticks if they are at the very start/end
            if final_content.endswith("```"):
                final_content = final_content[0:-3].strip()
            if final_content.startswith("```"):
                # We want to keep the 'yaml' if it's there but remove the ticks
                lines = final_content.splitlines()
                if lines[0].startswith("```"):
                    final_content = "\n".join(lines[1:]).strip()

        # Save the skill persistently
        os.makedirs(skill_dir, exist_ok=True)
        with open(skill_md_path, "w") as f:
            f.write(final_content)
            
        return final_content

    async def _orchestrate_skill_update(self, draft_type: str, update_context: str) -> str:
        """
        The central LLM-driven merging engine.
        """
        skill_dir = f"skills/{draft_type}"
        skill_md_path = os.path.join(skill_dir, "SKILL.md")
        
        existing_skill_content = "No existing skill definition found."
        if os.path.exists(skill_md_path):
            try:
                with open(skill_md_path, "r") as f:
                    existing_skill_content = f.read()
            except Exception:
                pass

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are the Lead Legal Knowledge Engineer at Legal Intelligence.
            Your task is to maintain and refine 'Agent Skills' for our legal AI.
            
            CURRENT SKILL DEFINITION ({draft_type}):
            {existing_content}

            NEW INPUT (Edit Diff or Direct Directive):
            {update_context}

            TASK:
            1. STEP 1 (SURGICAL ANALYSIS): Analyze exactly what was changed in the diff. Extract ONLY the specific new legal preference, stylistic rule, or factual correction.
            2. STEP 2 (SURGICAL MERGE): Update ONLY the relevant instructions in the CURRENT SKILL DEFINITION or add a new specific instruction. 
            3. STEP 3 (RESOLVE): Contradictions are resolved by giving preference to the LATEST input.
            4. STEP 4 (MINIMALISM): Do not add generic fluff. Keep the skill focused on patterns learned from edits.
            
            OUTPUT:
            Output ONLY the complete, final Markdown content for the SKILL.md file. 
            Structure:
            # Skill: {draft_type}
            ## Metadata
            - [Short description of patterns learned]
            ## Instructions
            - [Actionable bullet points]
            
            No conversational filler or markdown code blocks - just the raw file content."""),
        ])

        chain = prompt | self.llm
        response = await chain.ainvoke({
            "draft_type": draft_type,
            "existing_content": existing_skill_content,
            "update_context": update_context
        })

        final_content = response.content.strip()
        # Clean up any potential markdown wrap
        if final_content.startswith("```markdown"):
            final_content = final_content.split("```markdown")[1].split("```")[0].strip()
        elif final_content.startswith("```"):
            final_content = final_content.split("```")[1].split("```")[0].strip()

        # Final check: Ensure we are not saving empty content if LLM fails
        if not final_content:
            return existing_skill_content

        # Save the skill persistently
        os.makedirs(skill_dir, exist_ok=True)
        os.makedirs(os.path.join(skill_dir, "scripts"), exist_ok=True)
        os.makedirs(os.path.join(skill_dir, "templates"), exist_ok=True)
        os.makedirs(os.path.join(skill_dir, "resources"), exist_ok=True)
        
        # Absolute path for debugging/reliability
        abs_skill_path = os.path.abspath(skill_md_path)
        with open(abs_skill_path, "w") as f:
            f.write(final_content)
            
        return final_content
