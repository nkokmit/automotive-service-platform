#!/usr/bin/env pwsh
# ============================================================================
#  Automotive Service Platform - Startup Monitor & Control Script (PowerShell)
# ============================================================================
#  This script helps you monitor and manage the backend & frontend services
# ============================================================================

$projectRoot = "d:\automotive-service-platform"

function Show-Menu {
    Clear-Host
    Write-Host ""
    Write-Host "  ========================================================================" -ForegroundColor Cyan
    Write-Host "   Automotive Service Platform - Startup Monitor" -ForegroundColor Cyan
    Write-Host "  ========================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Frontend Status: http://localhost:5174" -ForegroundColor Green
    Write-Host "   Backend Status: http://localhost:8761 (Eureka)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Choose an option:" -ForegroundColor White
    Write-Host ""
    Write-Host "   1. Show Docker Container Status" -ForegroundColor Gray
    Write-Host "   2. View Docker Logs (realtime)" -ForegroundColor Gray
    Write-Host "   3. View Docker Logs (last 50 lines)" -ForegroundColor Gray
    Write-Host "   4. Restart All Services" -ForegroundColor Gray
    Write-Host "   5. Stop All Services" -ForegroundColor Gray
    Write-Host "   6. View Service Health" -ForegroundColor Gray
    Write-Host "   7. Open Frontend Browser" -ForegroundColor Gray
    Write-Host "   8. Open Eureka Dashboard" -ForegroundColor Gray
    Write-Host "   9. Open API Gateway" -ForegroundColor Gray
    Write-Host "   0. Exit" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (0-9)"
    return $choice
}

function Show-Status {
    Clear-Host
    Write-Host ""
    Write-Host "  ========== Docker Container Status ==========" -ForegroundColor Cyan
    Write-Host ""
    
    & docker-compose -f "$projectRoot\docker-compose.yml" ps
    
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Show-Logs-Realtime {
    Clear-Host
    Write-Host ""
    Write-Host "  ========== Docker Logs (Realtime) ==========" -ForegroundColor Cyan
    Write-Host "  (Press Ctrl+C to stop)" -ForegroundColor Yellow
    Write-Host ""
    
    & docker-compose -f "$projectRoot\docker-compose.yml" logs -f
}

function Show-Logs-Tail {
    Clear-Host
    Write-Host ""
    Write-Host "  ========== Docker Logs (Last 50 Lines) ==========" -ForegroundColor Cyan
    Write-Host ""
    
    & docker-compose -f "$projectRoot\docker-compose.yml" logs --tail=50
    
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Restart-Services {
    Clear-Host
    Write-Host ""
    Write-Host "  ========== Restarting All Services ==========" -ForegroundColor Cyan
    Write-Host ""
    
    & docker-compose -f "$projectRoot\docker-compose.yml" restart
    
    Write-Host ""
    Write-Host "  Services restarted!" -ForegroundColor Green
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Stop-Services {
    Clear-Host
    Write-Host ""
    Write-Host "  ========== Stopping All Services ==========" -ForegroundColor Yellow
    Write-Host ""
    
    & docker-compose -f "$projectRoot\docker-compose.yml" stop
    
    Write-Host ""
    Write-Host "  Services stopped!" -ForegroundColor Green
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Check-Health {
    Clear-Host
    Write-Host ""
    Write-Host "  ========== Service Health Check ==========" -ForegroundColor Cyan
    Write-Host ""
    
    # Discovery Server
    Write-Host "  Checking Discovery Server (8761)..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8761/actuator/health" -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ Discovery Server: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ❌ Discovery Server: NOT RESPONDING" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # API Gateway
    Write-Host "  Checking API Gateway (8000)..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/actuator/health" -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ API Gateway: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ❌ API Gateway: NOT RESPONDING" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # User Service
    Write-Host "  Checking User Service (8081)..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8081/actuator/health" -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ User Service: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ❌ User Service: NOT RESPONDING" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Frontend
    Write-Host "  Checking Frontend (5174)..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5174" -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ Frontend: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ❌ Frontend: NOT RESPONDING" -ForegroundColor Red
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Open-Frontend {
    Clear-Host
    Write-Host ""
    Write-Host "  ========== Opened Frontend ==========" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Frontend should open in your default browser" -ForegroundColor Gray
    Write-Host "  URL: http://localhost:5174" -ForegroundColor Cyan
    Write-Host ""
    
    Start-Process "http://localhost:5174"
    Read-Host "Press Enter to continue"
}

function Open-Eureka {
    Clear-Host
    Write-Host ""
    Write-Host "  ========== Opened Eureka Dashboard ==========" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Eureka should open in your default browser" -ForegroundColor Gray
    Write-Host "  URL: http://localhost:8761" -ForegroundColor Cyan
    Write-Host ""
    
    Start-Process "http://localhost:8761"
    Read-Host "Press Enter to continue"
}

function Open-Gateway {
    Clear-Host
    Write-Host ""
    Write-Host "  ========== Opened API Gateway ==========" -ForegroundColor Green
    Write-Host ""
    Write-Host "  API Gateway should open in your default browser" -ForegroundColor Gray
    Write-Host "  URL: http://localhost:8000" -ForegroundColor Cyan
    Write-Host ""
    
    Start-Process "http://localhost:8000"
    Read-Host "Press Enter to continue"
}

# Main loop
while ($true) {
    $choice = Show-Menu
    
    switch ($choice) {
        "1" { Show-Status }
        "2" { Show-Logs-Realtime }
        "3" { Show-Logs-Tail }
        "4" { Restart-Services }
        "5" { Stop-Services }
        "6" { Check-Health }
        "7" { Open-Frontend }
        "8" { Open-Eureka }
        "9" { Open-Gateway }
        "0" { exit }
        default { 
            Write-Host "Invalid choice. Please try again." -ForegroundColor Red
            Start-Sleep -Seconds 2
        }
    }
}
