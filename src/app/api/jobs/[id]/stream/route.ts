import { NextRequest } from 'next/server';
import { DeploymentJobManager } from '@/lib/jobs';
import { DeploymentJob } from '@/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: any = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial job state
      const initialJob = await DeploymentJobManager.getJob(id);
      if (initialJob) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialJob)}\n\n`));
      }

      // Subscribe to real-time progress events
      unsubscribe = DeploymentJobManager.subscribe(id, (updatedJob: DeploymentJob) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(updatedJob)}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // Keep-alive heartbeat ping every 10 seconds
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 10000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
