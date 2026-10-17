import os
import re
import sys
import subprocess
from typing import Dict, Any, Optional, List
import pefile

class InstallerAnalyzer:
    """
    Intelligent installer analyzer for Windows Executables (.exe) and Microsoft Installers (.msi).
    Extracts metadata, detects packaging engine, and automatically generates silent switches
    and Microsoft Intune detection rules.
    """

    ENGINE_INNO = "Inno Setup"
    ENGINE_NSIS = "NSIS (Nullsoft)"
    ENGINE_WIX = "WiX Toolset (Burn)"
    ENGINE_INSTALLSHIELD = "InstallShield"
    ENGINE_ADVANCED_INSTALLER = "Advanced Installer"
    ENGINE_SQUIRREL = "Squirrel"
    ENGINE_MSI = "Windows Installer (MSI)"
    ENGINE_GENERIC = "Standard / Generic Executable"

    @classmethod
    def analyze(cls, file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        file_size = os.path.getsize(file_path)
        filename = os.path.basename(file_path)

        if ext == ".msi":
            return cls._analyze_msi(file_path, filename, file_size)
        elif ext == ".exe":
            return cls._analyze_exe(file_path, filename, file_size)
        elif ext == ".zip":
            return cls._analyze_zip(file_path, filename, file_size)
        else:
            return {
                "filename": filename,
                "file_type": ext,
                "size_bytes": file_size,
                "app_name": os.path.splitext(filename)[0],
                "publisher": "Unknown Publisher",
                "version": "1.0.0.0",
                "architecture": "x64",
                "engine": cls.ENGINE_GENERIC,
                "install_command": f'"{filename}" /quiet /norestart',
                "uninstall_command": f'"{filename}" /uninstall /quiet /norestart',
                "suggested_detection_rules": cls._generate_fallback_rules(filename, "1.0.0.0"),
                "notes": f"Generic handling for file extension '{ext}'"
            }

    @classmethod
    def _analyze_msi(cls, file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        """Analyzes MSI database using COM or OLE/regex stream extraction."""
        product_code = None
        product_name = None
        product_version = None
        manufacturer = None
        upgrade_code = None

        # 1. If on Windows, attempt WindowsInstaller.Installer COM object query
        if sys.platform == "win32":
            try:
                ps_cmd = (
                    f'$installer = New-Object -ComObject WindowsInstaller.Installer; '
                    f'$db = $installer.OpenDatabase("{file_path}", 0); '
                    f'$view = $db.OpenView("SELECT Property, Value FROM Property"); '
                    f'$view.Execute(); '
                    f'$res = @{{}}; '
                    f'while ($record = $view.Fetch()) {{ $res[$record.StringData(1)] = $record.StringData(2) }}; '
                    f'$res | ConvertTo-Json -Compress'
                )
                proc = subprocess.run(
                    ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
                    capture_output=True,
                    text=True,
                    timeout=8
                )
                if proc.returncode == 0 and proc.stdout.strip():
                    import json
                    props = json.loads(proc.stdout.strip())
                    product_code = props.get("ProductCode")
                    product_name = props.get("ProductName")
                    product_version = props.get("ProductVersion")
                    manufacturer = props.get("Manufacturer")
                    upgrade_code = props.get("UpgradeCode")
            except Exception:
                pass

        # 2. Fallback to binary & ole scanning
        if not product_code or not product_name:
            try:
                with open(file_path, "rb") as f:
                    # Scan first 4MB and last 1MB for property patterns
                    head_data = f.read(4 * 1024 * 1024)
                    text_content = head_data.decode("latin-1", errors="ignore")

                    # Scan for ProductCode GUID format: {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}
                    guids = re.findall(r'\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}', text_content)
                    if guids:
                        product_code = product_code or guids[0]
                        if len(guids) > 1 and not upgrade_code:
                            upgrade_code = guids[1]

                    # Scan for ProductVersion pattern
                    if not product_version:
                        ver_match = re.search(r'ProductVersion\x00([0-9]+\.[0-9]+(\.[0-9]+)?(\.[0-9]+)?)', text_content)
                        if ver_match:
                            product_version = ver_match.group(1)

                    # Scan for Manufacturer pattern
                    if not manufacturer:
                        mfg_match = re.search(r'Manufacturer\x00([^\x00\r\n]{2,60})', text_content)
                        if mfg_match:
                            manufacturer = mfg_match.group(1).strip()

                    # Scan for ProductName pattern
                    if not product_name:
                        name_match = re.search(r'ProductName\x00([^\x00\r\n]{2,80})', text_content)
                        if name_match:
                            product_name = name_match.group(1).strip()
            except Exception:
                pass

        clean_name = product_name or os.path.splitext(filename)[0]
        clean_version = product_version or "1.0.0"
        clean_publisher = manufacturer or "Enterprise Software"
        clean_code = product_code or "{00000000-0000-0000-0000-000000000000}"

        install_cmd = f'msiexec /i "{filename}" /qn /norestart ALLUSERS=1'
        uninstall_cmd = f'msiexec /x "{clean_code}" /qn /norestart'

        detection_rules = [
            {
                "type": "msi",
                "productCode": clean_code,
                "productVersion": clean_version,
                "productVersionOperator": "greaterThanOrEqual",
                "checkProductVersion": bool(product_version),
                "description": f"MSI ProductCode Detection ({clean_code})"
            },
            {
                "type": "registry",
                "keyPath": f"HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{clean_code}",
                "valueName": "DisplayVersion",
                "detectionType": "version",
                "operator": "greaterThanOrEqual",
                "detectionValue": clean_version,
                "check32BitOn64System": False,
                "description": "Registry DisplayVersion rule (Fallback)"
            }
        ]

        return {
            "filename": filename,
            "file_type": ".msi",
            "size_bytes": file_size,
            "app_name": clean_name,
            "publisher": clean_publisher,
            "version": clean_version,
            "architecture": "x64",
            "engine": cls.ENGINE_MSI,
            "product_code": clean_code,
            "upgrade_code": upgrade_code,
            "install_command": install_cmd,
            "uninstall_command": uninstall_cmd,
            "install_behavior": "system",
            "device_restart_behavior": "suppress",
            "suggested_detection_rules": detection_rules,
            "notes": "Native MSI package with automatic ProductCode extraction and silent msiexec switches."
        }

    @classmethod
    def _analyze_exe(cls, file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        """Analyzes Portable Executable (PE) headers, resources, and installer engine."""
        arch = "x64"
        app_name = os.path.splitext(filename)[0]
        publisher = "Enterprise Software"
        version = "1.0.0.0"
        engine = cls.ENGINE_GENERIC

        pe_info: Dict[str, str] = {}

        try:
            pe = pefile.PE(file_path, fast_load=True)
            # Architecture detection
            machine = pe.FILE_HEADER.Machine
            if machine == 0x8664:  # IMAGE_FILE_MACHINE_AMD64
                arch = "x64"
            elif machine == 0x014c:  # IMAGE_FILE_MACHINE_I386
                arch = "x86"
            elif machine == 0xAA64:  # IMAGE_FILE_MACHINE_ARM64
                arch = "arm64"

            # Parse resource directory for Version Info
            pe.parse_data_directories(directories=[pefile.DIRECTORY_ENTRY["IMAGE_DIRECTORY_ENTRY_RESOURCE"]])

            if hasattr(pe, "FileInfo"):
                for file_info_list in pe.FileInfo:
                    for item in file_info_list:
                        if hasattr(item, "StringTable"):
                            for st in item.StringTable:
                                for key, value in st.entries.items():
                                    try:
                                        k = key.decode("utf-8", errors="ignore") if isinstance(key, bytes) else str(key)
                                        v = value.decode("utf-8", errors="ignore") if isinstance(value, bytes) else str(value)
                                        pe_info[k] = v.strip()
                                    except Exception:
                                        pass
            pe.close()
        except Exception:
            pass

        # Extract app name from PE metadata
        if "ProductName" in pe_info and pe_info["ProductName"]:
            app_name = pe_info["ProductName"]
        elif "FileDescription" in pe_info and pe_info["FileDescription"]:
            app_name = pe_info["FileDescription"]

        # Extract publisher
        if "CompanyName" in pe_info and pe_info["CompanyName"]:
            publisher = pe_info["CompanyName"]

        # Extract version
        if "ProductVersion" in pe_info and pe_info["ProductVersion"]:
            # Clean version numbers like "1, 2, 3, 4" or "1.2.3.4 (build 123)"
            v = pe_info["ProductVersion"].replace(",", ".").strip()
            v_match = re.search(r'([0-9]+(\.[0-9]+)+)', v)
            version = v_match.group(1) if v_match else v
        elif "FileVersion" in pe_info and pe_info["FileVersion"]:
            v = pe_info["FileVersion"].replace(",", ".").strip()
            v_match = re.search(r'([0-9]+(\.[0-9]+)+)', v)
            version = v_match.group(1) if v_match else v

        # Read samples of binary to detect installer framework
        engine = cls._detect_engine(file_path)

        # Generate command lines & detection rules based on engine
        install_cmd, uninstall_cmd = cls._generate_engine_commands(filename, app_name, engine)
        detection_rules = cls._generate_exe_detection_rules(app_name, version, filename, arch)

        return {
            "filename": filename,
            "file_type": ".exe",
            "size_bytes": file_size,
            "app_name": app_name,
            "publisher": publisher,
            "version": version,
            "architecture": arch,
            "engine": engine,
            "pe_metadata": pe_info,
            "install_command": install_cmd,
            "uninstall_command": uninstall_cmd,
            "install_behavior": "system",
            "device_restart_behavior": "suppress",
            "suggested_detection_rules": detection_rules,
            "notes": f"Detected installer framework: {engine}. Silent flags automatically injected."
        }

    @classmethod
    def _detect_engine(cls, file_path: str) -> str:
        """Heuristic detection of installer engine through binary signatures."""
        try:
            with open(file_path, "rb") as f:
                head = f.read(2 * 1024 * 1024)
                f.seek(max(0, os.path.getsize(file_path) - 1024 * 1024))
                tail = f.read()

            content = head + tail

            # Inno Setup checks
            if b"Inno Setup" in content or b"jr.inno.setup" in content or b"InnoSetup" in content:
                return cls.ENGINE_INNO

            # NSIS checks
            if b"Nullsoft.NSIS" in content or b"NullsoftInst" in content or b"NSIS Error" in content:
                return cls.ENGINE_NSIS

            # WiX Burn checks
            if b"WixBundleName" in content or b"WixBurn" in content or b"WixBundleManufacturer" in content:
                return cls.ENGINE_WIX

            # InstallShield checks
            if b"InstallShield" in content or b"ISSetup.dll" in content or b"_isdel.exe" in content:
                return cls.ENGINE_INSTALLSHIELD

            # Advanced Installer
            if b"Advanced Installer" in content or b"Caphyon" in content:
                return cls.ENGINE_ADVANCED_INSTALLER

            # Squirrel
            if b"Squirrel" in content or b"Update.exe --processStart" in content:
                return cls.ENGINE_SQUIRREL

        except Exception:
            pass

        return cls.ENGINE_GENERIC

    @classmethod
    def _generate_engine_commands(cls, filename: str, app_name: str, engine: str) -> tuple[str, str]:
        """Generates standard silent installation and uninstallation commands."""
        clean_name = re.sub(r'[^a-zA-Z0-9_\-\s]', '', app_name).strip()

        if engine == cls.ENGINE_INNO:
            install = f'"{filename}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-'
            uninstall = f'"%ProgramFiles%\\{clean_name}\\unins000.exe" /VERYSILENT /NORESTART'
        elif engine == cls.ENGINE_NSIS:
            install = f'"{filename}" /S'
            uninstall = f'"%ProgramFiles%\\{clean_name}\\uninstall.exe" /S'
        elif engine == cls.ENGINE_WIX:
            install = f'"{filename}" /quiet /norestart'
            uninstall = f'"{filename}" /uninstall /quiet /norestart'
        elif engine == cls.ENGINE_INSTALLSHIELD:
            install = f'"{filename}" /s /v"/qn /norestart"'
            uninstall = f'"{filename}" /uninst /s'
        elif engine == cls.ENGINE_ADVANCED_INSTALLER:
            install = f'"{filename}" /exenoui /qn /norestart'
            uninstall = f'"{filename}" /uninstall /qn /norestart'
        elif engine == cls.ENGINE_SQUIRREL:
            install = f'"{filename}" --silent'
            uninstall = f'"%LocalAppData%\\{clean_name}\\Update.exe" --uninstall -s'
        else:
            # Generic smart default
            install = f'"{filename}" /quiet /norestart'
            uninstall = f'"{filename}" /uninstall /quiet /norestart'

        return install, uninstall

    @classmethod
    def _generate_exe_detection_rules(cls, app_name: str, version: str, filename: str, arch: str) -> List[Dict[str, Any]]:
        clean_name = re.sub(r'[^a-zA-Z0-9_\-\s]', '', app_name).strip()
        binary_base = os.path.splitext(filename)[0]

        # 1. Registry DisplayVersion Detection
        reg_rule = {
            "type": "registry",
            "keyPath": f"HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{clean_name}",
            "valueName": "DisplayVersion",
            "detectionType": "version",
            "operator": "greaterThanOrEqual",
            "detectionValue": version,
            "check32BitOn64System": arch == "x86",
            "description": f"Registry DisplayVersion rule ({clean_name} >= {version})"
        }

        # 2. File / Folder System Detection
        file_rule = {
            "type": "file",
            "path": f"%ProgramFiles%\\{clean_name}",
            "fileOrFolderName": f"{clean_name}.exe",
            "detectionType": "exists",
            "operator": "greaterThanOrEqual",
            "detectionValue": version,
            "check32BitOn64System": arch == "x86",
            "description": f"File System Detection in %ProgramFiles%\\{clean_name}"
        }

        # 3. Dynamic PowerShell Detection Script (Zero-failure pattern for SysAdmins)
        ps_script = (
            f'$appName = "{clean_name}"\n'
            f'$paths = @(\n'
            f'    "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"\n'
            f'    "HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"\n'
            f')\n'
            f'$installed = Get-ItemProperty -Path $paths -ErrorAction SilentlyContinue | Where-Object {{\n'
            f'    $_.DisplayName -like "*$appName*"\n'
            f'}}\n'
            f'if ($installed) {{\n'
            f'    Write-Output "App Detected: $($installed[0].DisplayName) Version: $($installed[0].DisplayVersion)"\n'
            f'    exit 0\n'
            f'}}\n'
            f'exit 1\n'
        )

        script_rule = {
            "type": "script",
            "scriptContent": ps_script,
            "enforceSignatureCheck": False,
            "runAs32Bit": False,
            "runAsAccount": "system",
            "description": f"PowerShell Detection Script for '{clean_name}'"
        }

        return [reg_rule, file_rule, script_rule]

    @classmethod
    def _generate_fallback_rules(cls, filename: str, version: str) -> List[Dict[str, Any]]:
        base_name = os.path.splitext(filename)[0]
        return [
            {
                "type": "file",
                "path": f"%ProgramFiles%\\{base_name}",
                "fileOrFolderName": filename,
                "detectionType": "exists",
                "operator": "greaterThanOrEqual",
                "detectionValue": version,
                "check32BitOn64System": False,
                "description": f"Executable Existence in Program Files"
            }
        ]

    @classmethod
    def _analyze_zip(cls, file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        """Analyzes a zip archive to find main installer."""
        import zipfile
        main_installer = None
        with zipfile.ZipFile(file_path, "r") as zf:
            names = zf.namelist()
            # Look for setup.exe, install.exe, *.msi, *.exe
            for n in names:
                lower = n.lower()
                if lower.endswith(".msi"):
                    main_installer = n
                    break
                elif "setup.exe" in lower or "install.exe" in lower:
                    main_installer = n
                    break
                elif lower.endswith(".exe") and not main_installer:
                    main_installer = n

        chosen = main_installer or (names[0] if names else "app.exe")
        return {
            "filename": filename,
            "file_type": ".zip",
            "size_bytes": file_size,
            "app_name": os.path.splitext(filename)[0],
            "publisher": "Custom Package",
            "version": "1.0.0.0",
            "architecture": "x64",
            "engine": "Multi-file Archive",
            "main_setup_file": chosen,
            "install_command": f'"{chosen}" /quiet /norestart',
            "uninstall_command": f'"{chosen}" /uninstall /quiet /norestart',
            "install_behavior": "system",
            "device_restart_behavior": "suppress",
            "suggested_detection_rules": cls._generate_fallback_rules(chosen, "1.0.0.0"),
            "notes": f"Multi-file ZIP bundle containing main installer '{chosen}'."
        }
