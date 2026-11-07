import uuid
import asyncio
import pytest
from starlette.testclient import TestClient
from app.config import settings
from app.main import app
from app.db.prisma_client import check_prisma_health
from app.db.prisma_repository import (
    PrismaTenantRepository,
    PrismaJobRepository,
    PrismaPackageRepository
)

client = TestClient(app)

requires_postgresql = pytest.mark.skipif(
    settings.IS_SQLITE,
    reason="Prisma client is configured for PostgreSQL (run with DB_TYPE=postgresql to execute)"
)


def test_prisma_health_service():
    """Verify Prisma Query Engine health, latency, and counts."""
    async def _run():
        res = await check_prisma_health()
        assert res["status"] == "healthy"
        assert res["connected"] is True
        assert "latency_ms" in res
        assert res["latency_ms"] < 500.0
        assert res["tenants_count"] >= 1
        assert "deployment_jobs_count" in res

    asyncio.run(_run())


def test_prisma_health_endpoint():
    """Verify HTTP GET /api/prisma/health returns 200 with engine metrics."""
    res = client.get("/api/prisma/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["connected"] is True
    assert "latency_ms" in data


@requires_postgresql
def test_prisma_tenant_crud():
    """Verify Prisma atomic upsert, query, and list for Tenants."""
    async def _run():
        test_tenant_id = f"test-prisma-tenant-{uuid.uuid4().hex[:6]}"
        tenant = await PrismaTenantRepository.upsert_tenant(
            tenant_id=test_tenant_id,
            display_name="Prisma Enterprise Test Org",
            auth_mode="service_principal",
            client_id="mock-client-id-prisma",
            client_secret="mock-secret-prisma",
            is_simulation=False
        )
        assert tenant.id == test_tenant_id
        assert tenant.displayName == "Prisma Enterprise Test Org"
        assert tenant.authMode == "service_principal"

        # Query back
        queried = await PrismaTenantRepository.get_by_id(test_tenant_id)
        assert queried is not None
        assert queried.id == test_tenant_id
        assert queried.clientId == "mock-client-id-prisma"

        # List tenants
        all_tenants = await PrismaTenantRepository.list_tenants()
        assert any(t.id == test_tenant_id for t in all_tenants)

    asyncio.run(_run())


@requires_postgresql
def test_prisma_job_lifecycle_and_relations():
    """Verify Prisma job creation, relation traversal, JSON log append, stats, and delete."""
    async def _run():
        job_id = f"job-prisma-{uuid.uuid4().hex[:8]}"
        job_data = {
            "job_id": job_id,
            "tenant_id": "tenant-simulated-contoso-corp",
            "app_name": "Slack Enterprise (Prisma Test)",
            "publisher": "Slack Technologies",
            "version": "4.38.125",
            "status": "pending",
            "progress": 0,
            "current_step": "Queued in Prisma Engine",
            "request": {
                "target_group_id": "all-devices",
                "assignment_intent": "required",
                "architecture": "x64",
                "install_command": "SlackSetup.exe --silent",
                "uninstall_command": "SlackSetup.exe --uninstall --silent",
                "detection_rules": [
                    {
                        "type": "file",
                        "path": "%LOCALAPPDATA%\\slack",
                        "fileOrFolderName": "slack.exe",
                        "detectionType": "exists"
                    }
                ]
            },
            "logs": [
                {
                    "timestamp": "2026-10-17T12:00:00Z",
                    "message": "Initialized through Prisma Query Engine",
                    "level": "info",
                    "progress": 0
                }
            ],
            "is_simulation": True
        }

        # 1. Create Job
        job = await PrismaJobRepository.create_job(job_data)
        assert job.jobId == job_id
        assert job.appName == "Slack Enterprise (Prisma Test)"
        assert job.status == "pending"

        # 2. Retrieve with eager relation loading (Job -> Tenant)
        retrieved = await PrismaJobRepository.get_job(job_id, include_tenant=True)
        assert retrieved is not None
        assert retrieved.jobId == job_id
        assert retrieved.tenant is not None
        assert retrieved.tenant.id == "tenant-simulated-contoso-corp"

        # 3. Append log & update progress
        updated = await PrismaJobRepository.append_log_and_update(
            job_id=job_id,
            message="Packaged .intunewin encrypted artifact",
            level="success",
            progress=65,
            status="running",
            intunewin_filename="Slack_4.38.125.intunewin",
            intune_app_id="win32-mock-app-slack"
        )
        assert updated.progress == 65
        assert updated.status == "running"
        assert updated.intunewinFilename == "Slack_4.38.125.intunewin"
        assert updated.intuneAppId == "win32-mock-app-slack"
        assert len(updated.logs) == 2

        # 4. List jobs with filtering
        running_jobs = await PrismaJobRepository.list_jobs(status="running", limit=10)
        assert any(j.jobId == job_id for j in running_jobs)

        # 5. Query stats via Prisma aggregation
        stats = await PrismaJobRepository.get_job_stats()
        assert stats["total_jobs"] >= 1
        assert "status_breakdown" in stats

        # 6. Delete test job
        deleted = await PrismaJobRepository.delete_job(job_id)
        assert deleted is not None
        assert deleted.jobId == job_id

        # Verify deleted
        post_delete = await PrismaJobRepository.get_job(job_id)
        assert post_delete is None

    asyncio.run(_run())


@requires_postgresql
def test_prisma_package_repository():
    """Verify Prisma Custom Binary Package upload persistence and lookup."""
    async def _run():
        token = f"token-prisma-{uuid.uuid4().hex[:8]}"
        pkg = await PrismaPackageRepository.save_package(
            file_token=token,
            filename="AgentSetup.msi",
            size_bytes=4194304,
            file_type=".msi",
            engine="Windows Installer (MSI)",
            metadata={
                "ProductCode": "{12345678-ABCD-1234-ABCD-1234567890AB}",
                "ProductName": "Enterprise Agent",
                "Manufacturer": "Contoso Ltd"
            }
        )
        assert pkg.fileToken == token
        assert pkg.engine == "Windows Installer (MSI)"
        assert pkg.sizeBytes == 4194304

        # Lookup by unique token
        queried = await PrismaPackageRepository.get_by_token(token)
        assert queried is not None
        assert queried.filename == "AgentSetup.msi"

    asyncio.run(_run())


def test_prisma_jobs_stats_endpoint():
    """Verify HTTP GET /api/prisma/jobs/stats endpoint."""
    res = client.get("/api/prisma/jobs/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_jobs" in data
    assert "status_breakdown" in data
