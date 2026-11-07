# Test Runner Script
Write-Host "[*] Running TCT DeployForge Automated Tests..." -ForegroundColor Cyan

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

python -m pytest backend/tests -v
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[+] All backend tests passed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n[!] Some tests failed." -ForegroundColor Red
}
