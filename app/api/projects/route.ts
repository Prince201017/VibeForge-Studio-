// [V0.A1] Projects API route
// CRUD operations for projects
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(`${PYTHON_API}/projects/list`, {
      headers: { 'Authorization': `Bearer ${req.headers.get('authorization')}` },
    });
    const projects = await response.json();
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, template } = await req.json();

    const response = await fetch(`${PYTHON_API}/projects/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.get('authorization')}`,
      },
      body: JSON.stringify({ name, description, template }),
    });

    const project = await response.json();
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
