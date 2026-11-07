import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SQLITE_PATH = os.path.join(BASE_DIR, "workspace", "deployforge.db")


class Settings:
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

    # Database Mode: "sqlite" (default for zero-dependency local dev) or "postgresql"
    DB_TYPE: str = os.getenv("DB_TYPE", "sqlite").lower()

    # SQLite Configuration
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", DEFAULT_SQLITE_PATH)

    # PostgreSQL Configuration
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "deployforge")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "deployforge_secret")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5433"))  # Port 5433 avoids collision with local postgres
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "deployforge")

    @property
    def IS_SQLITE(self) -> bool:
        """Determines if application is running in SQLite mode."""
        db_type = os.getenv("DB_TYPE")
        if db_type:
            return db_type.lower() == "sqlite"
        explicit_url = os.getenv("DATABASE_URL")
        if explicit_url:
            return explicit_url.startswith("sqlite") or explicit_url.startswith("file:")
        return self.DB_TYPE == "sqlite"

    @property
    def POSTGRES_HOST(self) -> str:
        env_host = os.getenv("POSTGRES_HOST")
        if env_host:
            return env_host

        # On Windows, if WSL Docker is running, use WSL IP directly for instant zero-latency connection
        if sys.platform == "win32":
            try:
                import subprocess
                ips = subprocess.check_output(["wsl", "hostname", "-I"], text=True, timeout=1).split()
                if ips:
                    return ips[0]
            except Exception:
                pass

        return "127.0.0.1"

    # Connection String (dynamically computed or explicit)
    @property
    def DATABASE_URL(self) -> str:
        if self.IS_SQLITE:
            explicit_url = os.getenv("DATABASE_URL")
            if explicit_url and (explicit_url.startswith("sqlite") or explicit_url.startswith("file:")):
                return explicit_url
            normalized_path = self.SQLITE_PATH.replace("\\", "/")
            return f"sqlite:///{normalized_path}"

        explicit_url = os.getenv("DATABASE_URL")
        if explicit_url and not explicit_url.startswith("sqlite"):
            url = explicit_url
            if url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg://", 1)
            if "?schema=" in url:
                url = url.split("?schema=")[0]
            elif "&schema=" in url:
                url = url.split("&schema=")[0]
            return url
        return f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def PRISMA_DATABASE_URL(self) -> str:
        if self.IS_SQLITE:
            normalized_path = self.SQLITE_PATH.replace("\\", "/")
            return f"file:{normalized_path}"

        explicit_url = os.getenv("DATABASE_URL")
        if explicit_url and not explicit_url.startswith("sqlite"):
            if "+psycopg" in explicit_url:
                explicit_url = explicit_url.replace("+psycopg", "")
            return explicit_url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}?schema=public"

    # Connection Pooling Optimizations for Production
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "20"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))  # 30 min recycle prevents stale dropped sockets
    DB_POOL_PRE_PING: bool = os.getenv("DB_POOL_PRE_PING", "true").lower() in ("true", "1", "yes")

    # App Secrets
    SECRET_KEY: str = os.getenv("SECRET_KEY", "deployforge-super-secret-key-change-in-production")


settings = Settings()
