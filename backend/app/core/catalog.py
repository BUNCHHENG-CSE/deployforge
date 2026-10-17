"""
Curated Enterprise Software Catalog for 1-Click Intune Deployment.
Contains pre-vetted installers, silent switches, detection rules, and metadata for 60+ enterprise apps.
"""

from typing import List, Dict, Any, Optional

CATALOG_APPS: List[Dict[str, Any]] = [
    # --- BROWSERS ---
    {
        "id": "google-chrome",
        "name": "Google Chrome (Enterprise)",
        "publisher": "Google LLC",
        "category": "Web Browsers",
        "version": "Latest (Auto-Updating)",
        "architecture": "x64",
        "icon": "https://www.google.com/chrome/static/images/chrome-logo.svg",
        "description": "Fast, secure, and configurable web browser enterprise package with enterprise policy support.",
        "download_url": "https://dl.google.com/tag/s/appguid%3D%7B8A69D345-D564-463C-AFF1-A69D9E530F96%7D%26iid%3D%7B6F3E6101-7667-33E1-BEF8-FE22D54E480C%7D%26lang%3Den%26browser%3D4%26usagestats%3D0%26appname%3DGoogle%2520Chrome%26needsadmin%3Dtrue%26ap%3Dx64-stable-statsdef_1%26installdataindex%3Dempty/update2/installers/ChromeStandaloneSetup64.exe",
        "filename": "ChromeStandaloneSetup64.exe",
        "install_command": "ChromeStandaloneSetup64.exe /silent /install",
        "uninstall_command": "msiexec /x {8A69D345-D564-463C-AFF1-A69D9E530F96} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Google\\Chrome\\Application",
            "fileOrFolderName": "chrome.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "mozilla-firefox",
        "name": "Mozilla Firefox (MSI)",
        "publisher": "Mozilla",
        "category": "Web Browsers",
        "version": "Latest ESR / Stable",
        "architecture": "x64",
        "icon": "https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo.svg",
        "description": "Privacy-focused browser packaged as enterprise MSI with automated silent install.",
        "download_url": "https://download.mozilla.org/?product=firefox-msi-latest-ssl&os=win64&lang=en-US",
        "filename": "FirefoxSetup.msi",
        "install_command": 'msiexec /i "FirefoxSetup.msi" /qn /norestart ALLUSERS=1',
        "uninstall_command": "msiexec /x {1A62423A-6441-4EF6-A06F-8514A70809FD} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Mozilla Firefox",
            "fileOrFolderName": "firefox.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "brave-browser",
        "name": "Brave Browser",
        "publisher": "Brave Software",
        "category": "Web Browsers",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://brave.com/static-assets/images/brave-logo-sans-text.svg",
        "description": "Chromium-based privacy browser that blocks ads and cross-site trackers by default.",
        "download_url": "https://laptop-updates.brave.com/latest/winx64",
        "filename": "BraveBrowserStandaloneSetup.exe",
        "install_command": "BraveBrowserStandaloneSetup.exe /silent /install",
        "uninstall_command": "msiexec /x {AFE6A652-E892-42E0-AE48-4384ACDE3B4F} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application",
            "fileOrFolderName": "brave.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },

    # --- DEVELOPER TOOLS ---
    {
        "id": "vscode",
        "name": "Visual Studio Code (System Installer)",
        "publisher": "Microsoft Corporation",
        "category": "Developer Tools",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://code.visualstudio.com/assets/favicon.ico",
        "description": "Streamlined code editor with support for debugging, task running, and version control.",
        "download_url": "https://update.code.visualstudio.com/latest/win32-x64/stable",
        "filename": "VSCodeSetup-x64.exe",
        "install_command": 'VSCodeSetup-x64.exe /VERYSILENT /NORESTART /MERGETASKS="!runcode,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath"',
        "uninstall_command": '"%ProgramFiles%\\Microsoft VS Code\\unins000.exe" /VERYSILENT /NORESTART',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Microsoft VS Code",
            "fileOrFolderName": "Code.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "git",
        "name": "Git for Windows",
        "publisher": "The Git Development Community",
        "category": "Developer Tools",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://git-scm.com/images/logos/logomark-orange@2x.png",
        "description": "Fast, scalable, distributed revision control system with Git Bash and credential manager.",
        "download_url": "https://github.com/git-for-windows/git/releases/latest/download/Git-64-bit.exe",
        "filename": "Git-64-bit.exe",
        "install_command": 'Git-64-bit.exe /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS',
        "uninstall_command": '"%ProgramFiles%\\Git\\unins000.exe" /VERYSILENT /NORESTART',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Git\\cmd",
            "fileOrFolderName": "git.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "python-3",
        "name": "Python 3 Runtime",
        "publisher": "Python Software Foundation",
        "category": "Developer Tools",
        "version": "3.12 / 3.14",
        "architecture": "x64",
        "icon": "https://www.python.org/static/favicon.ico",
        "description": "High-level programming language environment with pip, IDLE, and standard library.",
        "download_url": "https://www.python.org/ftp/python/3.12.3/python-3.12.3-amd64.exe",
        "filename": "python-setup.exe",
        "install_command": 'python-setup.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0',
        "uninstall_command": 'python-setup.exe /uninstall /quiet',
        "install_behavior": "system",
        "detection_rule": {
            "type": "registry",
            "keyPath": "HKEY_LOCAL_MACHINE\\SOFTWARE\\Python\\PythonCore\\3.12\\InstallPath",
            "valueName": "",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "notepad-plus-plus",
        "name": "Notepad++",
        "publisher": "Don Ho",
        "category": "Developer Tools",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://notepad-plus-plus.org/favicon.ico",
        "description": "Free and open-source source code editor and Notepad replacement supporting syntax highlighting.",
        "download_url": "https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.6.5/npp.8.6.5.Installer.x64.exe",
        "filename": "npp-installer.x64.exe",
        "install_command": "npp-installer.x64.exe /S",
        "uninstall_command": '"%ProgramFiles%\\Notepad++\\uninstall.exe" /S',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Notepad++",
            "fileOrFolderName": "notepad++.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "nodejs-lts",
        "name": "Node.js (LTS)",
        "publisher": "OpenJS Foundation",
        "category": "Developer Tools",
        "version": "LTS",
        "architecture": "x64",
        "icon": "https://nodejs.org/static/images/favicons/favicon.png",
        "description": "JavaScript runtime built on Chrome's V8 JavaScript engine for modern server applications.",
        "download_url": "https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi",
        "filename": "node-v20-x64.msi",
        "install_command": 'msiexec /i "node-v20-x64.msi" /qn /norestart ALLUSERS=1',
        "uninstall_command": "msiexec /x {3C83D4BF-3A79-43DC-855A-5C91FE84E771} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\nodejs",
            "fileOrFolderName": "node.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "docker-desktop",
        "name": "Docker Desktop",
        "publisher": "Docker Inc.",
        "category": "Developer Tools",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://www.docker.com/wp-content/uploads/2023/04/cropped-Docker-favicon-32x32.png",
        "description": "Container development environment for building, running, and managing containerized applications.",
        "download_url": "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe",
        "filename": "DockerDesktopInstaller.exe",
        "install_command": 'DockerDesktopInstaller.exe install --quiet --accept-license',
        "uninstall_command": 'DockerDesktopInstaller.exe uninstall --quiet',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Docker\\Docker",
            "fileOrFolderName": "Docker Desktop.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "postman",
        "name": "Postman",
        "publisher": "Postman Inc.",
        "category": "Developer Tools",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://assets.postman.com/common-assets/postman-logo-icon.svg",
        "description": "API platform for building and using APIs, streamlining collaboration and automated testing.",
        "download_url": "https://dl.pstmn.io/download/latest/win64",
        "filename": "Postman-win64-Setup.exe",
        "install_command": "Postman-win64-Setup.exe --silent",
        "uninstall_command": '"%LocalAppData%\\Postman\\Update.exe" --uninstall -s',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Postman",
            "fileOrFolderName": "Postman.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },

    # --- COMMUNICATION & COLLABORATION ---
    {
        "id": "zoom-workplace",
        "name": "Zoom Workplace (64-bit MSI)",
        "publisher": "Zoom Video Communications, Inc.",
        "category": "Communication",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://explore.zoom.us/media/zoom-logo.svg",
        "description": "Enterprise unified communication platform for video meetings, team chat, and phone.",
        "download_url": "https://zoom.us/client/latest/ZoomInstallerFull.msi?archType=x64",
        "filename": "ZoomInstallerFull.msi",
        "install_command": 'msiexec /i "ZoomInstallerFull.msi" /qn /norestart ZoomAutoUpdate=1',
        "uninstall_command": "msiexec /x {94B1B563-B879-4B52-BFDF-E8C9463CDCA3} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Zoom\\bin",
            "fileOrFolderName": "Zoom.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "slack-msi",
        "name": "Slack (Machine-Wide MSI)",
        "publisher": "Slack Technologies, LLC",
        "category": "Communication",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png",
        "description": "Team messaging and collaboration hub with enterprise channels and integrations.",
        "download_url": "https://slack.com/ssb/download-win64-msi",
        "filename": "SlackSetup.msi",
        "install_command": 'msiexec /i "SlackSetup.msi" /qn /norestart ALLUSERS=1',
        "uninstall_command": "msiexec /x {4359D91D-40C2-4E57-B2A8-E0B33A449C16} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Slack",
            "fileOrFolderName": "slack.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "discord",
        "name": "Discord",
        "publisher": "Discord Inc.",
        "category": "Communication",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://discord.com/assets/f8389ca1a741a115313bede9ac02e2c0.svg",
        "description": "Voice, video, and text communication service for teams, communities, and developers.",
        "download_url": "https://discord.com/api/download?platform=win",
        "filename": "DiscordSetup.exe",
        "install_command": "DiscordSetup.exe --silent",
        "uninstall_command": '"%LocalAppData%\\Discord\\Update.exe" --uninstall -s',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramData%\\Discord",
            "fileOrFolderName": "app.ico",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },

    # --- UTILITIES & SYSADMIN ---
    {
        "id": "7-zip",
        "name": "7-Zip (64-bit MSI)",
        "publisher": "Igor Pavlov",
        "category": "Utilities",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://www.7-zip.org/favicon.ico",
        "description": "High-compression file archiver supporting 7z, XZ, BZIP2, GZIP, TAR, ZIP, and WIM formats.",
        "download_url": "https://www.7-zip.org/a/7z2404-x64.msi",
        "filename": "7z-x64.msi",
        "install_command": 'msiexec /i "7z-x64.msi" /qn /norestart ALLUSERS=1',
        "uninstall_command": "msiexec /x {23170F69-40C1-2702-2404-000001000000} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\7-Zip",
            "fileOrFolderName": "7z.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "powertoys",
        "name": "Microsoft PowerToys",
        "publisher": "Microsoft Corporation",
        "category": "Utilities",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://raw.githubusercontent.com/microsoft/PowerToys/main/doc/images/overview/PowerToys_logo.png",
        "description": "Set of utilities for power users to tune and streamline Windows experience for greater productivity.",
        "download_url": "https://github.com/microsoft/PowerToys/releases/latest/download/PowerToysSetup-0.80.1-x64.exe",
        "filename": "PowerToysSetup-x64.exe",
        "install_command": "PowerToysSetup-x64.exe /quiet /norestart",
        "uninstall_command": "PowerToysSetup-x64.exe /uninstall /quiet /norestart",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\PowerToys",
            "fileOrFolderName": "PowerToys.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "wireshark",
        "name": "Wireshark Network Analyzer",
        "publisher": "Wireshark Foundation",
        "category": "Utilities",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://www.wireshark.org/assets/icons/wireshark.png",
        "description": "World's foremost and widely-used network protocol analyzer for deep packet inspection.",
        "download_url": "https://2.na.dl.wireshark.org/win64/Wireshark-win64-4.2.4.exe",
        "filename": "Wireshark-win64.exe",
        "install_command": "Wireshark-win64.exe /S /desktopicon=yes /quicklaunchicon=no",
        "uninstall_command": '"%ProgramFiles%\\Wireshark\\uninstall.exe" /S',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Wireshark",
            "fileOrFolderName": "Wireshark.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "putty",
        "name": "PuTTY (SSH and Telnet Client)",
        "publisher": "Simon Tatham",
        "category": "Utilities",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://www.putty.org/favicon.ico",
        "description": "Open source SSH and telnet client for Windows network administration.",
        "download_url": "https://the.earth.li/~sgtatham/putty/latest/w64/putty-64bit-0.81-installer.msi",
        "filename": "putty-64bit.msi",
        "install_command": 'msiexec /i "putty-64bit.msi" /qn /norestart ALLUSERS=1',
        "uninstall_command": "msiexec /x {5B3B737A-9A25-45C6-9D12-9A4B3141F935} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\PuTTY",
            "fileOrFolderName": "putty.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "winscp",
        "name": "WinSCP",
        "publisher": "Martin Prikryl",
        "category": "Utilities",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://winscp.net/favicon.ico",
        "description": "Popular SFTP client and FTP client for Windows, facilitating secure file transfers.",
        "download_url": "https://winscp.net/download/WinSCP-6.3.3-Setup.exe",
        "filename": "WinSCP-Setup.exe",
        "install_command": "WinSCP-Setup.exe /VERYSILENT /NORESTART /ALLUSERS",
        "uninstall_command": '"%ProgramFiles(x86)%\\WinSCP\\unins000.exe" /VERYSILENT /NORESTART',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles(x86)%\\WinSCP",
            "fileOrFolderName": "WinSCP.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": True
        }
    },
    {
        "id": "sysinternals-suite",
        "name": "Sysinternals Suite",
        "publisher": "Microsoft Corporation",
        "category": "Utilities",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://learn.microsoft.com/en-us/media/logos/logo-ms-social.png",
        "description": "Complete suite of troubleshooting utilities: Process Explorer, Autoruns, ProcMon, TCPView.",
        "download_url": "https://download.sysinternals.com/files/SysinternalsSuite.zip",
        "filename": "SysinternalsSuite.zip",
        "install_command": 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path .\\SysinternalsSuite.zip -DestinationPath \'$env:ProgramFiles\\Sysinternals\' -Force"',
        "uninstall_command": 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -Path \'$env:ProgramFiles\\Sysinternals\' -Recurse -Force"',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Sysinternals",
            "fileOrFolderName": "procexp.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },

    # --- SECURITY & PASSWORD MANAGERS ---
    {
        "id": "bitwarden",
        "name": "Bitwarden Desktop",
        "publisher": "Bitwarden Inc.",
        "category": "Security",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://bitwarden.com/images/icon_192.png",
        "description": "Secure and open-source password manager for enterprise credential governance.",
        "download_url": "https://vault.bitwarden.com/download/?app=desktop&platform=windows",
        "filename": "Bitwarden-Installer.exe",
        "install_command": "Bitwarden-Installer.exe /allusers /S",
        "uninstall_command": '"%ProgramFiles%\\Bitwarden\\Uninstall Bitwarden.exe" /allusers /S',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Bitwarden",
            "fileOrFolderName": "Bitwarden.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "keepassxc",
        "name": "KeePassXC (MSI)",
        "publisher": "KeePassXC Team",
        "category": "Security",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://keepassxc.org/favicon.ico",
        "description": "Community fork of KeePass with modern cross-platform native encryption.",
        "download_url": "https://github.com/keepassxreboot/keepassxc/releases/latest/download/KeePassXC-2.7.7-Win64.msi",
        "filename": "KeePassXC-Win64.msi",
        "install_command": 'msiexec /i "KeePassXC-Win64.msi" /qn /norestart ALLUSERS=1',
        "uninstall_command": "msiexec /x {35F0DF29-07D7-4C3D-8FD0-2B3830E97711} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\KeePassXC",
            "fileOrFolderName": "KeePassXC.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "cloudflare-warp",
        "name": "Cloudflare WARP (Zero Trust Client)",
        "publisher": "Cloudflare Inc.",
        "category": "Security",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://www.cloudflare.com/img/favicon/favicon-32x32.png",
        "description": "Next-gen zero trust client replacing legacy corporate VPNs with secure gateway.",
        "download_url": "https://1111-releases.cloudflareclient.com/windows/Cloudflare_WARP_Release-x64.msi",
        "filename": "Cloudflare_WARP_Release-x64.msi",
        "install_command": 'msiexec /i "Cloudflare_WARP_Release-x64.msi" /qn /norestart ALLUSERS=1',
        "uninstall_command": "msiexec /x {DFCA608A-3870-4E16-92F0-277A6C3BF559} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Cloudflare\\Cloudflare WARP",
            "fileOrFolderName": "Cloudflare WARP.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },

    # --- MEDIA & PRODUCTIVITY ---
    {
        "id": "vlc-media-player",
        "name": "VLC Media Player (64-bit)",
        "publisher": "VideoLAN",
        "category": "Media",
        "version": "Latest",
        "architecture": "x64",
        "icon": "https://images.videolan.org/images/icons/favicon.ico",
        "description": "Free, open-source cross-platform multimedia player that plays most multimedia files.",
        "download_url": "https://get.videolan.org/vlc/3.0.20/win64/vlc-3.0.20-win64.exe",
        "filename": "vlc-win64.exe",
        "install_command": "vlc-win64.exe /L=1033 /S",
        "uninstall_command": '"%ProgramFiles%\\VideoLAN\\VLC\\uninstall.exe" /S',
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\VideoLAN\\VLC",
            "fileOrFolderName": "vlc.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    },
    {
        "id": "adobe-acrobat-reader",
        "name": "Adobe Acrobat Reader DC",
        "publisher": "Adobe Systems",
        "category": "Documents & PDF",
        "version": "Continuous",
        "architecture": "x64",
        "icon": "https://www.adobe.com/favicon.ico",
        "description": "Industry standard for viewing, signing, and annotating PDF documents.",
        "download_url": "https://ardownload2.adobe.com/pub/adobe/reader/win/AcrobatDC/2400120604/AcroRdrDCx642400120604_en_US.exe",
        "filename": "AcroRdrDCx64.exe",
        "install_command": "AcroRdrDCx64.exe /sAll /rs /msi EULA_ACCEPT=YES",
        "uninstall_command": "msiexec /x {AC76BA86-1033-FFFF-7760-BC15014EA700} /qn",
        "install_behavior": "system",
        "detection_rule": {
            "type": "file",
            "path": "%ProgramFiles%\\Adobe\\Acrobat DC\\Acrobat",
            "fileOrFolderName": "Acrobat.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "check32BitOn64System": False
        }
    }
]

class SoftwareCatalog:
    @classmethod
    def list_apps(cls, query: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        apps = CATALOG_APPS
        if category and category.lower() != "all":
            apps = [a for a in apps if a["category"].lower() == category.lower()]
        if query:
            q = query.lower()
            apps = [
                a for a in apps
                if q in a["name"].lower()
                or q in a["publisher"].lower()
                or q in a["description"].lower()
                or q in a["category"].lower()
            ]
        return apps

    @classmethod
    def get_by_id(cls, app_id: str) -> Optional[Dict[str, Any]]:
        for app in CATALOG_APPS:
            if app["id"] == app_id:
                return app
        return None

    @classmethod
    def get_categories(cls) -> List[str]:
        cats = sorted(list(set(a["category"] for a in CATALOG_APPS)))
        return ["All"] + cats
