# TCT DeployForge - 1-Click Startup Script (Next.js Full Stack + Bun)
param(
    [switch]$Prod,
    [switch]$Postgres,
    [switch]$Sqlite,
    [int]$Port = 3000
)

$Host.UI.RawUI.WindowTitle = "TCT DeployForge - Intune Next.js Full Stack Platform"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TCT DeployForge - Next.js Full Stack App Deploy Platform    " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

# Check Bun
$hasBun = Get-Command bun -ErrorAction SilentlyContinue
if (-not $hasBun) {
    Write-Host "[!] Bun runtime is not found in PATH." -ForegroundColor Red
    Write-Host "    Install Bun from https://bun.sh/ or run with Node.js." -ForegroundColor Yellow
    exit 1
}

# Determine database engine from params or .env
$envFile = Join-Path $rootDir ".env"
$dbType = "sqlite" # Default for local dev
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $dbTypeLine = $envContent | Where-Object { $_ -match "^DB_TYPE\s*=\s*(.+)$" }
    if ($dbTypeLine) {
        $dbType = ($dbTypeLine -split "=")[1].Trim().ToLower()
    }
}

if ($Sqlite) {
    $env:DB_TYPE = "sqlite"
    $dbType = "sqlite"
} elseif ($Postgres) {
    $env:DB_TYPE = "postgresql"
    $dbType = "postgresql"
}

if ($dbType -eq "postgresql") {
    Write-Host "[*] Database Mode: PostgreSQL (Neon / Production)" -ForegroundColor Cyan
} else {
    Write-Host "[+] Database Mode: Local SQLite (Zero-Dependency)" -ForegroundColor Green
    Write-Host "    File: deployforge.db" -ForegroundColor Gray
}

# Prepare Database Schema & Prisma Client
Write-Host "[*] Synchronizing Prisma ORM schema & Client..." -ForegroundColor Yellow
bun run db:prepare

Write-Host "`n[+] Starting TCT DeployForge Next.js All-in-One Engine..." -ForegroundColor Green
Write-Host "    Web Interface:     http://localhost:$Port" -ForegroundColor Cyan
Write-Host "    Database Status:   http://localhost:$Port/api/db/health" -ForegroundColor Cyan
Write-Host "    Prisma Status:     http://localhost:$Port/api/prisma/health" -ForegroundColor Cyan
Write-Host "    Database GUI:      bun run db:studio (http://localhost:5555)" -ForegroundColor Cyan
Write-Host ""

# Launch browser automatically
Start-Process "http://localhost:$Port"

if ($Prod) {
    Write-Host "[*] Building and starting production server..." -ForegroundColor Yellow
    bun run build
    bunx next start -p $Port
} else {
    bunx next dev -p $Port
}
