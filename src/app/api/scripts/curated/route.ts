import { NextResponse } from 'next/server';
import { ScriptPackager } from '@/lib/scripts-library';

export async function GET() {
  const scripts = ScriptPackager.listCuratedScripts();
  return NextResponse.json({ scripts, total: scripts.length });
}
