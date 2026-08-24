import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { VideoPostTestResult } from '@/lib/types';

// Same pattern as meal-plan-history/route.ts — each teacher-facing route
// keeps its own copy of this check rather than sharing one helper.
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

// Reads via the Admin SDK (bypasses client Security Rules), same reasoning
// as meal-plan-history: videoPostTestResults is written exclusively via the
// posttest/submit route's Admin SDK call, so a teacher's read permission for
// it under the deployed client rules is unconfirmed.
//
// studentId is optional — omitted, this returns every student's results
// (for the roster summary); provided, it's scoped to one student (for the
// student detail page's full history).
export async function GET(request: Request) {
  const caller = await requireTeacher(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  const collectionRef = adminDb.collection('videoPostTestResults');
  const snap = studentId ? await collectionRef.where('studentId', '==', studentId).get() : await collectionRef.get();
  const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VideoPostTestResult));
  results.sort((a, b) => b.completedAt - a.completedAt);

  return NextResponse.json({ results });
}
