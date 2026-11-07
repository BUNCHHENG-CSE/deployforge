import { NextRequest, NextResponse } from 'next/server';
import { currentTenantSession } from '@/lib/data';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const enable = searchParams.get('enable') === 'true';

  currentTenantSession.mode = enable ? 'simulation' : 'live';

  return NextResponse.json({
    status: 'ok',
    mode: currentTenantSession.mode,
  });
}
