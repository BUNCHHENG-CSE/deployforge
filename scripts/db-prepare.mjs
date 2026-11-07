import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');

let dbUrl = process.env.DATABASE_URL || '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (key.trim() === 'DATABASE_URL' && !process.env.DATABASE_URL) {
        dbUrl = val;
      }
    }
  }
}

const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://') || process.env.DB_TYPE === 'postgresql';

const sourceSchema = isPostgres
  ? path.join(rootDir, 'prisma', 'schema.postgresql.prisma')
  : path.join(rootDir, 'prisma', 'schema.sqlite.prisma');

const targetSchema = path.join(rootDir, 'prisma', 'schema.prisma');

console.log(`[TCT DeployForge DB] Target engine: ${isPostgres ? 'PostgreSQL (Neon / Production)' : 'SQLite (Local)'}`);
if (fs.existsSync(sourceSchema)) {
  fs.copyFileSync(sourceSchema, targetSchema);
  console.log(`[TCT DeployForge DB] Synchronized active schema -> prisma/schema.prisma`);
} else {
  console.warn(`[TCT DeployForge DB] Warning: source schema ${sourceSchema} not found.`);
}

try {
  console.log(`[TCT DeployForge DB] Running prisma generate...`);
  execSync('bunx prisma generate', { stdio: 'inherit' });
  console.log(`[TCT DeployForge DB] Prisma Client generated successfully.`);
} catch (e) {
  console.error(`[TCT DeployForge DB] Failed to run prisma generate:`, e.message);
}
