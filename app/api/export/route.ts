// [V0.A1] Export pipeline API route
// Multi-format export support
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const { format, data, options } = await req.json();

    const response = await fetch(`${PYTHON_API}/export/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format, // mp4, png, apng, svg, css, react, jsx, tsx, html
        data,
        options,
      }),
    });

    if (format === 'mp4' || format === 'webm' || format === 'mov') {
      const blob = await response.blob();
      return new NextResponse(blob, {
        headers: { 'Content-Type': `video/${format === 'mp4' ? 'mp4' : format}` },
      });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(`${PYTHON_API}/export/supported-formats`);
    const formats = await response.json();
    return NextResponse.json(formats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch formats' }, { status: 500 });
  }
}
