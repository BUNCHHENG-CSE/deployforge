import uuid
import datetime
from typing import List, Dict, Any, Optional
from prisma import Json
from prisma.models import Tenant, DeploymentJob, CustomPackage

from app.db.prisma_client import get_prisma


class PrismaTenantRepository:
    """High-performance Tenant operations powered by Prisma ORM."""

    @classmethod
    async def get_by_id(cls, tenant_id: str, include_jobs: bool = False) -> Optional[Tenant]:
        client = await get_prisma()
        return await client.tenant.find_unique(
            where={"id": tenant_id},
            include={"jobs": True} if include_jobs else None
        )

    @classmethod
    async def upsert_tenant(
        cls,
        tenant_id: str,
        display_name: str,
        auth_mode: str,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        is_simulation: bool = False
    ) -> Tenant:
        client = await get_prisma()
        now = datetime.datetime.now(datetime.timezone.utc)

        update_data: Dict[str, Any] = {
            "displayName": display_name,
            "authMode": auth_mode,
            "isSimulation": is_simulation,
            "updatedAt": now
        }
        if client_id is not None:
            update_data["clientId"] = client_id
        if client_secret is not None:
            update_data["clientSecret"] = client_secret
        if access_token is not None:
            update_data["accessToken"] = access_token
        if refresh_token is not None:
            update_data["refreshToken"] = refresh_token

        create_data: Dict[str, Any] = {
            "id": tenant_id,
            "displayName": display_name,
            "authMode": auth_mode,
            "clientId": client_id,
            "clientSecret": client_secret,
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "isSimulation": is_simulation,
            "createdAt": now,
            "updatedAt": now
        }

        return await client.tenant.upsert(
            where={"id": tenant_id},
            data={"create": create_data, "update": update_data}
        )

    @classmethod
    async def list_tenants(cls) -> List[Tenant]:
        client = await get_prisma()
        return await client.tenant.find_many(
            order={"createdAt": "desc"}
        )


