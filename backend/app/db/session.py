import os
import time
import logging
from typing import Generator, Dict, Any, Optional
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from app.config import settings
from app.db.models import Base, Tenant

logger = logging.getLogger("deployforge.db")


def build_engine(database_url: Optional[str] = None):
    url = database_url or settings.DATABASE_URL
    is_sqlite = url.startswith("sqlite")

    engine_kwargs: Dict[str, Any] = {
        "echo": False,
    }

    if is_sqlite:
        # SQLite connection arguments for multi-threaded FastAPI
        engine_kwargs["connect_args"] = {"check_same_thread": False}

        # Ensure target directory for local SQLite file exists
        db_file = url.replace("sqlite:///", "")
        if db_file and not db_file.startswith(":memory:"):
            norm_path = os.path.normpath(db_file)
            db_dir = os.path.dirname(norm_path)
            if db_dir:
                os.makedirs(db_dir, exist_ok=True)
    else:
        engine_kwargs.update({
            "poolclass": QueuePool,
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_recycle": settings.DB_POOL_RECYCLE,
            "pool_pre_ping": settings.DB_POOL_PRE_PING,
        })

    created = create_engine(url, **engine_kwargs)

    # Enable WAL mode and foreign key enforcement on SQLite
    if is_sqlite:
        @event.listens_for(created, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA journal_mode=WAL;")
                cursor.execute("PRAGMA foreign_keys=ON;")
            except Exception:
                pass
            finally:
                cursor.close()

    return created


try:
    engine = build_engine()
except Exception as e:
    logger.warning(f"Could not initialize primary database engine: {e}")
    # Fallback to local SQLite if PostgreSQL connection string fails parsing
    engine = build_engine(f"sqlite:///{settings.SQLITE_PATH.replace(chr(92), '/')}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db(database_engine=None) -> bool:
    """Initializes tables and seeds default simulation tenant."""
    eng = database_engine or engine
    try:
        Base.metadata.create_all(bind=eng)
        logger.info("Database tables initialized successfully.")

        # Ensure default sandbox tenant exists
        with Session(eng) as session:
            sandbox_tenant = session.query(Tenant).filter_by(id="tenant-simulated-contoso-corp").first()
            if not sandbox_tenant:
                sandbox_tenant = Tenant(
                    id="tenant-simulated-contoso-corp",
                    display_name="Contoso Corp (Sandbox)",
                    auth_mode="simulation",
                    is_simulation=True
                )
                session.add(sandbox_tenant)
                session.commit()
                logger.info("Default simulation tenant seeded.")
        return True
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        return False


# Auto-seed SQLite schema immediately so tables are always available
if settings.IS_SQLITE:
    try:
        init_db(engine)
    except Exception as e:
        logger.warning(f"Could not auto-seed SQLite tables: {e}")


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_health() -> Dict[str, Any]:
    """Checks database connectivity, latency, and pool statistics."""
    start_time = time.perf_counter()
    try:
        is_sqlite = settings.IS_SQLITE
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1;")).scalar()
            if is_sqlite:
                ver_val = conn.execute(text("SELECT sqlite_version();")).scalar()
                version = f"SQLite {ver_val}"
            else:
                version = "PostgreSQL"
                try:
                    version = conn.execute(text("SELECT version();")).scalar()
                except Exception:
                    pass

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        pool = engine.pool
        pool_stats = {
            "size": getattr(pool, "size", lambda: 0)(),
            "checkedin": getattr(pool, "checkedin", lambda: 0)(),
            "checkedout": getattr(pool, "checkedout", lambda: 0)(),
            "overflow": getattr(pool, "overflow", lambda: 0)(),
        } if hasattr(pool, "size") else {"type": type(pool).__name__}

        if is_sqlite:
            return {
                "status": "healthy",
                "database_engine": "SQLite",
                "database_file": settings.SQLITE_PATH,
                "latency_ms": latency_ms,
                "database_version": version,
                "pool": pool_stats,
                "url_host": "localhost",
                "url_port": "local-file"
            }

        return {
            "status": "healthy",
            "database_engine": "PostgreSQL",
            "latency_ms": latency_ms,
            "database_version": version.split("\n")[0] if version else "Unknown",
            "pool": pool_stats,
            "url_host": settings.POSTGRES_HOST,
            "url_port": settings.POSTGRES_PORT
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "unhealthy",
            "database_engine": "SQLite" if settings.IS_SQLITE else "PostgreSQL",
            "error": str(e),
            "latency_ms": latency_ms,
            "url_host": "localhost" if settings.IS_SQLITE else settings.POSTGRES_HOST,
            "url_port": "local-file" if settings.IS_SQLITE else settings.POSTGRES_PORT
        }
