import { NextRequest, NextResponse } from 'next/server';
import { DeploymentJobManager } from '@/lib/jobs';
import { currentTenantSession } from '@/lib/data';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { apps = [], target_group_id = 'all-devices', assignment_intent = 'required' } = payload;

    if (!Array.isArray(apps) || apps.length === 0) {
      return NextResponse.json({ detail: 'No applications provided in batch' }, { status: 400 });
    }

    const jobIds: string[] = [];

    for (const app of apps) {
      const appPayload = {
        ...app,
        target_group_id,
        assignment_intent,
      };

      const jobId = DeploymentJobManager.createJob(appPayload, currentTenantSession.tenant_id);
      jobIds.push(jobId);

      setTimeout(() => {
        DeploymentJobManager.executePipeline(jobId, appPayload);
      }, 50);
    }

    return NextResponse.json({
      batch_id: `batch-${Math.random().toString(36).substring(2, 9)}`,
      count: jobIds.length,
      job_ids: jobIds,
      status: 'queued',
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Batch deployment failed' }, { status: 500 });
  }
}
