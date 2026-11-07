import os
import tempfile
from typing import List, Dict, Any, Optional
from app.core.packager import IntuneWinPackager
from app.services.storage import StorageManager, PACKAGES_DIR

CURATED_POWERSHELL_SCRIPTS: List[Dict[str, Any]] = [
    {
        "id": "ps-debloat-windows11",
        "name": "Debloat Windows 11 Enterprise",
        "category": "System Optimization",
        "publisher": "DeployForge IT Toolkit",
        "version": "1.4.0",
        "description": "Removes consumer bloatware, pre-installed promotional apps (Xbox, Clipchamp, Solitaire, TikTok), and disables Bing search in Start Menu.",
        "icon": "Trash2",
        "script": """<#
.SYNOPSIS
    Debloat Windows 11 Enterprise Image
.DESCRIPTION
    Removes consumer pre-installed UWP packages and disables consumer diagnostics.
#>
$ErrorActionPreference = 'SilentlyContinue'

$bloatware = @(
    "*Microsoft.BingNews*",
    "*Microsoft.BingWeather*",
    "*Microsoft.GamingApp*",
    "*Microsoft.GetHelp*",
    "*Microsoft.Getstarted*",
    "*Microsoft.MicrosoftSolitaireCollection*",
    "*Microsoft.Todos*",
    "*Microsoft.YourPhone*",
    "*Microsoft.Xbox*",
    "*Clipchamp.Clipchamp*"
)

Write-Output "[*] Removing consumer provisioned packages..."
foreach ($app in $bloatware) {
    Get-AppxPackage -Name $app -AllUsers | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
    Get-AppxProvisionedPackage -Online | Where-Object { $_.PackageName -like $app } | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue
}

# Disable Bing in Start Menu
$searchKey = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search"
if (!(Test-Path $searchKey)) { New-Item -Path $searchKey -Force | Out-Null }
Set-ItemProperty -Path $searchKey -Name "DisableWebSearch" -Value 1 -Type DWord -Force
Set-ItemProperty -Path $searchKey -Name "ConnectedSearchUseWeb" -Value 0 -Type DWord -Force

Write-Output "[+] Debloat complete. Creating DeployForge completion marker..."
$tagDir = "$env:ProgramData\\DeployForge\\Scripts"
if (!(Test-Path $tagDir)) { New-Item -Path $tagDir -ItemType Directory -Force | Out-Null }
Set-Content -Path "$tagDir\\ps-debloat-windows11.tag" -Value "Installed: $(Get-Date -Format 'o')" -Force
exit 0
""",
        "tag_file": "ps-debloat-windows11.tag"
    },
    {
        "id": "ps-configure-ntp-timesync",
        "name": "Configure Enterprise NTP & Time Sync",
        "category": "Fleet Hardening",
        "publisher": "DeployForge IT Toolkit",
        "version": "1.1.0",
        "description": "Configures Windows Time service (w32time) to synchronize with pool.ntp.org and sets automatic service startup.",
        "icon": "Clock",
        "script": """<#
.SYNOPSIS
    Configure NTP Time Synchronization
#>
$ErrorActionPreference = 'Stop'
Write-Output "[*] Configuring Windows Time Service..."

Set-Service -Name w32time -StartupType Automatic
Start-Service -Name w32time -ErrorAction SilentlyContinue

w32tm /config /syncfromflags:manual /manualpeerlist:"pool.ntp.org,0x8 time.windows.com,0x8" /reliable:yes /update
w32tm /resync /rediscover

Write-Output "[+] NTP configured successfully."
$tagDir = "$env:ProgramData\\DeployForge\\Scripts"
if (!(Test-Path $tagDir)) { New-Item -Path $tagDir -ItemType Directory -Force | Out-Null }
Set-Content -Path "$tagDir\\ps-configure-ntp-timesync.tag" -Value "Installed: $(Get-Date -Format 'o')" -Force
exit 0
""",
        "tag_file": "ps-configure-ntp-timesync.tag"
    },
    {
        "id": "ps-enable-rdp-nla",
        "name": "Enable Remote Desktop with NLA",
        "category": "Fleet Hardening",
        "publisher": "DeployForge IT Toolkit",
        "version": "1.2.0",
        "description": "Enables Windows Remote Desktop Protocol (RDP) requiring Network Level Authentication (NLA) and opens Windows Firewall rules.",
        "icon": "ShieldCheck",
        "script": """<#
.SYNOPSIS
    Enable RDP with Network Level Authentication
#>
$ErrorActionPreference = 'Stop'
Write-Output "[*] Enabling RDP and Network Level Authentication..."

# Enable Terminal Server
Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name "fDenyTSConnections" -Value 0 -Type DWord -Force

# Enable NLA (UserAuthentication = 1)
Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp' -Name "UserAuthentication" -Value 1 -Type DWord -Force

# Enable Windows Defender Firewall Rule for RDP
Enable-NetFirewallRule -DisplayGroup "Remote Desktop" -ErrorAction SilentlyContinue

Write-Output "[+] Remote Desktop secured and enabled."
$tagDir = "$env:ProgramData\\DeployForge\\Scripts"
if (!(Test-Path $tagDir)) { New-Item -Path $tagDir -ItemType Directory -Force | Out-Null }
Set-Content -Path "$tagDir\\ps-enable-rdp-nla.tag" -Value "Installed: $(Get-Date -Format 'o')" -Force
exit 0
""",
        "tag_file": "ps-enable-rdp-nla.tag"
    },
    {
        "id": "ps-install-winget-cli",
        "name": "Bootstrap WinGet & App Installer",
        "category": "Endpoint Management",
        "publisher": "DeployForge IT Toolkit",
        "version": "2.0.0",
        "description": "Bootstraps Microsoft.DesktopAppInstaller and prerequisites to ensure winget.exe CLI is available on all machines.",
        "icon": "Terminal",
        "script": """<#
.SYNOPSIS
    Install and Bootstrap Windows Package Manager (winget)
#>
$ErrorActionPreference = 'SilentlyContinue'
Write-Output "[*] Checking winget installation..."

$winget = Get-Command "winget.exe" -ErrorAction SilentlyContinue
if (-not $winget) {
    Write-Output "[*] Installing VCLibs and UI.Xaml prerequisites..."
    $vcLibsUrl = "https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx"
    $xamlUrl = "https://github.com/microsoft/microsoft-ui-xaml/releases/download/v2.8.6/Microsoft.UI.Xaml.2.8.x64.appx"
    $wingetUrl = "https://github.com/microsoft/winget-cli/releases/latest/download/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle"

    $tmp = "$env:TEMP\\winget_bootstrap"
    New-Item -Path $tmp -ItemType Directory -Force | Out-Null

    Invoke-WebRequest -Uri $vcLibsUrl -OutFile "$tmp\\vclibs.appx"
    Add-AppxPackage -Path "$tmp\\vclibs.appx"

    Invoke-WebRequest -Uri $xamlUrl -OutFile "$tmp\\xaml.appx"
    Add-AppxPackage -Path "$tmp\\xaml.appx"

    Invoke-WebRequest -Uri $wingetUrl -OutFile "$tmp\\winget.msixbundle"
    Add-AppxPackage -Path "$tmp\\winget.msixbundle"

    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

Write-Output "[+] WinGet setup completed."
$tagDir = "$env:ProgramData\\DeployForge\\Scripts"
if (!(Test-Path $tagDir)) { New-Item -Path $tagDir -ItemType Directory -Force | Out-Null }
Set-Content -Path "$tagDir\\ps-install-winget-cli.tag" -Value "Installed: $(Get-Date -Format 'o')" -Force
exit 0
""",
        "tag_file": "ps-install-winget-cli.tag"
    },
    {
        "id": "ps-clear-caches-temp",
        "name": "Clear Windows Caches & Temp Junk",
        "category": "System Maintenance",
        "publisher": "DeployForge IT Toolkit",
        "version": "1.0.5",
        "description": "Purges Windows Temp, SoftwareDistribution download cache, and crash dumps to free up SSD storage.",
        "icon": "Sparkles",
        "script": """<#
.SYNOPSIS
    Clear Temp and SoftwareDistribution Cache
#>
Write-Output "[*] Cleaning temporary directories..."
$dirs = @("$env:WINDIR\\Temp", "$env:TEMP", "$env:WINDIR\\SoftwareDistribution\\Download")

foreach ($d in $dirs) {
    if (Test-Path $d) {
        Get-ChildItem -Path $d -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Output "[+] Cleaned up temporary caches."
$tagDir = "$env:ProgramData\\DeployForge\\Scripts"
if (!(Test-Path $tagDir)) { New-Item -Path $tagDir -ItemType Directory -Force | Out-Null }
Set-Content -Path "$tagDir\\ps-clear-caches-temp.tag" -Value "Installed: $(Get-Date -Format 'o')" -Force
exit 0
""",
        "tag_file": "ps-clear-caches-temp.tag"
    }
]

