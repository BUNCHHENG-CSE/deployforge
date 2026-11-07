import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');

    const where = tenantId ? { tenantId } : {};

    const [total, completed, failed, running] = await Promise.all([
      prisma.deploymentJob.count({ where }),
      prisma.deploymentJob.count({ where: { ...where, status: 'completed' } }),
      prisma.deploymentJob.count({ where: { ...where, status: 'failed' } }),
      prisma.deploymentJob.count({
        where: { ...where, status: { in: ['running', 'pending'] } },
      }),
    ]);

    return NextResponse.json({
      total_deployments: total,
      completed_count: completed,
      failed_count: failed,
      active_running: running,
      success_rate: total > 0 ? `${Math.round((completed / total) * 100)}%` : '100%',
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: 500 });
  }
}
