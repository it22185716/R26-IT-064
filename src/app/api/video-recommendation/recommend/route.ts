import { NextResponse } from 'next/server';

// Proxies to the video-recommendation Flask service (same pattern as
// src/app/api/meal-plan/generate/route.ts -> ml-services/meal-planning).
const VIDEO_RECOMMENDATION_SERVICE_URL =
  process.env.VIDEO_RECOMMENDATION_SERVICE_URL || 'http://127.0.0.1:5002';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { weak_area?: string };
  const weakArea = (body.weak_area || '').trim();

  if (!weakArea) {
    return NextResponse.json({ success: false, error: 'Missing weak_area' }, { status: 400 });
  }

  let mlResponse: Response;
  try {
    mlResponse = await fetch(`${VIDEO_RECOMMENDATION_SERVICE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weak_area: weakArea }),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Video recommendation service is unreachable' },
      { status: 502 },
    );
  }

  const result = await mlResponse.json();
  if (!mlResponse.ok || !result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Video recommendation failed' },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}
