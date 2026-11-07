import { NextResponse } from 'next/server';
import { DeploymentJobManager } from '@/lib/jobs';

export async function GET() {
  try {
    const jobs = await DeploymentJobManager.listJobs();
    return NextResponse.json({ jobs, total: jobs.length });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to list jobs' }, { status: 500 });
  }
}
