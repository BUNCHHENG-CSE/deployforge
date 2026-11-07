import { NextRequest, NextResponse } from 'next/server';
import { WINGET_PACKAGES_CACHE } from '@/lib/data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') || '').toLowerCase().trim();

  let results = WINGET_PACKAGES_CACHE;
  if (query) {
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.publisher.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({
    packages: results.slice(0, 20),
    total: results.length,
  });
}
