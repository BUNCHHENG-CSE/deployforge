import re
import httpx
from typing import List, Dict, Any, Optional

# Curated fallback/cache of popular WinGet enterprise packages
WINGET_PACKAGES_CACHE: List[Dict[str, Any]] = [
    {
        "id": "SlackTechnologies.Slack",
        "name": "Slack",
        "publisher": "Slack Technologies, LLC",
        "category": "Communication",
        "version": "4.39.213",
        "architecture": "x64",
        "icon": "https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png",
        "description": "Slack is a messaging app for business that connects people to the information that they need.",
        "download_url": "https://downloads.slack-edge.com/desktop-releases/windows/x64/4.39.213/SlackSetup.msi",
        "filename": "SlackSetup.msi",
        "install_command": "msiexec /i SlackSetup.msi /qn /norestart ALLUSERS=1",
        "uninstall_command": "msiexec /x SlackSetup.msi /qn /norestart",
        "install_behavior": "system",
        "detection_rule": {
            "type": "registry",
            "keyPath": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{SlackMSI}",
            "valueName": "DisplayVersion",
            "detectionValue": "4.39.213"
        }
    },
    {
        "id": "Docker.DockerDesktop",
        "name": "Docker Desktop",
        "publisher": "Docker Inc.",
        "category": "Developer Tools",
        "version": "4.34.2",
        "architecture": "x64",
        "icon": "https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png",
        "description": "Docker Desktop is an easy-to-install application that enables you to build and share containerized applications.",
        "download_url": "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe",
        "filename": "Docker_Desktop_Installer.exe",
        "install_command": '"Docker_Desktop_Installer.exe" install --quiet --accept-license',
        "uninstall_command": '"Docker_Desktop_Installer.exe" uninstall --quiet',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Docker\\Docker",
            "fileOrFolderName": "Docker Desktop.exe",
            "detectionType": "exists"
        }
    },
    {
        "id": "Postman.Postman",
        "name": "Postman",
        "publisher": "Postman Inc.",
        "category": "Developer Tools",
        "version": "11.14.0",
        "architecture": "x64",
        "icon": "https://www.postman.com/_ar-assets/images/favicon-1-32x32.png",
        "description": "Postman is an API platform for developers to design, build, test, and iterate their APIs.",
        "download_url": "https://dl.pstmn.io/download/latest/win64",
        "filename": "Postman-win64-setup.exe",
        "install_command": '"Postman-win64-setup.exe" --silent',
        "uninstall_command": '"Postman-win64-setup.exe" --uninstall --silent',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%LocalAppData%\\Postman",
            "fileOrFolderName": "Postman.exe",
            "detectionType": "exists"
        }
    },
    {
        "id": "Hashicorp.Terraform",
        "name": "Terraform",
        "publisher": "HashiCorp",
        "category": "Cloud & DevOps",
        "version": "1.9.8",
        "architecture": "x64",
        "icon": "https://www.datocms-assets.com/2885/1620155116-brandhcterraformprimarysymbolcolor.svg",
        "description": "Terraform is an open-source infrastructure as code software tool created by HashiCorp.",
        "download_url": "https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_windows_amd64.zip",
        "filename": "terraform.exe",
        "install_command": 'powershell.exe -Command "Expand-Archive terraform.zip -DestinationPath C:\\ProgramData\\Terraform; [Environment]::SetEnvironmentVariable(\'Path\', $env:Path + \';C:\\ProgramData\\Terraform\', [EnvironmentVariableTarget]::Machine)"',
        "uninstall_command": 'powershell.exe -Command "Remove-Item -Recurse -Force C:\\ProgramData\\Terraform"',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "C:\\ProgramData\\Terraform",
            "fileOrFolderName": "terraform.exe",
            "detectionType": "exists"
        }
    },
    {
        "id": "Notion.Notion",
        "name": "Notion",
        "publisher": "Notion Labs, Incorporated",
        "category": "Productivity",
        "version": "3.12.0",
        "architecture": "x64",
        "icon": "https://www.notion.so/front-static/logo-ios.png",
        "description": "A new tool that blends your everyday work apps into one. It's the all-in-one workspace for notes, tasks, wikis, and databases.",
        "download_url": "https://desktop-release.notion-static.com/Notion%20Setup%203.12.0.exe",
        "filename": "NotionSetup.exe",
        "install_command": '"NotionSetup.exe" /S',
        "uninstall_command": '"%LocalAppData%\\Programs\\Notion\\Uninstall Notion.exe" /S',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Notion",
            "fileOrFolderName": "Notion.exe",
            "detectionType": "exists"
        }
    },
    {
        "id": "VideoLAN.VLC",
        "name": "VLC Media Player",
        "publisher": "VideoLAN",
        "category": "Multimedia",
        "version": "3.0.21",
        "architecture": "x64",
        "icon": "https://images.videolan.org/images/icons-VLC/vlc.mini.svg",
        "description": "VLC is a free and open source cross-platform multimedia player and framework that plays most multimedia files.",
        "download_url": "https://get.videolan.org/vlc/3.0.21/win64/vlc-3.0.21-win64.exe",
        "filename": "vlc-3.0.21-win64.exe",
        "install_command": '"vlc-3.0.21-win64.exe" /L=1033 /S',
        "uninstall_command": '"%ProgramFiles%\\VideoLAN\\VLC\\uninstall.exe" /S',
        "install_behavior": "system",
        "detection_rule": {
            "type": "registry",
            "keyPath": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VLC media player",
            "valueName": "DisplayVersion",
            "detectionValue": "3.0.21"
        }
    },
    {
        "id": "Discord.Discord",
        "name": "Discord",
        "publisher": "Discord Inc.",
        "category": "Communication",
        "version": "1.0.9166",
        "architecture": "x64",
        "icon": "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
        "description": "Voice, video and text chat app used by tens of millions of people to talk and hang out with their communities and friends.",
        "download_url": "https://discord.com/api/download?platform=win",
        "filename": "DiscordSetup.exe",
        "install_command": '"DiscordSetup.exe" -s',
        "uninstall_command": '"%LocalAppData%\\Discord\\Update.exe" --uninstall -s',
        "install_behavior": "user",
        "detection_rule": {
            "type": "file",
            "path": "%LocalAppData%\\Discord",
            "fileOrFolderName": "Update.exe",
            "detectionType": "exists"
        }
    },
    {
        "id": "BlenderFoundation.Blender",
        "name": "Blender 3D",
        "publisher": "Blender Foundation",
        "category": "Graphics & Design",
        "version": "4.2.3",
        "architecture": "x64",
        "icon": "https://download.blender.org/branding/blender_logo_socket.png",
        "description": "Blender is the free and open source 3D creation suite supporting modeling, rigging, animation, simulation, rendering, and compositing.",
        "download_url": "https://download.blender.org/release/Blender4.2/blender-4.2.3-windows-x64.msi",
        "filename": "blender-4.2.3-windows-x64.msi",
        "install_command": 'msiexec /i blender-4.2.3-windows-x64.msi /qn /norestart',
        "uninstall_command": 'msiexec /x blender-4.2.3-windows-x64.msi /qn /norestart',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Blender Foundation\\Blender 4.2",
            "fileOrFolderName": "blender.exe",
            "detectionType": "exists"
        }
    },
    {
        "id": "Bitwarden.Bitwarden",
        "name": "Bitwarden",
        "publisher": "Bitwarden Inc.",
        "category": "Security",
        "version": "2024.10.0",
        "architecture": "x64",
        "icon": "https://bitwarden.com/images/icon_desktop.png",
        "description": "Open source password management solution for individuals, teams, and business organizations.",
        "download_url": "https://vault.bitwarden.com/download/?app=desktop&platform=windows",
        "filename": "Bitwarden-Installer.exe",
        "install_command": '"Bitwarden-Installer.exe" /S /allusers',
        "uninstall_command": '"%ProgramFiles%\\Bitwarden\\Uninstall Bitwarden.exe" /S',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Bitwarden",
            "fileOrFolderName": "Bitwarden.exe",
            "detectionType": "exists"
        }
    },
    {
        "id": "WiresharkFoundation.Wireshark",
        "name": "Wireshark Network Analyzer",
        "publisher": "Wireshark Foundation",
        "category": "IT Admin & SecOps",
        "version": "4.4.1",
        "architecture": "x64",
        "icon": "https://www.wireshark.org/assets/images/wireshark-fin.png",
        "description": "The world's foremost and widely-used network protocol analyzer for network troubleshooting, analysis, and protocol development.",
        "download_url": "https://1.na.dl.wireshark.org/win64/Wireshark-4.4.1-x64.exe",
        "filename": "Wireshark-4.4.1-x64.exe",
        "install_command": '"Wireshark-4.4.1-x64.exe" /S /desktopicon=yes',
        "uninstall_command": '"%ProgramFiles%\\Wireshark\\uninstall.exe" /S',
        "install_behavior": "system",
        "detection_rule": {
            "type": "registry",
            "keyPath": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Wireshark",
            "valueName": "DisplayVersion",
            "detectionValue": "4.4.1"
        }
    },
    {
        "id": "dbeaver.dbeaver",
        "name": "DBeaver Community",
        "publisher": "DBeaver Corp",
        "category": "Developer Tools",
        "version": "24.2.3",
        "architecture": "x64",
        "icon": "https://dbeaver.io/wp-content/uploads/2015/09/beaver-head.png",
        "description": "Free multi-platform database tool for developers, database administrators, and analysts supporting SQL databases.",
        "download_url": "https://github.com/dbeaver/dbeaver/releases/download/24.2.3/dbeaver-ce-24.2.3-x86_64-setup.exe",
        "filename": "dbeaver-ce-24.2.3-x86_64-setup.exe",
        "install_command": '"dbeaver-ce-24.2.3-x86_64-setup.exe" /S /allusers',
        "uninstall_command": '"%ProgramFiles%\\DBeaver\\uninstall.exe" /S',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\DBeaver",
            "fileOrFolderName": "dbeaver.exe",
            "detectionType": "exists"
        }
    },
    {
        "id": "PuTTY.PuTTY",
        "name": "PuTTY SSH & Telnet Client",
        "publisher": "Simon Tatham",
        "category": "IT Admin & SecOps",
        "version": "0.81.0",
        "architecture": "x64",
        "icon": "https://www.chiark.greenend.org.uk/~sgtatham/putty/putty.png",
        "description": "A free implementation of SSH and Telnet for Windows and Unix platforms.",
        "download_url": "https://the.earth.li/~sgtatham/putty/0.81/w64/putty-64bit-0.81-installer.msi",
        "filename": "putty-64bit-0.81-installer.msi",
        "install_command": "msiexec /i putty-64bit-0.81-installer.msi /qn /norestart",
        "uninstall_command": "msiexec /x putty-64bit-0.81-installer.msi /qn /norestart",
        "install_behavior": "system",
        "detection_rule": {
            "type": "registry",
            "keyPath": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{PuTTY}",
            "valueName": "DisplayName",
            "detectionValue": "PuTTY"
        }
    }
]

