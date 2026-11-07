import { NextRequest, NextResponse } from 'next/server';
import { CATALOG_APPS } from '@/lib/data';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = CATALOG_APPS.find((a) => a.id.toLowerCase() === id.toLowerCase());

  if (!app) {
    return NextResponse.json({ detail: `App not found: ${id}` }, { status: 404 });
  }

  return NextResponse.json(app);
}
