// [V0.A1] Collaboration API route
// WebSocket and real-time sync
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const response = await fetch(`${PYTHON_API}/collaboration/presence?projectId=${projectId}`, {
      headers: { 'Authorization': `Bearer ${req.headers.get('authorization')}` },
    });

    const presence = await response.json();
    return NextResponse.json(presence);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch presence' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, userId, changes } = await req.json();

    const response = await fetch(`${PYTHON_API}/collaboration/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.get('authorization')}`,
      },
      body: JSON.stringify({ projectId, userId, changes }),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
