# =============================================================
# scripts/run-all.ps1
# Chay toan bo he thong AI va Frontend tren Windows
# =============================================================

$PythonExe = "C:\code\vehicle-damage-detection-assessment\env\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python.exe"
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  KHOI DONG HE THONG AUTOMOTIVE PLATFORM (AI & UI)   " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Using Python: $PythonExe" -ForegroundColor Gray

# 1. Damage Detection Service (Port 8001)
Write-Host "[1/3] Khoi dong Damage Detection Service (Port 8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- DAMAGE DETECTION SERVICE (:8001) ---' -ForegroundColor Green; & '$PythonExe' -m uvicorn app.main:app --app-dir ai-services/damage-detection-service --port 8001 --reload"

# 2. Agent Service (Port 8002)
Write-Host "[2/3] Khoi dong AI Agent Service (Port 8002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- AI AGENT SERVICE (:8002) ---' -ForegroundColor Cyan; & '$PythonExe' -m uvicorn app.main:app --app-dir ai-services/agent-service --port 8002 --reload"

# 3. Frontend Vite React (Port 5173)
Write-Host "[3/3] Khoi dong Frontend React + Vite (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- FRONTEND REACT VITE (:5173) ---' -ForegroundColor Magenta; cd frontend; npm run dev"

Write-Host ""
Write-Host "Tat ca cac dich vu da duoc mo trong cua so rieng!" -ForegroundColor Yellow
Write-Host "  - Giao dien Web:     http://localhost:5173" -ForegroundColor White
Write-Host "  - Damage API Docs:   http://localhost:8001/docs" -ForegroundColor White
Write-Host "  - Agent API Docs:    http://localhost:8002/docs" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Cyan

