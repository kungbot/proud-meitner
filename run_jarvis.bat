@echo off
title JARVIS AI - Startup Automator
echo ===================================================
echo   JARVIS AI Assistant - Starting Setup & Launch
echo ===================================================

echo.
echo [1/4] Installing Python dependencies...
python -m pip install -r "ai assistant/backend/requirements.txt"
if %ERRORLEVEL% neq 0 (
    echo Python dependency installation failed. Please check your python settings.
)

echo.
echo [2/4] Generating tray icon...
python "ai assistant/electron/generate_icon.py"

echo.
echo [3/4] Installing Node.js frontend dependencies...
cd "ai assistant/frontend"
call npm install
if %ERRORLEVEL% neq 0 (
    echo Frontend npm install failed.
)

echo.
echo [4/4] Installing Electron wrapper dependencies...
cd "../electron"
call npm install
if %ERRORLEVEL% neq 0 (
    echo Electron npm install failed.
)

echo.
echo ===================================================
echo   All systems configured. Launching background servers...
echo ===================================================
echo Starting FastAPI Backend (Port 8000)...
cd ".."
start /B cmd /c "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo Starting Next.js Dev Server (Port 3000)...
cd "frontend"
start /B cmd /c "npm run dev"

echo Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

echo Launching Electron desktop shell...
cd "../electron"
call npm start

echo.
echo JARVIS is shutting down.
pause
