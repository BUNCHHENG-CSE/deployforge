import fs from 'fs';
import path from 'path';

const WORKSPACE_DIR = path.join(process.cwd(), 'workspace');
export const PACKAGES_DIR = path.join(WORKSPACE_DIR, 'packages');
export const DOWNLOADS_DIR = path.join(WORKSPACE_DIR, 'downloads');
export const UPLOADS_DIR = path.join(WORKSPACE_DIR, 'uploads');

let initialized = false;

/**
 * Reduce an untrusted filename to a safe basename so it can never escape its
 * workspace directory (blocks "../", absolute paths, and Windows separators).
 */
export function sanitizeFilename(filename: string): string {
  const base = path.basename(String(filename).replace(/\\/g, '/'));
  const cleaned = base.replace(/[\x00-\x1f<>:"|?*]/g, '_').trim();
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new Error('Invalid filename');
  }
  return cleaned;
}

function resolveIn(dir: string, filename: string): string {
  return path.join(dir, sanitizeFilename(filename));
}

export const StorageManager = {
  init() {
    if (initialized) return;
    [WORKSPACE_DIR, PACKAGES_DIR, DOWNLOADS_DIR, UPLOADS_DIR].forEach((dir) => {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    });
    initialized = true;
  },

  getPackagePath(filename: string): string {
    this.init();
    return resolveIn(PACKAGES_DIR, filename);
  },

  getDownloadPath(filename: string): string {
    this.init();
    return resolveIn(DOWNLOADS_DIR, filename);
  },

  getUploadPath(filename: string): string {
    this.init();
    return resolveIn(UPLOADS_DIR, filename);
  },

  packageExists(filename: string): boolean {
    return fs.existsSync(/*turbopackIgnore: true*/ this.getPackagePath(filename));
  },
};
