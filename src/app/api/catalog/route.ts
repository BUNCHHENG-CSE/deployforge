import { NextRequest, NextResponse } from 'next/server';
import { CATALOG_APPS } from '@/lib/data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') || '').toLowerCase().trim();
  const category = (searchParams.get('category') || '').trim();

  let filtered = CATALOG_APPS;

  if (category && category !== 'All') {
    filtered = filtered.filter((app) => app.category.toLowerCase() === category.toLowerCase());
  }

  if (query) {
    filtered = filtered.filter(
      (app) =>
        app.name.toLowerCase().includes(query) ||
        app.publisher.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.category.toLowerCase().includes(query)
    );
  }

  const categories = Array.from(new Set(CATALOG_APPS.map((a) => a.category))).sort();

  return NextResponse.json({
    apps: filtered,
    categories: ['All', ...categories],
    total: filtered.length,
  });
}
