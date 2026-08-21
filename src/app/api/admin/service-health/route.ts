import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

const HEALTH_TIMEOUT_MS = 2500;

const SERVICES: { name: string; url: string }[] = [
  { name: 'Meal Planning', url: process.env.MEAL_PLAN_SERVICE_URL || 'http://127.0.0.1:5001' },
  { name: 'Video Recommendation', url: process.env.VIDEO_RECOMMENDATION_SERVICE_URL || 'http://127.0.0.1:5002' },
  { name: 'Reading Assessment', url: process.env.READING_SERVICE_URL || 'http://127.0.0.1:5003' },
  { name: 'Math Weakness Detection', url: process.env.MATH_WEAKNESS_SERVICE_URL || 'http://127.0.0.1:5004' },
];

type ServiceHealthResult = {
  name: string;
  url: string;
  status: 'up' | 'down';
  responseTimeMs: number | null;
  details: Record<string, unknown> | null;
};

async function checkHealth(service: { name: string; url: string }): Promise<ServiceHealthResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const started = Date.now();

  try {
    const res = await fetch(`${service.url}/api/health`, { signal: controller.signal });
    if (!res.ok) {
      return { name: service.name, url: service.url, status: 'down', responseTimeMs: null, details: null };
    }

    const responseTimeMs = Date.now() - started;
    const details = await res.json().catch(() => null);
    return { name: service.name, url: service.url, status: 'up', responseTimeMs, details };
  } catch {
    // Timeout (AbortController) or network error — either way the service
    // isn't reachable, so treat it the same as a non-2xx response.
    return { name: service.name, url: service.url, status: 'down', responseTimeMs: null, details: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // allSettled (not sequential awaits) so one slow/dead service can't delay
  // the others — checkHealth never rejects, but this stays correct even if
  // it somehow did.
  const results = await Promise.allSettled(SERVICES.map(checkHealth));
  const services = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { name: SERVICES[i].name, url: SERVICES[i].url, status: 'down' as const, responseTimeMs: null, details: null },
  );

  return NextResponse.json({ services, checkedAt: Date.now() });
}
