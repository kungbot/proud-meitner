import os
from pathlib import Path
from backend.config import WORKSPACE_DIR
from backend.utils.llm import query_llm

class CodingAgent:
    def __init__(self):
        self.workspace_dir = WORKSPACE_DIR

    def explain_code(self, file_path: str) -> str:
        """Reads a file and queries LLM to explain the logic."""
        full_path = Path(file_path)
        if not full_path.is_absolute():
            full_path = self.workspace_dir / full_path
            
        if not full_path.exists() or not full_path.is_file():
            return f"Code error: File {file_path} not found."
            
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                code_content = f.read(5000)  # first 5000 chars
                
            system_prompt = "You are JARVIS, an elite system programming agent. Explain the following code clearly, summarizing its main logic, inputs, outputs, and any potential security vulnerabilities."
            user_prompt = f"File: {full_path.name}\n\n```\n{code_content}\n```"
            
            return query_llm(system_prompt, user_prompt)
        except Exception as e:
            return f"Error explaining code: {e}"

    def refactor_code(self, file_path: str, instruction: str) -> str:
        """Reads a file, queries LLM to refactor it, and overwrites the file with new content."""
        full_path = Path(file_path)
        if not full_path.is_absolute():
            full_path = self.workspace_dir / full_path
            
        if not full_path.exists() or not full_path.is_file():
            return f"Code error: File {file_path} not found."
            
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                code_content = f.read()
                
            system_prompt = (
                "You are JARVIS, an elite programming agent. Refactor the provided code following the instructions precisely. "
                "Output ONLY the refactored code block. Do NOT include explanations, markdown format tags, or commentary outside the code block."
            )
            user_prompt = f"Instruction: {instruction}\n\nOriginal Code:\n```\n{code_content}\n```"
            
            refactored_code = query_llm(system_prompt, user_prompt)
            
            # Clean LLM response (strip ```language blocks)
            lines = refactored_code.splitlines()
            if len(lines) > 0 and (lines[0].startswith("```") or lines[0].strip() == ""):
                # Remove code blocks
                cleaned_lines = [l for l in lines if not l.strip().startswith("```")]
                refactored_code = "\n".join(cleaned_lines)
                
            # Write back
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(refactored_code.strip())
                
            return f"Successfully refactored {full_path.name} based on: '{instruction}'."
        except Exception as e:
            return f"Error refactoring code: {e}"

    def generate_component(self, target_file: str, tech_stack: str, details: str) -> str:
        """Generates a code component and saves it to target_file path."""
        full_path = Path(target_file)
        if not full_path.is_absolute():
            full_path = self.workspace_dir / full_path
            
        try:
            os.makedirs(full_path.parent, exist_ok=True)
            
            system_prompt = (
                f"You are JARVIS, an expert software developer. Generate a clean, complete, production-ready code component using {tech_stack}. "
                "Output ONLY the final code. No chat, no comments, no markdown code block fences."
            )
            user_prompt = f"Details of component to create:\n{details}"
            
            code_result = query_llm(system_prompt, user_prompt)
            
            # Clean up fences
            lines = code_result.splitlines()
            if len(lines) > 0 and (lines[0].startswith("```") or lines[0].strip() == ""):
                cleaned_lines = [l for l in lines if not l.strip().startswith("```")]
                code_result = "\n".join(cleaned_lines)
                
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(code_result.strip())
                
            return f"Component generated successfully at {full_path.as_posix()}"
        except Exception as e:
            return f"Error generating component: {e}"
            
    def create_project_structure(self, project_name: str, type_name: str) -> str:
        """Create directory structure and stub files for standard apps."""
        try:
            proj_dir = self.workspace_dir / project_name
            os.makedirs(proj_dir, exist_ok=True)
            
            if type_name.lower() in ["nextjs", "next.js"]:
                (proj_dir / "src" / "app").mkdir(parents=True, exist_ok=True)
                (proj_dir / "src" / "components").mkdir(parents=True, exist_ok=True)
                
                # Write package.json stub
                with open(proj_dir / "package.json", 'w') as f:
                    f.write('{\n  "name": "' + project_name + '",\n  "version": "0.1.0",\n  "private": true\n}')
                return f"Created Next.js project layout at {proj_dir.as_posix()}"
                
            elif type_name.lower() in ["fastapi", "python"]:
                (proj_dir / "app").mkdir(parents=True, exist_ok=True)
                (proj_dir / "tests").mkdir(parents=True, exist_ok=True)
                with open(proj_dir / "app" / "main.py", 'w') as f:
                    f.write("from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get('/')\ndef index():\n    return {'status': 'healthy'}\n")
                with open(proj_dir / "requirements.txt", 'w') as f:
                    f.write("fastapi\nuvicorn\n")
                return f"Created FastAPI project layout at {proj_dir.as_posix()}"
                
            else:
                (proj_dir / "src").mkdir(exist_ok=True)
                return f"Created general project structure at {proj_dir.as_posix()}"
        except Exception as e:
            return f"Error creating project: {e}"
