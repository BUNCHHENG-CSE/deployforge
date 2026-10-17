# Development launcher with hot reload
$rootDir = Split-Path -Parent $PSScriptRoot

Write-Host "[*] Starting Backend (port 8000) & Vite Frontend (port 3000)..." -ForegroundColor Cyan

# Start Backend in new process
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

# Start Vite in foreground
cd "$rootDir\frontend"
node node_modules/vite/bin/vite.js
