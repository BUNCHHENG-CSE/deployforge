import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const start = Date.now();
  try {
    // Run simple query to test database connectivity
    await prisma.$queryRawUnsafe('SELECT 1');
    const latency = Date.now() - start;
    const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');

    return NextResponse.json({
      status: 'healthy',
      engine: isPostgres ? 'PostgreSQL (Neon)' : 'SQLite (Local)',
      latency_ms: latency,
      connected: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: e.message,
        connected: false,
      },
      { status: 500 }
    );
  }
}
