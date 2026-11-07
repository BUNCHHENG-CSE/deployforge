import { NextResponse } from 'next/server';
import { FLEET_BASELINES } from '@/lib/data';

export async function GET() {
  return NextResponse.json({
    baselines: FLEET_BASELINES,
    total: FLEET_BASELINES.length,
  });
}