class WinGetService:
    """
    Search and resolver service for the Windows Package Manager (winget) ecosystem.
    Provides instant search, package manifest translation, and silent switch generation.
    """

    @classmethod
    def search(cls, query: str = "", limit: int = 20) -> List[Dict[str, Any]]:
        q = (query or "").lower().strip()
        results = []
        for pkg in WINGET_PACKAGES_CACHE:
            if not q or (
                q in pkg["name"].lower()
                or q in pkg["id"].lower()
                or q in pkg["publisher"].lower()
                or q in pkg["description"].lower()
                or q in pkg["category"].lower()
            ):
                results.append(pkg)
                if len(results) >= limit:
                    break
        return results

    @classmethod
    def get_by_id(cls, package_id: str) -> Optional[Dict[str, Any]]:
        for pkg in WINGET_PACKAGES_CACHE:
            if pkg["id"].lower() == package_id.lower():
                return pkg
        return None

    @classmethod
    def convert_to_catalog_app(cls, pkg: Dict[str, Any]) -> Dict[str, Any]:
        """Converts winget package record into standard DeployForge catalog model."""
        return {
            "id": f"winget-{pkg['id'].lower().replace('.', '-')}",
            "name": pkg["name"],
            "publisher": pkg["publisher"],
            "category": pkg.get("category", "WinGet Repositories"),
            "version": pkg["version"],
            "architecture": pkg.get("architecture", "x64"),
            "icon": pkg.get("icon", ""),
            "description": pkg.get("description", ""),
            "download_url": pkg["download_url"],
            "filename": pkg["filename"],
            "install_command": pkg["install_command"],
            "uninstall_command": pkg["uninstall_command"],
            "install_behavior": pkg.get("install_behavior", "system"),
            "detection_rule": pkg["detection_rule"]
        }
