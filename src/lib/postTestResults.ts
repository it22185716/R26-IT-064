import { VideoPostTestResult } from './types';
import { auth } from './firebase';

// Teacher-facing reads for videoPostTestResults go through the Admin SDK API
// route (same reasoning as fetchMealPlanHistoryForStudent in mealPlan.ts) —
// the collection is written exclusively via the posttest/submit route's
// Admin SDK call, so client-side read rules for it are unconfirmed.

export async function fetchAllPostTestResults(): Promise<VideoPostTestResult[]> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch('/api/teacher/post-test-results', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to load post-test results');
  const data = await res.json();
  return data.results as VideoPostTestResult[];
}

export async function fetchPostTestResultsForStudent(studentId: string): Promise<VideoPostTestResult[]> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/teacher/post-test-results?studentId=${encodeURIComponent(studentId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to load post-test results');
  const data = await res.json();
  return data.results as VideoPostTestResult[];
}

// Results are expected newest-first (matches both routes above), so each
// grouped list's first entry is the student's latest result.
export function groupPostTestResultsByStudent(
  results: VideoPostTestResult[]
): Map<string, VideoPostTestResult[]> {
  const map = new Map<string, VideoPostTestResult[]>();
  results.forEach((r) => {
    const list = map.get(r.studentId) || [];
    list.push(r);
    map.set(r.studentId, list);
  });
  return map;
}
