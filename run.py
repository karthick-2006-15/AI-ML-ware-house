"""
Autonomous Warehouse AI - Cross-Platform Master Launcher
Starts:
  1. FastAPI Backend on http://127.0.0.1:8000
  2. Vite React Frontend on http://localhost:5173
Opens the browser automatically and handles graceful shutdown.
"""
import os
import sys
import time
import subprocess
import webbrowser
import urllib.request

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_EXE = os.path.join(ROOT_DIR, "venv", "Scripts", "python.exe") if os.path.exists(os.path.join(ROOT_DIR, "venv", "Scripts", "python.exe")) else sys.executable

def check_service(url, timeout=2):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.status == 200
    except Exception:
        return False

def main():
    print("========================================================")
    print("      AUTONOMOUS WAREHOUSE AI - SYSTEM LAUNCHER         ")
    print("========================================================")
    
    print("[1/3] Starting FastAPI Backend (Port 8000)...")
    backend_proc = subprocess.Popen(
        [PYTHON_EXE, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=ROOT_DIR
    )
    
    print("[2/3] Starting React Dashboard Frontend (Port 5173)...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=os.path.join(ROOT_DIR, "frontend")
    )
    
    print("[3/3] Waiting for services to initialize...")
    for _ in range(20):
        time.sleep(1)
        if check_service("http://127.0.0.1:8000/api/ml/status") and check_service("http://localhost:5173"):
            break
            
    print("\n" + "="*56)
    print("  System is ONLINE and fully operational!")
    print("  - Frontend UI:  http://localhost:5173")
    print("  - Backend API:  http://127.0.0.1:8000")
    print("  - Swagger Docs: http://127.0.0.1:8000/docs")
    print("  Press Ctrl+C to stop all services.")
    print("="*56 + "\n")
    
    webbrowser.open("http://localhost:5173")
    
    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()

