# JARVIS Upgrade — Task Tracker

## Phase 1 — Critical Bug Fixes 🔴
- [x] Fix missing dependencies in requirements.txt
- [x] Fix async/sync crash in orchestrator.py
- [x] Add graceful .env handling in config.py
- [x] Create .env.example template

## Phase 2 — Speed & Responsiveness ⚡
- [x] Add streaming LLM function in llm.py
- [x] Add SSE streaming endpoint in main.py
- [x] Add conversation context (last 10 messages to LLM)
- [x] Add chat history persistence in memory_agent.py
- [x] Add chat history API endpoints
- [x] Upgrade research_agent.py with LLM synthesis

## Phase 3 — UI/UX Overhaul 🎨
- [x] Extract ChatPanel component (with markdown rendering)
- [x] Extract MetricsPanel component
- [x] Extract MemoryPanel component
- [x] Extract TaskLog component
- [x] Extract ConfirmModal component
- [x] Create SettingsPanel component
- [x] Create NotificationToast component
- [x] Refactor page.tsx to use new components
- [x] Add Framer Motion animations
- [x] Add settings API endpoints (backend)
- [x] Add settings service (backend)

## Phase 4 — Power Features 🚀
- [x] Add global hotkey in Electron (Ctrl+Space)
- [x] Add native OS notifications in Electron
- [x] Replace volume SendKeys hack with pycaw (N/A - kept PowerShell to avoid C compilation issues)
- [x] Add code diff preview in coding_agent.py
