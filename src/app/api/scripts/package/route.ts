import { NextRequest, NextResponse } from 'next/server';
import { ScriptPackager } from '@/lib/scripts-library';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { script_id, script_name, script_content, version } = body;

    if (!script_id || !script_name || !script_content) {
      return NextResponse.json(
        { detail: 'script_id, script_name, and script_content are required' },
        { status: 400 }
      );
    }

    const result = await ScriptPackager.packageScript(
      script_id,
      script_name,
      script_content,
      version || '1.0.0'
    );

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Script packaging failed' }, { status: 500 });
  }
}
