import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { StorageManager } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  let filePath: string;
  try {
    filePath = StorageManager.getPackagePath(filename);
  } catch {
    return NextResponse.json({ detail: 'Invalid filename' }, { status: 400 });
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) throw new Error('not a file');
  } catch {
    return NextResponse.json({ detail: `Package not found: ${filename}` }, { status: 404 });
  }

  // Stream from disk instead of buffering the whole package in memory.
  const body = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream<Uint8Array>;
  const safeName = path.basename(filePath).replace(/"/g, '');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': stat.size.toString(),
    },
  });
}