class ScriptPackager:
    """
    Packages standalone or curated PowerShell scripts into Microsoft Intune-compliant Win32 (.intunewin) packages.
    """

    @classmethod
    def list_curated_scripts(cls) -> List[Dict[str, Any]]:
        return CURATED_POWERSHELL_SCRIPTS

    @classmethod
    def get_curated_script(cls, script_id: str) -> Optional[Dict[str, Any]]:
        for s in CURATED_POWERSHELL_SCRIPTS:
            if s["id"] == script_id:
                return s
        return None

    @classmethod
    def package_script(
        cls,
        script_id: str,
        script_name: str,
        script_content: str,
        version: str = "1.0.0"
    ) -> Dict[str, Any]:
        """
        Creates an execution wrapper around the PowerShell script,
        generates an encrypted .intunewin package, and prepares Intune detection rules.
        """
        tag_filename = f"{script_id}.tag"
        clean_name = script_name.replace(" ", "_").replace("(", "").replace(")", "")
        out_intunewin_name = f"Script_{clean_name}_{version}.intunewin"
        out_intunewin_path = StorageManager.get_package_path(out_intunewin_name)

        with tempfile.TemporaryDirectory() as temp_dir:
            # 1. Write the PowerShell script
            ps1_path = os.path.join(temp_dir, "deploy_script.ps1")
            with open(ps1_path, "w", encoding="utf-8") as f:
                f.write(script_content)

            # 2. Write a batch runner wrapper for reliable execution from 32/64 bit system context
            cmd_path = os.path.join(temp_dir, "run.cmd")
            with open(cmd_path, "w", encoding="utf-8") as f:
                f.write(
                    "@echo off\r\n"
                    "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe "
                    "-NoProfile -ExecutionPolicy Bypass -File deploy_script.ps1\r\n"
                    "exit /b %ERRORLEVEL%\r\n"
                )

            # 3. Package into .intunewin
            meta = IntuneWinPackager.package_file(
                input_file_path=cmd_path,
                output_intunewin_path=out_intunewin_path,
                setup_file_name="run.cmd"
            )

        # 4. Standard detection rule looking for tag file in %ProgramData%\DeployForge\Scripts\
        detection_rule = {
            "type": "file",
            "path": "%ProgramData%\\DeployForge\\Scripts",
            "fileOrFolderName": tag_filename,
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }

        return {
            "intunewin_filename": out_intunewin_name,
            "intunewin_path": out_intunewin_path,
            "meta": meta,
            "install_command": "run.cmd",
            "uninstall_command": f'powershell.exe -Command "Remove-Item -Force $env:ProgramData\\DeployForge\\Scripts\\{tag_filename}"',
            "detection_rule": detection_rule
        }
