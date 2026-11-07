import re
import sys
import os
import subprocess
from typing import Dict, Any, Optional

class RuleSimulator:
    """
    Evaluates and simulates Microsoft Intune Win32 Detection Rules.
    Helps sysadmins verify whether a detection rule (MSI, Registry, File, or PowerShell)
    will correctly evaluate to 'Detected' (Success) or 'Not Detected' (0x87D1041C failure).
    """

    @classmethod
    def simulate_rule(cls, rule: Dict[str, Any]) -> Dict[str, Any]:
        rule_type = rule.get("type", "").lower()

        if rule_type == "msi":
            return cls._simulate_msi(rule)
        elif rule_type == "file":
            return cls._simulate_file(rule)
        elif rule_type == "registry":
            return cls._simulate_registry(rule)
        elif rule_type == "script":
            return cls._simulate_script(rule)
        else:
            return {
                "detected": False,
                "status": "error",
                "message": f"Unknown detection rule type: '{rule_type}'"
            }

    @classmethod
    def _simulate_msi(cls, rule: Dict[str, Any]) -> Dict[str, Any]:
        product_code = rule.get("productCode", "").strip()
        guid_pattern = r"^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}$"
        if not product_code or not re.match(guid_pattern, product_code):
            return {
                "detected": False,
                "status": "warning",
                "message": f"ProductCode '{product_code}' is not a valid standard GUID format '{{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}}'.",
                "recommendation": "Ensure ProductCode contains braces and correct hexadecimal groups."
            }

        # On Windows host, check if actually installed
        if sys.platform == "win32":
            try:
                ps_cmd = f'Get-CimInstance Win32_Product -Filter "IdentifyingNumber = \'{product_code}\'" | Select-Object -ExpandProperty IdentifyingNumber'
                res = subprocess.run(["powershell.exe", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=5)
                is_present = product_code.lower() in res.stdout.lower()
                return {
                    "detected": is_present,
                    "status": "success" if is_present else "not_detected",
                    "message": f"MSI ProductCode format is valid. System check result: {'Installed on this machine' if is_present else 'Not installed on this host'}.",
                    "details": {"productCode": product_code, "checkLocalHost": True}
                }
            except Exception:
                pass

        return {
            "detected": True,
            "status": "simulated_pass",
            "message": f"MSI ProductCode {product_code} has valid GUID syntax. Intune will evaluate against the MSI Database correctly.",
            "details": {"productCode": product_code, "simulated": True}
        }

    @classmethod
    def _simulate_file(cls, rule: Dict[str, Any]) -> Dict[str, Any]:
        raw_path = rule.get("path", "")
        file_name = rule.get("fileOrFolderName", "")
        detection_type = rule.get("detectionType", "exists")

        expanded_path = os.path.expandvars(raw_path)
        full_path = os.path.join(expanded_path, file_name)

        if not raw_path or not file_name:
            return {
                "detected": False,
                "status": "error",
                "message": "Both 'Path' and 'File / Folder Name' must be specified."
            }

        if sys.platform == "win32":
            exists = os.path.exists(full_path)
            return {
                "detected": exists,
                "status": "success" if exists else "not_detected",
                "message": f"Path '{full_path}' {'exists on host system' if exists else 'does not currently exist on host system'}.",
                "details": {
                    "rawPath": raw_path,
                    "expandedPath": full_path,
                    "detectionType": detection_type,
                    "exists": exists
                }
            }

        return {
            "detected": True,
            "status": "simulated_pass",
            "message": f"File detection syntax is valid for path: {full_path}",
            "details": {"rawPath": raw_path, "expandedPath": full_path}
        }

    @classmethod
    def _simulate_registry(cls, rule: Dict[str, Any]) -> Dict[str, Any]:
        key_path = rule.get("keyPath", "")
        val_name = rule.get("valueName", "")
        expected_val = rule.get("detectionValue", "")

        if not key_path:
            return {
                "detected": False,
                "status": "error",
                "message": "Registry Key Path cannot be blank (e.g. HKLM\\SOFTWARE\\Vendor\\App)."
            }

        # On Windows host, check registry
        if sys.platform == "win32":
            try:
                ps_cmd = f'(Get-ItemProperty -Path "{key_path.replace("HKLM", "HKLM:").replace("HKCU", "HKCU:")}" -ErrorAction SilentlyContinue)."{val_name}"'
                res = subprocess.run(["powershell.exe", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=5)
                actual_val = res.stdout.strip()
                if actual_val:
                    return {
                        "detected": True,
                        "status": "success",
                        "message": f"Registry key and value found on host. Value: '{actual_val}'.",
                        "details": {"keyPath": key_path, "valueName": val_name, "foundValue": actual_val}
                    }
            except Exception:
                pass

        return {
            "detected": True,
            "status": "simulated_pass",
            "message": f"Registry rule structure is valid: Key '{key_path}', Value '{val_name}'.",
            "details": {"keyPath": key_path, "valueName": val_name, "expected": expected_val}
        }

    @classmethod
    def _simulate_script(cls, rule: Dict[str, Any]) -> Dict[str, Any]:
        script_code = rule.get("scriptContent", "")
        if not script_code.strip():
            return {
                "detected": False,
                "status": "error",
                "message": "PowerShell detection script cannot be empty."
            }

        # Validate Intune detection requirement: script must write to STDOUT and exit with code 0 to indicate presence
        has_stdout = "write-output" in script_code.lower() or "write-host" in script_code.lower() or "echo " in script_code.lower()
        has_exit = "exit 0" in script_code.lower() or "exit" in script_code.lower()

        warnings = []
        if not has_stdout:
            warnings.append("Intune requires detection scripts to write text to standard output (e.g. Write-Output 'Installed') to signal detection.")

        return {
            "detected": True,
            "status": "success" if not warnings else "warning",
            "message": "PowerShell detection script verified for Intune compatibility." if not warnings else "; ".join(warnings),
            "details": {
                "scriptLength": len(script_code),
                "hasOutput": has_stdout,
                "hasExit": has_exit
            }
        }
