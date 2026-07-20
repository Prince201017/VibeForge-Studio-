// [V0.A1] AI integration API route
// Design generation, analysis, and synthesis
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const { action, prompt, image, reference } = await req.json();

    let endpoint = '';
    const payload: Record<string, unknown> = {};

    if (action === 'generate') {
      endpoint = '/ai/generate-design';
      payload.prompt = prompt;
      payload.reference = reference;
    } else if (action === 'analyze') {
      endpoint = '/ai/analyze-image';
      payload.image = image;
    } else if (action === 'synthesize') {
      endpoint = '/ai/synthesize-styles';
      payload.references = reference;
      payload.description = prompt;
    }

    const response = await fetch(`${PYTHON_API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    
    const response = await fetch(`${PYTHON_API}/ai/status?action=${action}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch AI status' }, { status: 500 });
  }
}
