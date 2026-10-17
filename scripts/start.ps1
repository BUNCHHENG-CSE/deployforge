# DeployForge - 1-Click Startup Script
$Host.UI.RawUI.WindowTitle = "DeployForge - Intune One-Click Deploy Tool"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  DeployForge - Intune One-Click App Deploy Platform      " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Python is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Node.js is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Ensure frontend build exists
$distFolder = Join-Path $rootDir "frontend\dist"
if (-not (Test-Path $distFolder)) {
    Write-Host "[*] Building frontend assets..." -ForegroundColor Yellow
    Set-Location (Join-Path $rootDir "frontend")
    node node_modules/vite/bin/vite.js build
    Set-Location $rootDir
}

# Ensure WSL Docker PostgreSQL is running
$dbCheck = (wsl docker inspect --format='{{json .State.Health.Status}}' deployforge_postgres 2>$null) -replace '"',''
if ($dbCheck -ne "healthy") {
    Write-Host "[*] Initializing optimized PostgreSQL in WSL Docker..." -ForegroundColor Yellow
    & "$PSScriptRoot\wsl-docker-db.ps1" up
} else {
    Write-Host "[+] PostgreSQL 16 container is healthy." -ForegroundColor Green
}

Write-Host "[+] Starting DeployForge Unified Engine..." -ForegroundColor Green
Write-Host "    Web Interface: http://localhost:8000" -ForegroundColor Cyan
Write-Host "    API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "    Database Status:   http://localhost:8000/api/db/health" -ForegroundColor Cyan
Write-Host ""

# Launch browser automatically
Start-Process "http://localhost:8000"

# Start uvicorn
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
