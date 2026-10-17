import os

class Settings:
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

    # PostgreSQL Configuration
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "deployforge")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "deployforge_secret")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5433")) # Port 5433 avoids collision with local postgres
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "deployforge")

    @property
    def POSTGRES_HOST(self) -> str:
        env_host = os.getenv("POSTGRES_HOST")
        if env_host:
            return env_host

        # On Windows, if WSL Docker is running, use WSL IP directly for instant zero-latency connection
        import sys
        if sys.platform == "win32":
            try:
                import subprocess
                ips = subprocess.check_output(["wsl", "hostname", "-I"], text=True, timeout=1).split()
                if ips:
                    return ips[0]
            except Exception:
                pass

        return "127.0.0.1"

    # Connection String (can be explicitly provided or dynamically computed)
    @property
    def DATABASE_URL(self) -> str:
        explicit_url = os.getenv("DATABASE_URL")
        if explicit_url:
            return explicit_url
        return f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Connection Pooling Optimizations for Production
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "20"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "1800")) # 30 min recycle prevents stale dropped sockets
    DB_POOL_PRE_PING: bool = os.getenv("DB_POOL_PRE_PING", "true").lower() in ("true", "1", "yes")

    # App Secrets
    SECRET_KEY: str = os.getenv("SECRET_KEY", "deployforge-super-secret-key-change-in-production")

settings = Settings()
