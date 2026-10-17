import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_catalog_endpoint():
    res = client.get("/api/catalog")
    assert res.status_code == 200
    data = res.json()
    assert "apps" in data
    assert "categories" in data
    assert len(data["apps"]) > 0

def test_tenant_status_simulation():
    res = client.get("/api/tenant/status")
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is True
    assert "Contoso" in data["tenant_name"]

def test_groups_endpoint():
    res = client.get("/api/tenant/groups")
    assert res.status_code == 200
    data = res.json()
    assert "groups" in data
    assert any(g["id"] == "all-devices" for g in data["groups"])

def test_deploy_and_status():
    payload = {
        "app_name": "Test Tool Application",
        "publisher": "Test Systems Inc.",
        "version": "1.0.0",
        "filename": "testapp.exe",
        "install_command": "testapp.exe /S",
        "uninstall_command": "testapp.exe /uninstall",
        "architecture": "x64",
        "detection_rules": [
            {
                "type": "file",
                "path": "%ProgramFiles%\\TestApp",
                "fileOrFolderName": "testapp.exe",
                "detectionType": "exists"
            }
        ],
        "target_group_id": "all-devices",
        "assignment_intent": "required",
        "is_simulation": True
    }
    res = client.post("/api/deploy", json=payload)
    assert res.status_code == 200
    job_data = res.json()
    assert "job_id" in job_data

    # Query job status
    job_id = job_data["job_id"]
    job_res = client.get(f"/api/jobs/{job_id}")
    assert job_res.status_code == 200
    assert job_res.json()["app_name"] == "Test Tool Application"
