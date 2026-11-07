import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { StorageManager } from '@/lib/storage';
import { InstallerAnalyzer } from '@/lib/analyzer';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ detail: 'No file uploaded' }, { status: 400 });
    }

    StorageManager.init();
    const originalName = file.name || 'custom_installer.exe';
    const fileToken = `pkg-${Math.random().toString(36).substring(2, 10)}`;
    const savePath = StorageManager.getUploadPath(originalName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(savePath, buffer);

    const analysis = InstallerAnalyzer.analyze(savePath);

    // Persist to custom_packages table in Prisma
    try {
      await prisma.customPackage.create({
        data: {
          id: `pkg-${Date.now()}`,
          fileToken,
          filename: originalName,
          sizeBytes: BigInt(buffer.length),
          fileType: path.extname(originalName),
          engine: analysis.engine,
          analysisMetadata: JSON.stringify(analysis),
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      file_token: fileToken,
      filename: originalName,
      size_bytes: buffer.length,
      analysis,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'File upload failed' }, { status: 500 });
  }
}
