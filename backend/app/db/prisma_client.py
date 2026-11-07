import os
import time
import asyncio
import logging
from typing import Optional, Dict, Any
from prisma import Prisma

from app.config import settings

logger = logging.getLogger("deployforge.prisma")


class PrismaManager:
    """
    Manages the lifecycle and connection state of the database client.
    When configured for PostgreSQL, uses Prisma's Rust Query Engine for high-speed, type-safe operations.
    When running in local SQLite mode, provides zero-dependency persistence via SQLAlchemy.
    """
    _instance: Optional["PrismaManager"] = None
    _client: Optional[Prisma] = None
    _loop: Optional[asyncio.AbstractEventLoop] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PrismaManager, cls).__new__(cls)
        return cls._instance

    def get_client(self) -> Prisma:
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if self._client is None or (current_loop is not None and self._loop != current_loop):
            self._client = Prisma(
                datasource={"url": settings.PRISMA_DATABASE_URL},
                use_dotenv=False
            )
            self._loop = current_loop
        return self._client

    @property
    def client(self) -> Prisma:
        return self.get_client()

    async def connect(self) -> bool:
        """Connects the database engine."""
        if settings.IS_SQLITE:
            logger.info("Local SQLite database active (zero Docker dependencies).")
            return True

        client = self.get_client()
        try:
            if not client.is_connected():
                await client.connect()
                logger.info(f"Prisma Query Engine connected to PostgreSQL at {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect Prisma Query Engine: {e}")
            return False

    async def disconnect(self) -> None:
        """Gracefully disconnects the database engine."""
        if settings.IS_SQLITE:
            return
        try:
            if self._client is not None and self._client.is_connected():
                await self._client.disconnect()
                logger.info("Prisma Query Engine disconnected gracefully.")
        except Exception as e:
            logger.warning(f"Error disconnecting Prisma Query Engine: {e}")

    def is_connected(self) -> bool:
        if settings.IS_SQLITE:
            return True
        return self._client is not None and self._client.is_connected()


# Global Singleton Manager
prisma_manager = PrismaManager()


async def get_prisma() -> Prisma:
    """Async dependency for FastAPI or background services to obtain active Prisma client."""
    client = prisma_manager.get_client()
    if not settings.IS_SQLITE and not client.is_connected():
        await client.connect()
    return client


async def check_prisma_health() -> Dict[str, Any]:
    """
    Executes a health check against the database engine.
    Measures latency, tenant count, and active job counts.
    """
    if settings.IS_SQLITE:
        start_time = time.perf_counter()
        try:
            from app.db.session import SessionLocal
            from app.db.models import Tenant, DeploymentJob
            with SessionLocal() as session:
                tenant_count = session.query(Tenant).count()
                job_count = session.query(DeploymentJob).count()

            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "status": "healthy",
                "orm": "Local SQLite Engine (Zero-Dependency)",
                "connected": True,
                "latency_ms": latency_ms,
                "tenants_count": tenant_count,
                "deployment_jobs_count": job_count,
                "host": "localhost",
                "port": "local-file",
                "database": os.path.basename(settings.SQLITE_PATH),
                "engine": "SQLite"
            }
        except Exception as e:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "status": "unhealthy",
                "orm": "Local SQLite Engine",
                "connected": False,
                "error": str(e),
                "latency_ms": latency_ms,
                "host": "localhost",
                "port": "local-file"
            }

    try:
        client = await get_prisma()
        start_time = time.perf_counter()
        # High-speed parallel queries via Prisma
        tenant_count = await client.tenant.count()
        job_count = await client.deploymentjob.count()

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "healthy",
            "orm": "Prisma Python (Rust Query Engine)",
            "connected": True,
            "latency_ms": latency_ms,
            "tenants_count": tenant_count,
            "deployment_jobs_count": job_count,
            "host": settings.POSTGRES_HOST,
            "port": settings.POSTGRES_PORT,
            "database": settings.POSTGRES_DB
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "unhealthy",
            "orm": "Prisma Python (Rust Query Engine)",
            "connected": False,
            "error": str(e),
            "latency_ms": latency_ms,
            "host": settings.POSTGRES_HOST,
            "port": settings.POSTGRES_PORT
        }
