import os
import sys
import asyncio
import json
from pathlib import Path

# Add the parent directory of 'backend' to sys.path so we can import 'backend'
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.config import HOST, PORT, WORKSPACE_DIR
from backend.agents.orchestrator import OrchestratorAgent
from backend.services.audio_service import AudioService
from backend.services.vision_service import VisionService
from backend.services.settings import SettingsService

from fastapi.staticfiles import StaticFiles

app = FastAPI(title="JARVIS Desktop Core", version="1.0.0")

# Enable CORS for Next.js app and Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

# Serve static files from workspace (e.g., screenshots)
app.mount("/static", StaticFiles(directory=str(WORKSPACE_DIR)), name="static")

# Load settings from DB at startup and hot-reload config attributes
settings_service = SettingsService()
try:
    all_settings = settings_service.get_all_settings()
    for key, val in all_settings.items():
        settings_service._hot_reload(key, val)
except Exception as e:
    print(f"Failed to load settings at startup: {e}")

# Shared objects
orchestrator = OrchestratorAgent()
vision = VisionService()
audio = AudioService()

# WebSocket connections tracking
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# Setup background wake-word callback
def wake_word_callback():
    print("Wake word spotted! Broadcasting to frontend...")
    # Since this is run in a background thread, we must run the coroutine in the server's event loop
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.run_coroutine_threadsafe(
            manager.broadcast({"type": "wake_word_detected", "state": "listening"}),
            loop
        )
        # Play a soft alert TTS
        audio.speak("Yes, sir?")
    else:
        # Fallback if loop is not running yet
        audio.speak("Jarvis activated.")

audio.on_wake_word_detected = wake_word_callback

# Startup task
@app.on_event("startup")
def startup_event():
    # Start wake-word background thread
    audio.start_wake_word_detection()
    # Speak startup greeting
    audio.speak("J.A.R.V.I.S. is online. All systems are fully operational.")

@app.on_event("shutdown")
def shutdown_event():
    # Stop wake-word thread
    audio.stop_wake_word_detection()

# Models
class ChatRequest(BaseModel):
    query: str

class ConfirmRequest(BaseModel):
    payload: Dict[str, Any]

class MemoryRequest(BaseModel):
    key: str
    value: str
    category: str = "general"

class SettingsRequest(BaseModel):
    model_provider: str
    model_name: str
    openai_api_key: str
    tts_rate: str
    tts_volume: str
    ollama_host: str

# HTTP API Endpoints
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    result = await orchestrator.route_and_execute(req.query)
    # If successful response text is present, speak it asynchronously
    if result.get("status") == "success":
        audio.speak(result.get("response", ""))
    return result

@app.post("/api/confirm")
async def confirm_endpoint(req: ConfirmRequest):
    result = await orchestrator.execute_confirmed_action(req.payload)
    if result.get("status") == "success":
        audio.speak(result.get("response", ""))
    return result

@app.get("/api/status")
async def status_endpoint():
    return orchestrator.system.get_system_stats()

@app.get("/api/memories")
async def get_memories():
    return orchestrator.memory.get_all_memories()

@app.post("/api/memories")
async def add_memory(req: MemoryRequest):
    success = orchestrator.memory.store_memory(req.key, req.value, req.category)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to write memory.")
    return {"status": "success"}

@app.delete("/api/memories/{key}")
async def delete_memory(key: str):
    success = orchestrator.memory.delete_memory(key)
    if not success:
        raise HTTPException(status_code=404, detail="Memory key not found.")
    return {"status": "success"}

@app.get("/api/tasks")
async def get_tasks():
    return orchestrator.memory.get_tasks_progress(limit=15)

