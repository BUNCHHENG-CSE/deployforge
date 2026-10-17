import os
import shutil
import uuid
from typing import Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORKSPACE_DIR = os.path.join(BASE_DIR, "workspace")
UPLOADS_DIR = os.path.join(WORKSPACE_DIR, "uploads")
PACKAGES_DIR = os.path.join(WORKSPACE_DIR, "packages")
DOWNLOADS_DIR = os.path.join(WORKSPACE_DIR, "downloads")

def ensure_workspace():
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(PACKAGES_DIR, exist_ok=True)
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)

class StorageManager:
    @classmethod
    def init(cls):
        ensure_workspace()

    @classmethod
    def save_upload(cls, filename: str, content: bytes) -> tuple[str, str]:
        """Saves an uploaded file and returns (file_token, full_path)."""
        ensure_workspace()
        token = str(uuid.uuid4())
        safe_name = os.path.basename(filename)
        dest_dir = os.path.join(UPLOADS_DIR, token)
        os.makedirs(dest_dir, exist_ok=True)
        file_path = os.path.join(dest_dir, safe_name)
        with open(file_path, "wb") as f:
            f.write(content)
        return token, file_path

    @classmethod
    def get_upload_path(cls, file_token: str) -> Optional[str]:
        target_dir = os.path.join(UPLOADS_DIR, file_token)
        if not os.path.exists(target_dir):
            return None
        files = os.listdir(target_dir)
        if not files:
            return None
        return os.path.join(target_dir, files[0])

    @classmethod
    def get_package_path(cls, filename: str) -> str:
        ensure_workspace()
        return os.path.join(PACKAGES_DIR, filename)

    @classmethod
    def cleanup_old_files(cls, max_age_hours: int = 24):
        """Removes old transient workspaces."""
        import time
        now = time.time()
        for folder in [UPLOADS_DIR, PACKAGES_DIR]:
            if not os.path.exists(folder):
                continue
            for item in os.listdir(folder):
                p = os.path.join(folder, item)
                try:
                    if os.path.isdir(p) and (now - os.path.getmtime(p) > max_age_hours * 3600):
                        shutil.rmtree(p, ignore_errors=True)
                except Exception:
                    pass
