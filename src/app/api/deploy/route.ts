import { NextRequest, NextResponse } from 'next/server';
import { DeploymentJobManager } from '@/lib/jobs';
import { currentTenantSession } from '@/lib/data';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (!payload.app_name) {
      return NextResponse.json({ detail: 'app_name is required' }, { status: 400 });
    }

    const jobId = DeploymentJobManager.createJob(payload, currentTenantSession.tenant_id);

    // Asynchronously run pipeline
    setTimeout(() => {
      DeploymentJobManager.executePipeline(jobId, payload);
    }, 50);

    return NextResponse.json({
      job_id: jobId,
      status: 'pending',
      app_name: payload.app_name,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Deployment initiation failed' }, { status: 500 });
  }
}
