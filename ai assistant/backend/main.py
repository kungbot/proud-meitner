import os
import sys
import asyncio
from pathlib import Path

# Add the parent directory of 'backend' to sys.path so we can import 'backend'
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.config import HOST, PORT, WORKSPACE_DIR
from backend.agents.orchestrator import OrchestratorAgent
from backend.services.audio_service import AudioService
from backend.services.vision_service import VisionService

app = FastAPI(title="JARVIS Desktop Core", version="1.0.0")

# Enable CORS for Next.js app and Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

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

# HTTP API Endpoints
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    result = orchestrator.route_and_execute(req.query)
    # If successful response text is present, speak it asynchronously
    if result.get("status") == "success":
        audio.speak(result.get("response", ""))
    return result

@app.post("/api/confirm")
async def confirm_endpoint(req: ConfirmRequest):
    result = orchestrator.execute_confirmed_action(req.payload)
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
                    result = orchestrator.route_and_execute(transcription)
                    
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
                result = orchestrator.route_and_execute(text)
                
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
