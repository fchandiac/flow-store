import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const configPath = resolveConfigPath();
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    return NextResponse.json(config);
  } catch (err) {
    console.error('Error reading app.config.json:', err);
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newConfig = await request.json();
    const configPath = resolveConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error writing app.config.json:', err);
    return NextResponse.json({ error: 'Failed to write config' }, { status: 500 });
  }
}

function resolveConfigPath() {
  const candidates = [
    path.resolve(process.cwd(), 'app.config.json'),
    path.resolve(process.cwd(), '..', 'app.config.json'),
    path.resolve(process.cwd(), '..', '..', 'app.config.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}