class PrismaJobRepository:
    """High-performance Intune Deployment Job operations powered by Prisma ORM."""

    @classmethod
    async def create_job(cls, job_dict: Dict[str, Any]) -> DeploymentJob:
        client = await get_prisma()

        tenant_id = job_dict.get("tenant_id") or "tenant-simulated-contoso-corp"
        tenant = await client.tenant.find_unique(where={"id": tenant_id})
        if not tenant:
            # Seed tenant atomically
            await client.tenant.create(
                data={
                    "id": tenant_id,
                    "displayName": job_dict.get("tenant_name", "Tenant"),
                    "authMode": "simulation" if job_dict.get("is_simulation") else "live",
                    "isSimulation": bool(job_dict.get("is_simulation"))
                }
            )

        req_data = job_dict.get("request", {})
        detection_rules = req_data.get("detection_rules", [])
        logs = job_dict.get("logs", [])

        return await client.deploymentjob.create(
            data={
                "jobId": job_dict["job_id"],
                "tenantId": tenant_id,
                "appName": job_dict["app_name"],
                "publisher": job_dict["publisher"],
                "version": job_dict["version"],
                "status": job_dict.get("status", "pending"),
                "progress": job_dict.get("progress", 0),
                "currentStep": job_dict.get("current_step", "Queued"),
                "targetGroupId": req_data.get("target_group_id", "all-devices"),
                "assignmentIntent": req_data.get("assignment_intent", "required"),
                "architecture": req_data.get("architecture", "x64"),
                "installCommand": req_data.get("install_command", ""),
                "uninstallCommand": req_data.get("uninstall_command", ""),
                "installBehavior": req_data.get("install_behavior", "system"),
                "deviceRestartBehavior": req_data.get("device_restart_behavior", "suppress"),
                "detectionRules": Json(detection_rules),
                "logs": Json(logs),
                "isSimulation": bool(job_dict.get("is_simulation")),
                "createdAt": datetime.datetime.now(datetime.timezone.utc)
            }
        )

    @classmethod
    async def get_job(cls, job_id: str, include_tenant: bool = True) -> Optional[DeploymentJob]:
        client = await get_prisma()
        return await client.deploymentjob.find_unique(
            where={"jobId": job_id},
            include={"tenant": True} if include_tenant else None
        )

    @classmethod
    async def list_jobs(
        cls,
        tenant_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[DeploymentJob]:
        client = await get_prisma()
        where_clause: Dict[str, Any] = {}
        if tenant_id:
            where_clause["tenantId"] = tenant_id
        if status:
            where_clause["status"] = status

        return await client.deploymentjob.find_many(
            where=where_clause,
            order={"createdAt": "desc"},
            take=limit,
            include={"tenant": True}
        )

    @classmethod
    async def append_log_and_update(
        cls,
        job_id: str,
        message: str,
        level: str = "info",
        progress: Optional[int] = None,
        status: Optional[str] = None,
        intunewin_filename: Optional[str] = None,
        intune_app_id: Optional[str] = None,
        error: Optional[str] = None
    ) -> Optional[DeploymentJob]:
        client = await get_prisma()
        job = await client.deploymentjob.find_unique(where={"jobId": job_id})
        if not job:
            return None

        update_data: Dict[str, Any] = {}
        now = datetime.datetime.now(datetime.timezone.utc)
        now_str = now.isoformat()

        current_progress = job.progress
        if progress is not None:
            update_data["progress"] = progress
            update_data["currentStep"] = message
            current_progress = progress

        if status:
            update_data["status"] = status
            if status in ["completed", "failed"]:
                update_data["completedAt"] = now

        if intunewin_filename:
            update_data["intunewinFilename"] = intunewin_filename
        if intune_app_id:
            update_data["intuneAppId"] = intune_app_id
        if error:
            update_data["error"] = error

        # Append to logs JSON array
        new_log = {
            "timestamp": now_str,
            "message": message,
            "level": level,
            "progress": current_progress
        }
        current_logs = list(job.logs) if job.logs else []
        current_logs.append(new_log)
        update_data["logs"] = Json(current_logs)

        return await client.deploymentjob.update(
            where={"jobId": job_id},
            data=update_data
        )

    @classmethod
    async def get_job_stats(cls, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Calculates deployment job metrics and breakdown using Prisma Query Engine or SQLite.
        """
        from app.config import settings
        from app.db.prisma_client import prisma_manager
        if settings.IS_SQLITE or not prisma_manager.is_connected():
            from app.db.repository import JobRepository
            return JobRepository.get_job_stats(tenant_id=tenant_id)

        client = await get_prisma()
        where_clause: Dict[str, Any] = {}
        if tenant_id:
            where_clause["tenantId"] = tenant_id

        # Total count
        total_count = await client.deploymentjob.count(where=where_clause)

        # Status counts
        status_groups = await client.deploymentjob.group_by(
            by=["status"],
            where=where_clause,
            count=True
        )

        status_breakdown = {g["status"]: g["_count"]["_all"] for g in status_groups}

        return {
            "total_jobs": total_count,
            "completed": status_breakdown.get("completed", 0),
            "running": status_breakdown.get("running", 0),
            "pending": status_breakdown.get("pending", 0),
            "failed": status_breakdown.get("failed", 0),
            "status_breakdown": status_breakdown
        }

    @classmethod
    async def delete_job(cls, job_id: str) -> Optional[DeploymentJob]:
        client = await get_prisma()
        try:
            return await client.deploymentjob.delete(where={"jobId": job_id})
        except Exception:
            return None


class PrismaPackageRepository:
    """High-performance Custom Binary Package repository powered by Prisma ORM."""

    @classmethod
    async def save_package(
        cls,
        file_token: str,
        filename: str,
        size_bytes: int,
        file_type: str,
        engine: str,
        metadata: Dict[str, Any]
    ) -> CustomPackage:
        client = await get_prisma()
        pkg_id = f"pkg-{uuid.uuid4().hex[:12]}"

        return await client.custompackage.create(
            data={
                "id": pkg_id,
                "fileToken": file_token,
                "filename": filename,
                "sizeBytes": size_bytes,
                "fileType": file_type,
                "engine": engine,
                "analysisMetadata": Json(metadata),
                "createdAt": datetime.datetime.now(datetime.timezone.utc)
            }
        )

    @classmethod
    async def get_by_token(cls, file_token: str) -> Optional[CustomPackage]:
        client = await get_prisma()
        return await client.custompackage.find_unique(where={"fileToken": file_token})

    @classmethod
    async def list_packages(cls, limit: int = 50) -> List[CustomPackage]:
        client = await get_prisma()
        return await client.custompackage.find_many(
            order={"createdAt": "desc"},
            take=limit
        )
