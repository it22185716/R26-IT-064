import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { MealPlan } from '@/lib/types';

// Inlined rather than a shared helper (like requireAdmin in adminAuth.ts) —
// each teacher-facing route in this app keeps its own copy of this check.
// Verifies a real, current Firebase ID token and confirms the token's own
// uid has the teacher role.
async function requireTeacher(request: Request): Promise<{ uid: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const idToken = authHeader.slice('Bearer '.length);
  if (!idToken) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userSnap.exists) return null;
    if (userSnap.data()?.role !== 'teacher') return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

// Reads via the Admin SDK (bypasses client Security Rules) rather than the
// client-SDK fetchMealPlanHistory, since it's unconfirmed whether a teacher
// is permitted to read another user's mealPlans docs under the deployed rules.
export async function GET(request: Request) {
  const caller = await requireTeacher(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  // Sorted in JS rather than an orderBy() clause on the query — a where() +
  // orderBy() on different fields would require a composite Firestore index
  // that may not exist yet, same reasoning as fetchMealPlanHistory in mealPlan.ts.
  const snap = await adminDb.collection('mealPlans').where('studentId', '==', studentId).get();
  const plans = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealPlan));
  plans.sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ plans });
}
