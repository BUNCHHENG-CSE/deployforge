import os
import tempfile
import pytest
from app.core.analyzer import InstallerAnalyzer
from app.core.catalog import SoftwareCatalog

def test_catalog_retrieval():
    apps = SoftwareCatalog.list_apps()
    assert len(apps) >= 15
    chrome = SoftwareCatalog.get_by_id("google-chrome")
    assert chrome is not None
    assert "ChromeStandaloneSetup64.exe" in chrome["install_command"]

    dev_apps = SoftwareCatalog.list_apps(category="Developer Tools")
    assert any(a["id"] == "vscode" for a in dev_apps)

def test_analyzer_generic_exe():
    with tempfile.TemporaryDirectory() as td:
        dummy_exe = os.path.join(td, "MyCustomApp_Setup.exe")
        # Inno Setup signature simulation
        with open(dummy_exe, "wb") as f:
            f.write(b"MZ\x00\x00" + b"A" * 1000 + b"Inno Setup Setup Data (5.5.0)" + b"B" * 500)

        analysis = InstallerAnalyzer.analyze(dummy_exe)
        assert analysis["file_type"] == ".exe"
        assert analysis["engine"] == InstallerAnalyzer.ENGINE_INNO
        assert "/VERYSILENT" in analysis["install_command"]
        assert len(analysis["suggested_detection_rules"]) >= 1

def test_analyzer_msi():
    with tempfile.TemporaryDirectory() as td:
        dummy_msi = os.path.join(td, "ProductInstaller.msi")
        guid = "{12345678-ABCD-1234-ABCD-123456789012}"
        with open(dummy_msi, "wb") as f:
            f.write(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"ProductCode\x00" + guid.encode() + b"ProductName\x00DemoEnterpriseApp\x00ProductVersion\x002.5.1\x00")

        analysis = InstallerAnalyzer.analyze(dummy_msi)
        assert analysis["file_type"] == ".msi"
        assert analysis["engine"] == InstallerAnalyzer.ENGINE_MSI
        assert "msiexec /i" in analysis["install_command"]
        assert analysis["product_code"] == guid
