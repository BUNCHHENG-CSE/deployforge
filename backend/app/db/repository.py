import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.models import Tenant, DeploymentJob, CustomPackage
from app.db.session import SessionLocal

class TenantRepository:
    @classmethod
    def get_by_id(cls, tenant_id: str, db: Optional[Session] = None) -> Optional[Tenant]:
        session = db or SessionLocal()
        try:
            return session.query(Tenant).filter_by(id=tenant_id).first()
        finally:
            if not db:
                session.close()

    @classmethod
    def upsert_tenant(
        cls,
        tenant_id: str,
        display_name: str,
        auth_mode: str,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        is_simulation: bool = False,
        db: Optional[Session] = None
    ) -> Tenant:
        session = db or SessionLocal()
        try:
            tenant = session.query(Tenant).filter_by(id=tenant_id).first()
            if not tenant:
                tenant = Tenant(
                    id=tenant_id,
                    display_name=display_name,
                    auth_mode=auth_mode,
                    client_id=client_id,
                    client_secret=client_secret,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    is_simulation=is_simulation
                )
                session.add(tenant)
            else:
                tenant.display_name = display_name
                tenant.auth_mode = auth_mode
                if client_id:
                    tenant.client_id = client_id
                if client_secret:
                    tenant.client_secret = client_secret
                if access_token:
                    tenant.access_token = access_token
                if refresh_token:
                    tenant.refresh_token = refresh_token
                tenant.is_simulation = is_simulation
                tenant.updated_at = datetime.datetime.now(datetime.timezone.utc)

            session.commit()
            session.refresh(tenant)
            return tenant
        finally:
            if not db:
                session.close()

    @classmethod
    def list_tenants(cls, limit: int = 50, db: Optional[Session] = None) -> List[Tenant]:
        session = db or SessionLocal()
        try:
            return session.query(Tenant).order_by(desc(Tenant.created_at)).limit(limit).all()
        finally:
            if not db:
                session.close()

