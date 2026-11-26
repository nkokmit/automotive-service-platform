@echo off
REM ============================================================================
REM  Automotive Service Platform - Startup Monitor & Control Script
REM ============================================================================
REM  This script helps you monitor and manage the backend & frontend services
REM ============================================================================

setlocal enabledelayedexpansion
color 0A

:menu
cls
echo.
echo  ========================================================================
echo   Automotive Service Platform - Startup Monitor
echo  ========================================================================
echo.
echo   Frontend Status: http://localhost:5174
echo   Backend Status: http://localhost:8761 (Eureka)
echo.
echo   Choose an option:
echo.
echo   1. Show Docker Container Status
echo   2. View Docker Logs (realtime)
echo   3. View Docker Logs (last 50 lines)
echo   4. Restart All Services
echo   5. Stop All Services
echo   6. View Service Health
echo   7. Open Frontend Browser
echo   8. Open Eureka Dashboard
echo   9. Open API Gateway
echo   0. Exit
echo.
set /p choice="Enter your choice (0-9): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto logs_realtime
if "%choice%"=="3" goto logs_tail
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto health
if "%choice%"=="7" goto frontend
if "%choice%"=="8" goto eureka
if "%choice%"=="9" goto gateway
if "%choice%"=="0" goto exit
goto menu

:status
cls
echo.
echo  ========== Docker Container Status ==========
echo.
docker-compose -f d:\automotive-service-platform\docker-compose.yml ps
echo.
pause
goto menu

:logs_realtime
cls
echo.
echo  ========== Docker Logs (Realtime) ==========
echo  (Press Ctrl+C to stop)
echo.
docker-compose -f d:\automotive-service-platform\docker-compose.yml logs -f
goto menu

:logs_tail
cls
echo.
echo  ========== Docker Logs (Last 50 Lines) ==========
echo.
docker-compose -f d:\automotive-service-platform\docker-compose.yml logs --tail=50
echo.
pause
goto menu

:restart
cls
echo.
echo  ========== Restarting All Services ==========
echo.
docker-compose -f d:\automotive-service-platform\docker-compose.yml restart
echo.
echo  Services restarted!
echo.
pause
goto menu

:stop
cls
echo.
echo  ========== Stopping All Services ==========
echo.
docker-compose -f d:\automotive-service-platform\docker-compose.yml stop
echo.
echo  Services stopped!
echo.
pause
goto menu

:health
cls
echo.
echo  ========== Service Health Check ==========
echo.
echo  Checking Discovery Server (8761)...
curl --silent --show-error http://localhost:8761/actuator/health 2>nul || echo  ERROR: Discovery Server not responding
echo.
echo  Checking API Gateway (8000)...
curl --silent --show-error http://localhost:8000/actuator/health 2>nul || echo  ERROR: API Gateway not responding
echo.
echo  Checking User Service (8081)...
curl --silent --show-error http://localhost:8081/actuator/health 2>nul || echo  ERROR: User Service not responding
echo.
pause
goto menu

:frontend
start http://localhost:5174
cls
echo.
echo  ========== Opened Frontend ==========
echo.
echo  Frontend should open in your default browser
echo  URL: http://localhost:5174
echo.
pause
goto menu

:eureka
start http://localhost:8761
cls
echo.
echo  ========== Opened Eureka Dashboard ==========
echo.
echo  Eureka should open in your default browser
echo  URL: http://localhost:8761
echo.
pause
goto menu

:gateway
start http://localhost:8000
cls
echo.
echo  ========== Opened API Gateway ==========
echo.
echo  API Gateway should open in your default browser
echo  URL: http://localhost:8000
echo.
pause
goto menu

:exit
cls
echo.
echo  Exiting...
echo.
exit /b 0
