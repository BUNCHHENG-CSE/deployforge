import fs from 'fs';
import path from 'path';

const WORKSPACE_DIR = path.join(process.cwd(), 'workspace');
export const PACKAGES_DIR = path.join(WORKSPACE_DIR, 'packages');
export const DOWNLOADS_DIR = path.join(WORKSPACE_DIR, 'downloads');
export const UPLOADS_DIR = path.join(WORKSPACE_DIR, 'uploads');

export const StorageManager = {
  init() {
    [WORKSPACE_DIR, PACKAGES_DIR, DOWNLOADS_DIR, UPLOADS_DIR].forEach((dir) => {
      if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  },

  getPackagePath(filename: string): string {
    this.init();
    return path.join(PACKAGES_DIR, filename);
  },

  getDownloadPath(filename: string): string {
    this.init();
    return path.join(DOWNLOADS_DIR, filename);
  },

  getUploadPath(filename: string): string {
    this.init();
    return path.join(UPLOADS_DIR, filename);
  },

  packageExists(filename: string): boolean {
    return fs.existsSync(/*turbopackIgnore: true*/ this.getPackagePath(filename));
  },
};
