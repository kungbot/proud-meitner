import json
from backend.agents.memory_agent import MemoryAgent
from backend.agents.system_agent import SystemAgent
from backend.agents.file_agent import FileAgent
from backend.agents.browser_agent import BrowserAgent
from backend.agents.research_agent import ResearchAgent
from backend.agents.coding_agent import CodingAgent
from backend.utils.llm import query_llm

class OrchestratorAgent:
    def __init__(self):
        self.memory = MemoryAgent()
        self.system = SystemAgent()
        self.files = FileAgent()
        self.browser = BrowserAgent()
        self.research = ResearchAgent(self.browser)
        self.coding = CodingAgent()

    def route_and_execute(self, user_query: str) -> dict:
        """Determines intent and dispatches to the correct agent, logging status."""
        self.memory.log_interaction("user", user_query)
        self.memory.log_task_status("Orchestrator", "thinking", f"Processing query: {user_query}")

        # 1. Classify intent via LLM
        intent_info = self.classify_intent(user_query)
        intent = intent_info.get("intent", "chat")
        confidence = intent_info.get("confidence", 1.0)
        parameters = intent_info.get("parameters", {})
        
        print(f"Routed intent: {intent} (parameters: {parameters})")
        
        # 2. Check Security Confirmation requirements
        needs_confirm, action_type, details = self.check_security(intent, parameters)
        if needs_confirm:
            self.memory.log_task_status("Orchestrator", "waiting_approval", f"Requires approval: {details}")
            return {
                "status": "needs_confirmation",
                "action_type": action_type,
                "action_details": details,
                "payload": {
                    "intent": intent,
                    "parameters": parameters,
                    "query": user_query
                },
                "response": f"I require your authorization to execute this system action: {details}."
            }

        # 3. Dispatch execution
        try:
            result = self.execute_intent(intent, parameters, user_query)
            
            # Format successful responses
            response_text = result.get("response", "Action completed.")
            self.memory.log_interaction("assistant", response_text)
            self.memory.log_task_status("Orchestrator", "completed", f"Finished {intent} task.")
            
            return {
                "status": "success",
                "intent": intent,
                "response": response_text,
                "data": result.get("data")
            }
        except Exception as e:
            err_msg = f"Failed to execute task: {str(e)}"
            self.memory.log_task_status("Orchestrator", "failed", err_msg)
            return {
                "status": "error",
                "response": f"I encountered an error while executing the request: {str(e)}"
            }

    def check_security(self, intent: str, params: dict) -> tuple:
        """Determines if the action represents a dangerous system operation."""
        # Check system shutdowns/sleeps
        if intent == "system":
            action = params.get("action", "")
            if action in ["shutdown", "restart", "sleep"]:
                return True, "power_state", f"Change power state to {action}?"
            if action == "close_app" and params.get("app_name", ""):
                app = params.get("app_name")
                # Don't kill critical system processes easily
                if app.lower() in ["explorer", "svchost", "winlogon", "lsass", "taskmgr"]:
                    return True, "close_process", f"Terminate critical process: {app}?"
            if action == "run_command" and params.get("command", ""):
                return True, "run_command", f"Run terminal command: '{params.get('command')}'"
                
        # Check file deletions
        if intent == "file" and params.get("action") == "delete":
            file_path = params.get("file_path", "")
            return True, "delete_file", f"Permanently delete file at: {file_path}?"
            
        return False, None, None

    def execute_confirmed_action(self, payload: dict) -> dict:
        """Trigger actual action after user confirmation."""
        intent = payload.get("intent")
        parameters = payload.get("parameters")
        query = payload.get("query")
        
        # Bypass confirmation checks since we are already confirmed
        try:
            result = self.execute_intent(intent, parameters, query)
            response_text = result.get("response", "Action confirmed and completed.")
            self.memory.log_interaction("assistant", response_text)
            self.memory.log_task_status("Orchestrator", "completed", f"Confirmed action completed: {intent}")
            return {
                "status": "success",
                "intent": intent,
                "response": response_text,
                "data": result.get("data")
            }
        except Exception as e:
            return {
                "status": "error",
                "response": f"Confirmed action failed: {str(e)}"
            }

    def classify_intent(self, query: str) -> dict:
        """LLM classifier or rule-based parser fallback."""
        system_prompt = (
            "You are the central intent classifier for JARVIS. Categorize the user request into one of the following intents:\n"
            "1. 'system' - power controls (lock, sleep, shutdown, restart), volume control, stats, process killing, launching custom apps, executing terminal commands.\n"
            "2. 'file' - create, delete, list directory, search files, rename, move, organize folder.\n"
            "3. 'coding' - create project structure, refactor files, explain code, create react/next.js dashboard component.\n"
            "4. 'research' - web search, summarize articles, compare technologies.\n"
            "5. 'browser' - web browsing tasks, fill forms.\n"
            "6. 'memory' - store facts, retrieve user preferences (e.g. 'Remember that...', 'What project am I working on?').\n"
            "7. 'chat' - general conversation or talk.\n\n"
            "You must output a JSON object with: {'intent': '<name>', 'confidence': <0-1>, 'parameters': {<extracted entities>}}.\n"
            "Valid actions for 'system': 'lock', 'shutdown', 'restart', 'sleep', 'set_volume', 'get_stats', 'launch_app', 'close_app', 'run_command', 'screenshot'.\n"
            "Valid actions for 'file': 'create', 'delete', 'list', 'search', 'rename', 'move', 'organize'.\n"
            "Format the parameters cleanly (e.g. app_name, volume_level, file_path, query_term, tech_stack)."
        )
        try:
            llm_res = query_llm(system_prompt, query)
            # Find JSON block
            start = llm_res.find("{")
            end = llm_res.rfind("}") + 1
            if start != -1 and end != -1:
                return json.loads(llm_res[start:end])
        except Exception as e:
            print(f"LLM Classification error: {e}")
            
        # Regex/rule-based fallback
        q_lower = query.lower()
        if any(w in q_lower for w in ["lock computer", "shutdown", "restart", "sleep", "volume", "cpu", "stats", "open chrome", "open vs code", "launch"]):
            action = "get_stats"
            if "lock" in q_lower: action = "lock"
            elif "shutdown" in q_lower: action = "shutdown"
            elif "restart" in q_lower: action = "restart"
            elif "sleep" in q_lower: action = "sleep"
            elif "volume" in q_lower: action = "set_volume"
            elif "open" in q_lower or "launch" in q_lower: action = "launch_app"
            
            # Extract volume number
            vol_lvl = 50
            for word in q_lower.split():
                if word.endswith("%"):
                    word = word[:-1]
                if word.isdigit():
                    vol_lvl = int(word)
                    
            app_name = "chrome" if "chrome" in q_lower else "code" if "code" in q_lower or "visual studio" in q_lower else ""
            
            return {
                "intent": "system",
                "confidence": 0.8,
                "parameters": {"action": action, "volume_level": vol_lvl, "app_name": app_name}
            }
            
        if any(w in q_lower for w in ["find", "search files", "organize downloads", "delete file", "create file", "list folder"]):
            action = "search"
            if "delete" in q_lower: action = "delete"
            elif "create" in q_lower: action = "create"
            elif "list" in q_lower: action = "list"
            elif "organize" in q_lower: action = "organize"
            
            return {
                "intent": "file",
                "confidence": 0.8,
                "parameters": {"action": action}
            }
            
        if any(w in q_lower for w in ["remember", "what is my", "recall", "memorize"]):
            return {
                "intent": "memory",
                "confidence": 0.9,
                "parameters": {"action": "store" if "remember" in q_lower else "retrieve"}
            }
            
        if any(w in q_lower for w in ["research", "summarize", "search the web", "compare"]):
            return {
                "intent": "research",
                "confidence": 0.8,
                "parameters": {"query_term": query}
            }
            
        return {"intent": "chat", "confidence": 1.0, "parameters": {}}

    def execute_intent(self, intent: str, params: dict, original_query: str) -> dict:
        """Dispatches request execution based on determined intent."""
        
        if intent == "system":
            action = params.get("action")
            if action == "lock":
                ok = self.system.lock_screen()
                return {"response": "System locked successfully." if ok else "Failed to lock system.", "data": {"success": ok}}
            elif action == "shutdown":
                ok = self.system.shutdown()
                return {"response": "Initiating system shutdown in 10 seconds...", "data": {"success": ok}}
            elif action == "restart":
                ok = self.system.restart()
                return {"response": "Initiating system restart in 10 seconds...", "data": {"success": ok}}
            elif action == "sleep":
                ok = self.system.sleep()
                return {"response": "Putting system to sleep.", "data": {"success": ok}}
            elif action == "set_volume":
                level = params.get("volume_level", 50)
                ok = self.system.set_volume(level)
                return {"response": f"System volume set to {level}%.", "data": {"success": ok}}
            elif action == "get_stats":
                stats = self.system.get_system_stats()
                return {
                    "response": f"System diagnostics: CPU is at {stats['cpu']}%, RAM is {stats['memory_percent']}% used, and Disk is {stats['disk_percent']}% full.",
                    "data": stats
                }
            elif action == "launch_app":
                app_name = params.get("app_name", "cmd")
                ok = self.system.launch_app(app_name)
                return {"response": f"Launched application: {app_name}.", "data": {"success": ok}}
            elif action == "close_app":
                app_name = params.get("app_name")
                ok = self.system.close_app(app_name)
                return {"response": f"Closed processes matching: {app_name}." if ok else f"No processes found for {app_name}.", "data": {"success": ok}}
            elif action == "run_command":
                cmd = params.get("command")
                res = self.system.execute_terminal_command(cmd)
                return {"response": f"Terminal command executed:\n```\n{res}\n```", "data": {"result": res}}
            elif action == "screenshot":
                # Save screenshot to workspace or tmp
                path = str(self.files.workspace_dir / "screenshot.png")
                ok = self.system.capture_screenshot(path)
                return {"response": "Screenshot captured and saved to workspace.", "data": {"path": path, "success": ok}}
                
        elif intent == "file":
            action = params.get("action")
            if action == "create":
                path = params.get("file_path", "new_file.txt")
                content = params.get("content", "")
                ok = self.files.create_file(path, content)
                return {"response": f"File created at: {path}." if ok else "Failed to create file.", "data": {"success": ok}}
            elif action == "delete":
                path = params.get("file_path")
                ok = self.files.delete_file(path)
                return {"response": f"Deleted file: {path}." if ok else "Failed to delete file or file doesn't exist.", "data": {"success": ok}}
            elif action == "list":
                path = params.get("folder_path")
                contents = self.files.list_directory(path)
                file_list = "\n".join([f"- {'[DIR] ' if c['is_dir'] else ''}{c['name']}" for c in contents])
                return {"response": f"Contents of folder:\n{file_list}", "data": contents}
            elif action == "search":
                q = params.get("query_term", "")
                path = params.get("folder_path")
                matches = self.files.search_files(q, path)
                match_list = "\n".join([f"- {m['name']} ({m['path']})" for m in matches])
                return {"response": f"Found {len(matches)} files:\n{match_list}" if matches else "No matching files found.", "data": matches}
            elif action == "rename":
                old = params.get("old_path")
                new = params.get("new_path")
                ok = self.files.rename_file(old, new)
                return {"response": f"Renamed file to {new}." if ok else "Failed to rename file.", "data": {"success": ok}}
            elif action == "move":
                src = params.get("src_path")
                dest = params.get("dest_path")
                ok = self.files.move_file(src, dest)
                return {"response": f"Moved file to {dest}." if ok else "Failed to move file.", "data": {"success": ok}}
            elif action == "organize":
                path = params.get("folder_path", str(self.files.workspace_dir))
                res = self.files.organize_folder(path)
                if res.get("success"):
                    details = ", ".join([f"{k}: {v}" for k, v in res.get("organized", {}).items()])
                    return {"response": f"Organized folder! Files grouped: {details if details else 'none'}.", "data": res}
                return {"response": f"Failed to organize folder: {res.get('error')}", "data": res}

        elif intent == "coding":
            action = params.get("action", "")
            if "explain" in original_query.lower() or action == "explain":
                path = params.get("file_path")
                explanation = self.coding.explain_code(path)
                return {"response": explanation, "data": {}}
            elif "refactor" in original_query.lower() or action == "refactor":
                path = params.get("file_path")
                instr = params.get("instruction", "improve readability")
                res = self.coding.refactor_code(path, instr)
                return {"response": res, "data": {}}
            elif "dashboard" in original_query.lower() or "component" in original_query.lower():
                path = params.get("file_path", "src/components/DashboardCard.tsx")
                stack = params.get("tech_stack", "React, TypeScript, Tailwind CSS")
                details = params.get("details", original_query)
                res = self.coding.generate_component(path, stack, details)
                return {"response": res, "data": {}}
            else:
                proj_name = params.get("project_name", "new-app")
                p_type = params.get("project_type", "nextjs")
                res = self.coding.create_project_structure(proj_name, p_type)
                return {"response": res, "data": {}}

        elif intent == "research":
            # Running as background task, but we can do sync since we have Playwright async
            loop = asyncio.get_event_loop()
            task = loop.create_task(self.research.conduct_research(original_query))
            report = loop.run_until_complete(task)
            return {"response": report, "data": {}}

        elif intent == "browser":
            url = params.get("url", "https://google.com")
            loop = asyncio.get_event_loop()
            task = loop.create_task(self.browser.open_url(url))
            res = loop.run_until_complete(task)
            if res.get("success"):
                return {"response": f"Opened page '{res['title']}' successfully.", "data": res}
            return {"response": f"Failed to open page: {res.get('error')}", "data": res}

        elif intent == "memory":
            action = params.get("action", "retrieve")
            # Parse memory key
            if "remember that" in original_query.lower():
                # Extract key value
                content = original_query.lower().split("remember that")[-1].strip()
                if " is " in content:
                    parts = content.split(" is ", 1)
                    key = parts[0].strip()
                    val = parts[1].strip()
                else:
                    key = "general_note"
                    val = content
                self.memory.store_memory(key, val, "user_preference")
                return {"response": f"I've committed that to memory: **{key}** is **{val}**.", "data": {}}
            else:
                # Retrieve memory via SQLite text search
                query_term = original_query.lower().replace("what project", "").replace("what is my", "").replace("remember", "").strip()
                m_list = self.memory.search_memories(query_term)
                if m_list:
                    val = m_list[0]['value']
                    key = m_list[0]['key']
                    return {"response": f"I recall you mentioning that {key} is **{val}**.", "data": m_list}
                
                # Check list of all memories
                all_m = self.memory.get_all_memories()
                if all_m:
                    return {"response": f"I couldn't match a specific fact, but here is what I remember:\n" + "\n".join([f"- **{m['key']}**: {m['value']}" for m in all_m]), "data": all_m}
                return {"response": "I don't have any memories saved about that yet. You can tell me to remember facts by saying 'Jarvis, remember that...'.", "data": []}

        # Chat fallback
        system_prompt = (
            "You are JARVIS, the legendary AI desktop companion. Respond to the user's query naturally, showing context-aware, helpful, "
            "and polite intelligence. Keep responses relatively concise and punchy, as they are spoken or displayed on a desktop screen."
        )
        chat_res = query_llm(system_prompt, original_query)
        return {"response": chat_res, "data": {}}
