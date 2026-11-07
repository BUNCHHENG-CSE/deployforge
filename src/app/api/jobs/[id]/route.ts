import { NextRequest, NextResponse } from 'next/server';
import { DeploymentJobManager } from '@/lib/jobs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await DeploymentJobManager.getJob(id);

  if (!job) {
    return NextResponse.json({ detail: `Job not found: ${id}` }, { status: 404 });
  }

  return NextResponse.json(job);
}
