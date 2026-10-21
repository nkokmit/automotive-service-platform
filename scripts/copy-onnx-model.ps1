#!/usr/bin/env pwsh
# =============================================================
# copy-onnx-model.ps1
# Copies your yolov8s-seg.onnx into the Docker volume used by
# damage-detection-service.
#
# Usage:
#   .\scripts\copy-onnx-model.ps1 -ModelPath "C:\path\to\yolov8s-seg.onnx"
# =============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ModelPath
)

$ContainerName = "automotive-service-platform-damage-detection-service-1"
$TargetPath    = "/models/yolov8s-seg.onnx"

if (-not (Test-Path $ModelPath)) {
    Write-Error "Model not found at: $ModelPath"
    exit 1
}

Write-Host "Copying ONNX model to container..." -ForegroundColor Cyan
docker cp $ModelPath "${ContainerName}:${TargetPath}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Model copied successfully to $ContainerName:$TargetPath" -ForegroundColor Green
    Write-Host "Restarting damage-detection-service..." -ForegroundColor Yellow
    docker restart $ContainerName
} else {
    Write-Error "Failed to copy model. Is the container running?"
    Write-Host "Run first: docker compose up damage-detection-service -d"
}

