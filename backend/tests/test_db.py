import pytest
import datetime
from starlette.testclient import TestClient
from app.main import app
from app.db.session import check_db_health, init_db, SessionLocal
from app.db.repository import TenantRepository, JobRepository, PackageRepository

client = TestClient(app)

def test_db_health():
    res = check_db_health()
    assert res["status"] == "healthy"
    assert "latency_ms" in res
    assert res["latency_ms"] < 200.0 # Fast local query
    assert "pool" in res

def test_db_health_api_endpoint():
    res = client.get("/api/db/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "pool" in data

def test_tenant_repository():
    t_id = "test-tenant-contoso-corp"
    tenant = TenantRepository.upsert_tenant(
        tenant_id=t_id,
        display_name="Contoso Corp Test",
        auth_mode="service_principal",
        client_id="mock-client-id",
        client_secret="mock-secret",
        is_simulation=False
    )
    assert tenant.id == t_id
    assert tenant.display_name == "Contoso Corp Test"

    # Query back
    queried = TenantRepository.get_by_id(t_id)
    assert queried is not None
    assert queried.auth_mode == "service_principal"

def test_job_repository_crud():
    import uuid
    job_id = f"job-test-{uuid.uuid4().hex[:8]}"
    job_data = {
        "job_id": job_id,
        "tenant_id": "test-tenant-contoso-corp",
        "app_name": "Google Chrome (Enterprise Test)",
        "publisher": "Google LLC",
        "version": "124.0.6367.60",
        "status": "pending",
        "progress": 0,
        "current_step": "Queued",
        "request": {
            "target_group_id": "all-devices",
            "assignment_intent": "required",
            "architecture": "x64",
            "install_command": "ChromeStandaloneSetup64.exe /silent /install",
            "uninstall_command": "msiexec /x {GUID} /qn",
            "detection_rules": [
                {
                    "type": "file",
                    "path": "%ProgramFiles%\\Google\\Chrome",
                    "fileOrFolderName": "chrome.exe",
                    "detectionType": "exists"
                }
            ]
        },
        "logs": [
            {
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "message": "Job initiated",
                "level": "info",
                "progress": 0
            }
        ],
        "is_simulation": True
    }

    # 1. Create Job
    job = JobRepository.create_job(job_data)
    assert job.job_id == job_id
    assert job.app_name == "Google Chrome (Enterprise Test)"
    assert len(job.detection_rules) == 1

    # 2. Append Log & Update Status
    updated = JobRepository.append_log_and_update(
        job_id=job_id,
        message="Packaged .intunewin successfully",
        level="success",
        progress=50,
        status="running",
        intunewin_filename="Chrome_124.intunewin"
    )
    assert updated.progress == 50
    assert updated.status == "running"
    assert updated.intunewin_filename == "Chrome_124.intunewin"
    assert len(updated.logs) == 2

    # 3. Retrieve
    retrieved = JobRepository.get_job(job_id)
    assert retrieved is not None
    assert retrieved.intunewin_filename == "Chrome_124.intunewin"

    # 4. List Jobs
    all_jobs = JobRepository.list_jobs(limit=10)
    assert any(j.job_id == job_id for j in all_jobs)

def test_package_repository():
    import uuid
    token = f"test-token-{uuid.uuid4().hex[:8]}"
    pkg = PackageRepository.save_package(
        file_token=token,
        filename="SetupTest.exe",
        size_bytes=1048576,
        file_type=".exe",
        engine="Inno Setup",
        metadata={"architecture": "x64", "version": "1.0.0"}
    )
    assert pkg.file_token == token
    assert pkg.engine == "Inno Setup"
