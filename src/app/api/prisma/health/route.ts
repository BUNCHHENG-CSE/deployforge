import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const start = Date.now();
  try {
    const tenantCount = await prisma.tenant.count();
    const jobCount = await prisma.deploymentJob.count();
    const latency = Date.now() - start;

    return NextResponse.json({
      status: 'healthy',
      latency_ms: latency,
      query_engine: 'Node-API Rust Query Engine',
      metrics: {
        tenants: tenantCount,
        jobs: jobCount,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: e.message,
      },
      { status: 500 }
    );
  }
}
