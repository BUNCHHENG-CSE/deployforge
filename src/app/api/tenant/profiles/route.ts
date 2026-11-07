import { NextResponse } from 'next/server';
import { tenantProfiles } from '@/lib/data';

export async function GET() {
  return NextResponse.json({
    profiles: tenantProfiles,
    total: tenantProfiles.length,
  });
}
