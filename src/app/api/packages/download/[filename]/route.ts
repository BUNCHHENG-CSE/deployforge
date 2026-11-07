import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { StorageManager } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filePath = StorageManager.getPackagePath(filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ detail: `Package not found: ${filename}` }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': fileBuffer.length.toString(),
    },
  });
}
