import { NextResponse } from 'next/server';

export async function GET() {
  // Simulate a bit of work so the span is visible
  await new Promise((r) => setTimeout(r, 50));
  return NextResponse.json({
    message: 'Hello from Next.js backend',
    timestamp: new Date().toISOString(),
  });
}
