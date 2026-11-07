import pytest
from starlette.testclient import TestClient
from app.main import app
from app.core.winget import WinGetService
from app.core.scripts_library import ScriptPackager
from app.core.rule_simulator import RuleSimulator

client = TestClient(app)

def test_winget_search_and_conversion():
    results = WinGetService.search("slack")
    assert len(results) > 0
    assert results[0]["id"] == "SlackTechnologies.Slack"

    pkg = WinGetService.get_by_id("SlackTechnologies.Slack")
    assert pkg is not None
    assert pkg["name"] == "Slack"

    catalog_app = WinGetService.convert_to_catalog_app(pkg)
    assert catalog_app["id"].startswith("winget-")
    assert catalog_app["install_command"].startswith("msiexec")
    assert catalog_app["detection_rule"]["type"] == "registry"

def test_scripts_curated_and_packaging():
    scripts = ScriptPackager.list_curated_scripts()
    assert len(scripts) >= 5
    debloat = ScriptPackager.get_curated_script("ps-debloat-windows11")
    assert debloat is not None
    assert "Debloat" in debloat["name"]

    # Package test
    pkg = ScriptPackager.package_script(
        script_id="test-ps-custom",
        script_name="Test Automation",
        script_content="Write-Output 'Hello Intune'; exit 0",
        version="1.0.0"
    )
    assert pkg["intunewin_filename"].endswith(".intunewin")
    assert pkg["install_command"] == "run.cmd"
    assert pkg["detection_rule"]["type"] == "file"
    assert "test-ps-custom.tag" in pkg["detection_rule"]["fileOrFolderName"]

def test_rule_simulator():
    # Test MSI rule simulation
    msi_rule = {
        "type": "msi",
        "productCode": "{12345678-1234-1234-1234-1234567890AB}"
    }
    res = RuleSimulator.simulate_rule(msi_rule)
    assert res["status"] in ["simulated_pass", "success", "not_detected"]

    # Test invalid MSI GUID
    invalid_msi = {
        "type": "msi",
        "productCode": "invalid-guid"
    }
    res_inv = RuleSimulator.simulate_rule(invalid_msi)
    assert res_inv["status"] == "warning"

    # Test Script rule simulation
    script_rule = {
        "type": "script",
        "scriptContent": "Write-Output 'Installed'; exit 0"
    }
    res_script = RuleSimulator.simulate_rule(script_rule)
    assert res_script["detected"] is True

def test_api_fleet_baselines():
    response = client.get("/api/catalog/baselines")
    assert response.status_code == 200
    data = response.json()
    assert "baselines" in data
    assert len(data["baselines"]) >= 3
    assert any(b["id"] == "baseline-developer-workstation" for b in data["baselines"])

def test_api_winget_search_and_get():
    search_resp = client.get("/api/winget/search?query=docker")
    assert search_resp.status_code == 200
    data = search_resp.json()
    assert data["total"] > 0
    assert any("Docker" in p["name"] for p in data["packages"])

    get_resp = client.get("/api/winget/Docker.DockerDesktop")
    assert get_resp.status_code == 200
    pkg_data = get_resp.json()
    assert pkg_data["name"] == "Docker Desktop"

def test_api_scripts_and_simulate():
    # Curated scripts endpoint
    curated_resp = client.get("/api/scripts/curated")
    assert curated_resp.status_code == 200
    assert len(curated_resp.json()["scripts"]) >= 5

    # Simulate rule endpoint
    sim_resp = client.post("/api/rules/simulate", json={
        "rule": {
            "type": "file",
            "path": "%ProgramFiles%\\TestApp",
            "fileOrFolderName": "testapp.exe",
            "detectionType": "exists"
        }
    })
    assert sim_resp.status_code == 200
    assert "detected" in sim_resp.json()

def test_api_batch_deploy():
    payload = {
        "apps": [
            {
                "app_name": "App 1",
                "publisher": "Pub 1",
                "version": "1.0.0",
                "filename": "app1.exe",
                "install_command": "app1.exe /S",
                "uninstall_command": "app1.exe /uninstall",
                "install_behavior": "system",
                "detection_rules": [{"type": "file", "path": "C:\\", "fileOrFolderName": "app1.exe"}],
                "target_group_id": "all-devices",
                "assignment_intent": "required"
            },
            {
                "app_name": "App 2",
                "publisher": "Pub 2",
                "version": "2.0.0",
                "filename": "app2.exe",
                "install_command": "app2.exe /S",
                "uninstall_command": "app2.exe /uninstall",
                "install_behavior": "system",
                "detection_rules": [{"type": "file", "path": "C:\\", "fileOrFolderName": "app2.exe"}],
                "target_group_id": "all-devices",
                "assignment_intent": "required"
            }
        ],
        "target_group_id": "all-devices",
        "assignment_intent": "required",
        "batch_name": "Fleet Baseline Rollout"
    }

    resp = client.post("/api/deploy/batch", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2
    assert len(data["job_ids"]) == 2
    assert data["status"] == "queued"

def test_api_tenant_profiles():
    resp = client.get("/api/tenant/profiles")
    assert resp.status_code == 200
    profiles = resp.json()["profiles"]
    assert len(profiles) >= 3

    # Activate profile
    act_resp = client.post(f"/api/tenant/profiles/{profiles[0]['id']}/activate")
    assert act_resp.status_code == 200
    assert act_resp.json()["status"] == "success"
