# 🎙️ JARVIS AI Assistant v2.3.0

An advanced, multi-agent AI desktop assistant featuring a premium glassmorphic HUD visualizer, real-time voice interaction, semantic memory, active window/situational context tracking, and live system analytics.

---

## ✨ Features

- **🔴 Siri-Style Waveform Visualizer**: High-performance audio waveform and orbital ring visualization that responds dynamically to audio levels and agent states.
- **🧠 Semantic Long-Term Memory (RAG)**: A persistent SQLite-backed memory system. JARVIS can automatically remember facts, store user preferences, and fetch contextually relevant memories on the fly.
- **🖥️ Desktop HUD Dashboard**: Open the visual dashboard instantly using the global hotkey (`Ctrl + Space`) or interact using voice-only commands.
- **📊 Real-time Telemetry & Diagnostics**: Live trackers for CPU, RAM, and disk utilization with smooth animated meters, including listing top memory-consuming processes.
- **🔍 AI-Synthesized Research Agent**: Conducts web searches, scrapes target web pages, and synthesizes clean, formatted markdown reports using LLM capabilities.
- **🛡️ Intent Classification & Security Guard**: Classifies queries into intents (system, browser, code, memory, chat). Critical commands require user confirmation before executing.
- **⚙️ Hot-Reloadable Settings**: Dynamically update models (supports OpenAI, OpenRouter, and local Ollama), API keys, TTS speed/volume, and hosts directly from the UI settings panel without restart.

---

## 🏗️ Architecture

```mermaid
graph TD
    A[Electron Desktop Shell] -->|IPC / Global Hotkeys| B[Next.js Frontend]
    B -->|REST APIs / SSE Streaming| C[FastAPI Backend]
    C -->|Orchestrator Agent| D[Intent Classifier]
    D -->|Chat / Code / Research| E[LLM / Ollama / OpenAI]
    C -->|Memory RAG| F[SQLite Database]
    C -->|Active Window Tracking| G[System Monitor]
    C -->|Audio Input / Output| H[PyAudio / TTS Engine]
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Lucide React, `react-markdown`, `remark-gfm`.
- **Backend**: FastAPI (Python), PyAudio, SQLite, OpenAI / OpenRouter / Ollama API clients.
- **Desktop Shell**: Electron.

---

## 🚀 Getting Started

### 📋 Prerequisites

- **Python 3.10+** (Make sure Python is added to your environment `PATH`)
- **Node.js 18+**
- **Git**
- *(Optional)* **Ollama** (for local offline LLMs)

### 🔧 Installation

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd proud-meitner
   ```

2. Configure Environment Variables:
   Copy `.env.example` to create your `.env` file and fill in your keys:
   ```bash
   copy .env.example .env
   ```

### ⚡ Running JARVIS

To make launching simple, we have provided a single batch script that installs all dependencies (both Python and Node.js) and runs the backend, frontend, and Electron app concurrently.

Simply run the batch script from the root folder:
```bash
.\run_jarvis.bat
```