@app.post("/api/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    async def event_generator():
        # Log query
        orchestrator.memory.log_interaction("user", req.query)
        orchestrator.memory.log_task_status("Orchestrator", "thinking", f"Processing streaming query: {req.query}")
        
        intent_info = orchestrator.classify_intent(req.query)
        intent = intent_info.get("intent", "chat")
        parameters = intent_info.get("parameters", {})
        
        # Security check
        needs_confirm, action_type, details = orchestrator.check_security(intent, parameters)
        if needs_confirm:
            orchestrator.memory.log_task_status("Orchestrator", "waiting_approval", f"Requires approval: {details}")
            yield f"data: {json.dumps({'type': 'confirmation', 'status': 'needs_confirmation', 'action_type': action_type, 'action_details': details, 'payload': {'intent': intent, 'parameters': parameters, 'query': req.query}})}\n\n"
            return
            
        if intent != "chat":
            try:
                result = await orchestrator.execute_intent(intent, parameters, req.query)
                response_text = result.get("response", "Action completed.")
                orchestrator.memory.log_interaction("assistant", response_text)
                orchestrator.memory.log_task_status("Orchestrator", "completed", f"Finished {intent} task.")
                yield f"data: {json.dumps({'type': 'result', 'status': 'success', 'intent': intent, 'response': response_text, 'data': result.get('data')})}\n\n"
                audio.speak(response_text)
            except Exception as e:
                err_msg = f"Failed to execute task: {str(e)}"
                orchestrator.memory.log_task_status("Orchestrator", "failed", err_msg)
                yield f"data: {json.dumps({'type': 'error', 'status': 'error', 'response': f'Error: {str(e)}'})}\n\n"
        else:
            # Stream LLM chat fallback with active window context & semantic memory
            system_prompt = orchestrator.get_chat_system_prompt(req.query)
            context = orchestrator.memory.get_conversation_context(limit=10)
            formatted_prompt = ""
            for msg in context:
                formatted_prompt += f"{msg['role'].capitalize()}: {msg['content']}\n"
            formatted_prompt += f"User: {req.query}\nAssistant:"
            
            from backend.utils.llm import stream_llm
            full_response = ""
            sentence_buffer = ""
            try:
                for chunk in stream_llm(system_prompt, formatted_prompt):
                    full_response += chunk
                    sentence_buffer += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                    
                    # Split sentences on-the-fly and speak as they are completed
                    if any(p in chunk for p in ['.', '!', '?']):
                        last_punc_idx = max(
                            sentence_buffer.rfind('.'), 
                            sentence_buffer.rfind('!'), 
                            sentence_buffer.rfind('?')
                        )
                        if last_punc_idx != -1:
                            sentence_to_speak = sentence_buffer[:last_punc_idx + 1].strip()
                            if sentence_to_speak:
                                audio.speak(sentence_to_speak)
                            sentence_buffer = sentence_buffer[last_punc_idx + 1:]
                    
                    await asyncio.sleep(0.005)
                
                # Speak any remaining text at the end
                remaining = sentence_buffer.strip()
                if remaining:
                    audio.speak(remaining)
                
                # Success
                orchestrator.memory.log_interaction("assistant", full_response)
                orchestrator.memory.log_task_status("Orchestrator", "completed", "Finished streaming chat task.")
                yield f"data: {json.dumps({'type': 'result', 'status': 'success', 'response': full_response})}\n\n"
            except Exception as e:
                err_msg = f"Streaming failed: {str(e)}"
                orchestrator.memory.log_task_status("Orchestrator", "failed", err_msg)
                yield f"data: {json.dumps({'type': 'error', 'status': 'error', 'response': f'Error: {str(e)}'})}\n\n"
 
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/history")
async def get_history():
    return orchestrator.memory.get_recent_interactions(limit=20)

@app.delete("/api/history")
async def clear_history():
    success = orchestrator.memory.clear_interaction_logs()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear history.")
    return {"status": "success"}

@app.get("/api/settings")
async def get_settings():
    return settings_service.get_all_settings()

@app.put("/api/settings")
async def update_settings(req: SettingsRequest):
    settings_dict = req.dict()
    for key, val in settings_dict.items():
        settings_service.update_setting(key, str(val))
    return {"status": "success"}

@app.get("/api/models")
async def get_models():
    provider = settings_service.get_setting("model_provider")
    if provider == "ollama":
        import requests
        from backend.config import OLLAMA_HOST
        try:
            res = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=3)
            if res.status_code == 200:
                models = res.json().get("models", [])
                return {"models": [m["name"] for m in models]}
        except Exception:
            pass
        return {"models": ["llama3", "llama3.2:1b", "mistral"]}
    else:
        return {"models": ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]}

@app.post("/api/screenshot")
async def capture_screen():
    save_path = str(WORKSPACE_DIR / "screenshot.png")
    result = vision.analyze_active_screen(save_path)
    return result

@app.post("/api/tts")
async def text_to_speech(req: ChatRequest):
    audio.speak(req.query)
    return {"status": "success"}

# WebSocket for streaming chat and voice state updates
@app.websocket("/api/voice")
async def voice_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial status
        await websocket.send_json({"type": "status", "state": "idle"})
        
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "start_listening":
                # User wants Jarvis to record mic input
                await websocket.send_json({"type": "status", "state": "listening"})
                
                # Run mic in background thread to avoid locking FastAPI socket
                loop = asyncio.get_event_loop()
                transcription = await loop.run_in_executor(None, audio.listen_for_speech)
                
                if transcription:
                    await websocket.send_json({"type": "transcription", "text": transcription})
                    # Run orchestrator
                    await websocket.send_json({"type": "status", "state": "thinking"})
                    result = await orchestrator.route_and_execute(transcription)
                    
                    if result.get("status") == "success":
                        audio.speak(result.get("response", ""))
                        
                    await websocket.send_json({
                        "type": "result",
                        "status": result.get("status"),
                        "response": result.get("response"),
                        "data": result.get("data")
                    })
                else:
                    await websocket.send_json({"type": "error", "message": "No speech detected."})
                
                await websocket.send_json({"type": "status", "state": "idle"})
                
            elif msg_type == "chat_message":
                text = data.get("text", "")
                await websocket.send_json({"type": "status", "state": "thinking"})
                result = await orchestrator.route_and_execute(text)
                
                if result.get("status") == "success":
                    audio.speak(result.get("response", ""))
                    
                await websocket.send_json({
                    "type": "result",
                    "status": result.get("status"),
                    "response": result.get("response"),
                    "data": result.get("data")
                })
                await websocket.send_json({"type": "status", "state": "idle"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS Exception: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
