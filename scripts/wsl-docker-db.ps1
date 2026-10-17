<#
.SYNOPSIS
    DeployForge - WSL Docker PostgreSQL Database Controller
.DESCRIPTION
    Manages the optimized PostgreSQL 16 container running in WSL Docker.
    Supports: up, down, status, logs, psql
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("up", "down", "restart", "status", "logs", "psql", "check")]
    [string]$Action = "up"
)

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

# Convert path for WSL
$wslPath = (wsl wslpath -u ($rootDir -replace '\\', '/')).Trim()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " DeployForge - WSL Docker PostgreSQL 16 Controller        " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Project Path (WSL): $wslPath" -ForegroundColor DarkGray
Write-Host ""

switch ($Action) {
    "up" {
        Write-Host "[*] Starting optimized PostgreSQL container via WSL Docker..." -ForegroundColor Yellow
        wsl -e bash -c "cd '$wslPath' && docker compose up -d postgres"

        Write-Host "[*] Waiting for container health check..." -ForegroundColor Yellow
        $healthy = $false
        for ($i = 0; $i -lt 15; $i++) {
            Start-Sleep -Seconds 1
            $status = (wsl docker inspect --format='{{json .State.Health.Status}}' deployforge_postgres 2>$null) -replace '"',''
            if ($status -eq "healthy") {
                $healthy = $true
                break
            }
            Write-Host "." -NoNewline -ForegroundColor DarkGray
        }
        Write-Host ""

        if ($healthy) {
            Write-Host "[+] PostgreSQL 16 is HEALTHY and listening on port 5433!" -ForegroundColor Green
            Write-Host "    Host:        localhost" -ForegroundColor White
            Write-Host "    Port:        5433" -ForegroundColor White
            Write-Host "    Database:    deployforge" -ForegroundColor White
            Write-Host "    User:        deployforge" -ForegroundColor White
            Write-Host "    Password:    deployforge_secret" -ForegroundColor White
            Write-Host "    Connection:  postgresql://deployforge:deployforge_secret@localhost:5433/deployforge" -ForegroundColor Cyan
        } else {
            Write-Host "[!] Container started, but healthcheck is still pending. Run: .\scripts\wsl-docker-db.ps1 status" -ForegroundColor Yellow
        }
    }

    "down" {
        Write-Host "[*] Stopping PostgreSQL container..." -ForegroundColor Yellow
        wsl -e bash -c "cd '$wslPath' && docker compose stop postgres"
        Write-Host "[+] Container stopped." -ForegroundColor Green
    }

    "restart" {
        Write-Host "[*] Restarting PostgreSQL container..." -ForegroundColor Yellow
        wsl -e bash -c "cd '$wslPath' && docker compose restart postgres"
        Write-Host "[+] Container restarted." -ForegroundColor Green
    }

    "status" {
        Write-Host "[*] Container Status:" -ForegroundColor Yellow
        wsl docker ps --filter "name=deployforge_postgres"
        Write-Host ""
        Write-Host "[*] Testing Python DB Driver connection..." -ForegroundColor Yellow
        $code = @'
import sys, os
sys.path.insert(0, os.path.abspath('backend'))
from app.db.session import check_db_health
import json
print(json.dumps(check_db_health(), indent=2))
'@
        $code | python
    }

    "logs" {
        wsl docker logs -f --tail=100 deployforge_postgres
    }

    "psql" {
        Write-Host "[*] Opening interactive psql shell..." -ForegroundColor Cyan
        wsl docker exec -it deployforge_postgres psql -U deployforge -d deployforge
    }

    "check" {
        $code = @'
import sys, os
sys.path.insert(0, os.path.abspath('backend'))
from app.db.session import check_db_health
res = check_db_health()
print(f"Status:     {res.get('status')}")
print(f"Latency:    {res.get('latency_ms')} ms")
print(f"DB Version: {res.get('database_version', 'N/A')}")
print(f"Pool Stats: {res.get('pool', {})}")
'@
        $code | python
    }
}
