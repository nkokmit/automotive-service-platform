#Requires -Version 5.1
<#
.SYNOPSIS
    Build, chay Gateway va verify san sang.
.EXAMPLE
    .\test-gateway.ps1
#>

$ErrorActionPreference = "Stop"
$projectRoot = "d:\automotive-service-platform"
$gatewayDir  = "$projectRoot\gateway"
$jarFile     = "$gatewayDir\target\gateway.jar"
$port        = 4000

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gateway Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# [0/4] Kill java cu
Write-Host "[0/4] Don dep process java cu (neu co)..." -ForegroundColor Yellow
$existing = Get-Process -Name java -ErrorAction SilentlyContinue
if ($existing) {
    $existing | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Da kill $($existing.Count) process java" -ForegroundColor Green
} else {
    Write-Host "  [OK] Khong co process java nao" -ForegroundColor Green
}

# [1/4] Build
Write-Host ""
Write-Host "[1/4] Build Gateway..." -ForegroundColor Yellow
Push-Location $gatewayDir
try {
    mvn -q -DskipTests package
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Build FAILED" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Build success" -ForegroundColor Green
} finally {
    Pop-Location
}

if (-not (Test-Path $jarFile)) {
    Write-Host "  [FAIL] Khong tim thay $jarFile" -ForegroundColor Red
    exit 1
}

# [2/4] Chay Gateway
Write-Host ""
Write-Host "[2/4] Khoi dong Gateway (dev mode)..." -ForegroundColor Yellow
$env:SPRING_PROFILES_ACTIVE = "dev"
$proc = Start-Process -FilePath "java" `
                      -ArgumentList "-jar", $jarFile `
                      -RedirectStandardOutput "$gatewayDir\gateway.log" `
                      -RedirectStandardError "$gatewayDir\gateway.err.log" `
                      -PassThru -NoNewWindow

Write-Host "  -> Gateway PID: $($proc.Id)" -ForegroundColor Gray
Write-Host "  -> Log file:    $gatewayDir\gateway.log" -ForegroundColor Gray
Write-Host "  -> Doi Gateway san sang (toi da 60s)..." -ForegroundColor Gray

# [3/4] Doi san sang
$maxWait = 60
$elapsed = 0
$ready = $false
while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/healthz" `
                                      -UseBasicParsing `
                                      -TimeoutSec 5 `
                                      -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        # chua san sang
    }
    Write-Host "    ...${elapsed}s" -ForegroundColor DarkGray
}

if (-not $ready) {
    Write-Host ""
    Write-Host "  [FAIL] Gateway KHONG san sang sau ${maxWait}s" -ForegroundColor Red
    Write-Host "  Xem log: $gatewayDir\gateway.err.log" -ForegroundColor Red
    Write-Host ""
    Write-Host "----- Last 30 log lines -----" -ForegroundColor Gray
    if (Test-Path "$gatewayDir\gateway.log") {
        Get-Content "$gatewayDir\gateway.log" -Tail 30
    }
    exit 1
}

# [4/4] Verify day du
Write-Host ""
Write-Host "[3/4] Verify Gateway..." -ForegroundColor Yellow
Write-Host ""

function Test-Endpoint {
    param([string]$Name, [string]$Url, [int]$ExpectedStatus = 200)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $actual = [int]$r.StatusCode
        if ($actual -eq $ExpectedStatus) {
            Write-Host "  [OK]   $Name -> HTTP $actual" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] $Name -> HTTP $actual (expected $ExpectedStatus)" -ForegroundColor Yellow
        }
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        if ($code -eq $ExpectedStatus) {
            Write-Host "  [OK]   $Name -> HTTP $code" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] $Name -> HTTP $code (expected $ExpectedStatus)" -ForegroundColor Yellow
        }
    }
}

Test-Endpoint "Health check       "  "http://localhost:$port/healthz"           200
Test-Endpoint "Swagger UI HTML   "  "http://localhost:$port/swagger-ui.html"  200
Test-Endpoint "OpenAPI JSON      "  "http://localhost:$port/v3/api-docs"      200
Test-Endpoint "Route -> services "  "http://localhost:$port/api/v1/services"  500
Test-Endpoint "Route -> garages  "  "http://localhost:$port/api/v1/garages"   500
Test-Endpoint "Route -> users    "  "http://localhost:$port/api/v1/users/me"  500

Write-Host ""
Write-Host "[4/4] Thong tin health..." -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri "http://localhost:$port/healthz" -UseBasicParsing | ConvertFrom-Json
Write-Host ""
Write-Host "  Status:    $($health.status)" -ForegroundColor Cyan
Write-Host "  Gateway:   $($health.gateway)" -ForegroundColor Cyan
Write-Host "  Timestamp: $($health.timestamp)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Upstreams configured:" -ForegroundColor Cyan
$health.upstreams.PSObject.Properties | ForEach-Object {
    Write-Host "    - $($_.Name): $($_.Value)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Gateway DA SAN SANG!" -ForegroundColor Green
Write-Host "  Swagger UI:  http://localhost:$port/swagger-ui.html" -ForegroundColor Green
Write-Host "  Health:      http://localhost:$port/healthz" -ForegroundColor Green
Write-Host "  PID:         $($proc.Id)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "De dung Gateway: Stop-Process -Id $($proc.Id)" -ForegroundColor Yellow
Write-Host "Xem log realtime: Get-Content '$gatewayDir\gateway.log' -Wait" -ForegroundColor Yellow
Write-Host ""
