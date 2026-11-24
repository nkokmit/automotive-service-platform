# =============================================================
# scripts/run-local.ps1
# Run AI services locally on Windows without Docker
# =============================================================

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("damage", "agent", "both")]
    [string]$Service = "both"
)

$PythonExe = "C:\code\vehicle-damage-detection-assessment\env\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python.exe"
}

Write-Host "Using Python: $PythonExe" -ForegroundColor Cyan

if ($Service -eq "damage" -or $Service -eq "both") {
    Write-Host "[+] Starting Damage Detection Service on http://localhost:8001 ..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$PythonExe' -m uvicorn app.main:app --app-dir ai-services/damage-detection-service --port 8001 --reload"
}

if ($Service -eq "agent" -or $Service -eq "both") {
    Write-Host "[+] Starting AI Agent Service on http://localhost:8002 ..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$PythonExe' -m uvicorn app.main:app --app-dir ai-services/agent-service --port 8002 --reload"
}

Write-Host ""
Write-Host "Services launched!" -ForegroundColor Yellow
Write-Host "  - Damage Service Docs: http://localhost:8001/docs"
Write-Host "  - Agent Service Docs:  http://localhost:8002/docs"

