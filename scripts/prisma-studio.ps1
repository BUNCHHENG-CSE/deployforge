# ====================================================================
# TCT DeployForge - Visual Database Inspector (Prisma Studio)
# Works with both SQLite (Local) and PostgreSQL (Neon / Production)
# Launches Prisma Studio on http://localhost:5555
# ====================================================================

param(
    [switch]$Postgres,
    [switch]$Sqlite,
    [int]$Port = 5555
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   TCT DeployForge - Visual Database Inspector (Prisma Studio)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location $projectRoot

if ($Sqlite) {
    $env:DB_TYPE = "sqlite"
} elseif ($Postgres) {
    $env:DB_TYPE = "postgresql"
}

Write-Host "[*] Synchronizing active schema..." -ForegroundColor Yellow
bun run db:prepare

Write-Host "[+] Launching Prisma Studio..." -ForegroundColor Green
Write-Host "    URL: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "    Press Ctrl+C to terminate." -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:$Port"
bunx prisma studio --port $Port
