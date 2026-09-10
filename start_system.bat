@echo off
title Autonomous Warehouse AI - System Launcher
echo ========================================================
echo       AUTONOMOUS WAREHOUSE AI SYSTEM LAUNCHER
echo ========================================================
echo.
echo [1/3] Starting FastAPI ML & Simulation Backend on port 8000...
start "Warehouse Backend (Port 8000)" cmd /k "cd /d %~dp0 && .\venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo [2/3] Starting React Dashboard Frontend on port 5173...
start "Warehouse Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo [3/3] Waiting for services to initialize...
timeout /t 5 /nobreak > nul

echo Opening default browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ========================================================
echo System is running successfully!
echo - Backend API:  http://127.0.0.1:8000
echo - API Docs:     http://127.0.0.1:8000/docs
echo - Frontend UI:  http://localhost:5173
echo ========================================================