class JobRepository:
    @classmethod
    def create_job(cls, job_dict: Dict[str, Any], db: Optional[Session] = None) -> DeploymentJob:
        session = db or SessionLocal()
        try:
            # Ensure tenant exists
            tenant_id = job_dict.get("tenant_id") or "tenant-simulated-contoso-corp"
            tenant = session.query(Tenant).filter_by(id=tenant_id).first()
            if not tenant:
                tenant = Tenant(
                    id=tenant_id,
                    display_name=job_dict.get("tenant_name", "Tenant"),
                    auth_mode="simulation" if job_dict.get("is_simulation") else "live",
                    is_simulation=bool(job_dict.get("is_simulation"))
                )
                session.add(tenant)
                session.commit()

            req_data = job_dict.get("request", {})
            job = DeploymentJob(
                job_id=job_dict["job_id"],
                tenant_id=tenant_id,
                app_name=job_dict["app_name"],
                publisher=job_dict["publisher"],
                version=job_dict["version"],
                status=job_dict.get("status", "pending"),
                progress=job_dict.get("progress", 0),
                current_step=job_dict.get("current_step", "Queued"),
                target_group_id=req_data.get("target_group_id", "all-devices"),
                assignment_intent=req_data.get("assignment_intent", "required"),
                architecture=req_data.get("architecture", "x64"),
                install_command=req_data.get("install_command", ""),
                uninstall_command=req_data.get("uninstall_command", ""),
                install_behavior=req_data.get("install_behavior", "system"),
                device_restart_behavior=req_data.get("device_restart_behavior", "suppress"),
                detection_rules=req_data.get("detection_rules", []),
                logs=job_dict.get("logs", []),
                is_simulation=bool(job_dict.get("is_simulation")),
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )
            session.add(job)
            session.commit()
            session.refresh(job)
            return job
        finally:
            if not db:
                session.close()

    @classmethod
    def get_job(cls, job_id: str, db: Optional[Session] = None) -> Optional[DeploymentJob]:
        session = db or SessionLocal()
        try:
            return session.query(DeploymentJob).filter_by(job_id=job_id).first()
        finally:
            if not db:
                session.close()

    @classmethod
    def list_jobs(cls, tenant_id: Optional[str] = None, limit: int = 50, db: Optional[Session] = None) -> List[DeploymentJob]:
        session = db or SessionLocal()
        try:
            q = session.query(DeploymentJob)
            if tenant_id:
                q = q.filter_by(tenant_id=tenant_id)
            return q.order_by(desc(DeploymentJob.created_at)).limit(limit).all()
        finally:
            if not db:
                session.close()

    @classmethod
    def append_log_and_update(
        cls,
        job_id: str,
        message: str,
        level: str = "info",
        progress: Optional[int] = None,
        status: Optional[str] = None,
        intunewin_filename: Optional[str] = None,
        intune_app_id: Optional[str] = None,
        error: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Optional[DeploymentJob]:
        session = db or SessionLocal()
        try:
            job = session.query(DeploymentJob).filter_by(job_id=job_id).first()
            if not job:
                return None

            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            if progress is not None:
                job.progress = progress
                job.current_step = message

            if status:
                job.status = status
                if status in ["completed", "failed"]:
                    job.completed_at = datetime.datetime.now(datetime.timezone.utc)

            if intunewin_filename:
                job.intunewin_filename = intunewin_filename
            if intune_app_id:
                job.intune_app_id = intune_app_id
            if error:
                job.error = error

            # Append to logs JSON array
            new_log = {
                "timestamp": now_str,
                "message": message,
                "level": level,
                "progress": job.progress
            }
            current_logs = list(job.logs) if job.logs else []
            current_logs.append(new_log)
            job.logs = current_logs

            session.commit()
            session.refresh(job)
            return job
        finally:
            if not db:
                session.close()

    @classmethod
    def get_job_stats(cls, tenant_id: Optional[str] = None, db: Optional[Session] = None) -> Dict[str, Any]:
        """Calculates deployment job metrics and status breakdown."""
        session = db or SessionLocal()
        try:
            from sqlalchemy import func
            q = session.query(DeploymentJob)
            if tenant_id:
                q = q.filter_by(tenant_id=tenant_id)
            total_count = q.count()

            status_query = session.query(DeploymentJob.status, func.count(DeploymentJob.job_id))
            if tenant_id:
                status_query = status_query.filter(DeploymentJob.tenant_id == tenant_id)
            status_counts = status_query.group_by(DeploymentJob.status).all()

            status_breakdown = {status: count for status, count in status_counts}

            return {
                "total_jobs": total_count,
                "completed": status_breakdown.get("completed", 0),
                "running": status_breakdown.get("running", 0),
                "pending": status_breakdown.get("pending", 0),
                "failed": status_breakdown.get("failed", 0),
                "status_breakdown": status_breakdown
            }
        finally:
            if not db:
                session.close()

    @classmethod
    def delete_job(cls, job_id: str, db: Optional[Session] = None) -> Optional[DeploymentJob]:
        session = db or SessionLocal()
        try:
            job = session.query(DeploymentJob).filter_by(job_id=job_id).first()
            if job:
                session.delete(job)
                session.commit()
                return job
            return None
        finally:
            if not db:
                session.close()

class PackageRepository:
    @classmethod
    def save_package(
        cls,
        file_token: str,
        filename: str,
        size_bytes: int,
        file_type: str,
        engine: str,
        metadata: Dict[str, Any],
        db: Optional[Session] = None
    ) -> CustomPackage:
        session = db or SessionLocal()
        try:
            import uuid
            pkg = CustomPackage(
                id=f"pkg-{uuid.uuid4().hex[:12]}",
                file_token=file_token,
                filename=filename,
                size_bytes=size_bytes,
                file_type=file_type,
                engine=engine,
                analysis_metadata=metadata
            )
            session.add(pkg)
            session.commit()
            session.refresh(pkg)
            return pkg
        finally:
            if not db:
                session.close()
