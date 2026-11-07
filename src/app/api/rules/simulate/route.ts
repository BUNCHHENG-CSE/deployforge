import { NextRequest, NextResponse } from 'next/server';
import { RuleSimulator } from '@/lib/rule-simulator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rule = body.rule || body;

    if (!rule || !rule.type) {
      return NextResponse.json({ detail: 'Rule object with type is required' }, { status: 400 });
    }

    const result = RuleSimulator.simulateRule(rule);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Simulation failed' }, { status: 500 });
  }
}
