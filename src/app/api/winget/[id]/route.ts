import { NextRequest, NextResponse } from 'next/server';
import { WINGET_PACKAGES_CACHE } from '@/lib/data';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pkg = WINGET_PACKAGES_CACHE.find((p) => p.id.toLowerCase() === id.toLowerCase());

  if (!pkg) {
    return NextResponse.json({ detail: `WinGet package not found: ${id}` }, { status: 404 });
  }

  // Convert to standard catalog format
  const app = {
    id: `winget-${pkg.id.toLowerCase().replace(/\./g, '-')}`,
    name: pkg.name,
    publisher: pkg.publisher,
    category: pkg.category || 'WinGet Repositories',
    version: pkg.version,
    architecture: pkg.architecture || 'x64',
    icon: pkg.icon || '',
    description: pkg.description || '',
    download_url: pkg.download_url,
    filename: pkg.filename,
    install_command: pkg.install_command,
    uninstall_command: pkg.uninstall_command,
    install_behavior: pkg.install_behavior || 'system',
    detection_rule: pkg.detection_rule,
  };

  return NextResponse.json(app);
}
