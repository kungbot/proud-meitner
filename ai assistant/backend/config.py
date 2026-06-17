import os
from pathlib import Path

# Load environment variables from .env file at workspace root
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
except ImportError:
    # python-dotenv not installed yet; env vars must be set manually
    pass

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = Path(os.environ.get("WORKSPACE_DIR", "c:/Users/planm/Documents/antigravity/proud-meitner"))
APP_DATA_DIR = Path(os.environ.get("APP_DATA_DIR", str(Path.home() / ".gemini" / "antigravity-ide")))
BRAIN_DIR = APP_DATA_DIR / "brain" / "37bc5ea7-7f53-4a83-a57b-fe922d1d4685"

# SQLite DB Path
DB_PATH = BRAIN_DIR / "jarvis_memory.db"
os.makedirs(BRAIN_DIR, exist_ok=True)

# Model configuration
MODEL_PROVIDER = os.environ.get("MODEL_PROVIDER", "openai")  # openai or ollama or mock
MODEL_NAME = os.environ.get("MODEL_NAME", "gpt-4o-mini")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")

# OCR configuration (Tesseract fallback)
TESSERACT_CMD = os.environ.get("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")

# Voice config
TTS_RATE = int(os.environ.get("TTS_RATE", 185))
TTS_VOLUME = float(os.environ.get("TTS_VOLUME", 1.0))
WAKE_WORDS = ["jarvis", "hey jarvis", "computer"]

# Server settings
HOST = "127.0.0.1"
PORT = 8000
