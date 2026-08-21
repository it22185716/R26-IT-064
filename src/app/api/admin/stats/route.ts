import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { UserProfile } from '@/lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const SIGNUP_WINDOW_DAYS = 14;

function toDateKey(epochMs: number): string {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [usersSnap, quizAttemptsSnap, mealPlansSnap, readingAttemptsSnap, assignedVideosSnap] = await Promise.all([
    adminDb.collection('users').get(),
    adminDb.collection('quizAttempts').get(),
    adminDb.collection('mealPlans').get(),
    adminDb.collection('readingAttempts').get(),
    adminDb.collection('assignedVideos').get(),
  ]);

  let studentCount = 0;
  let teacherCount = 0;
  let adminCount = 0;

  // Fixed 14-slot x-axis, oldest to newest, so the chart always has a slot
  // for every day even when a day has zero signups.
  const now = Date.now();
  const dayKeys = Array.from({ length: SIGNUP_WINDOW_DAYS }, (_, i) =>
    toDateKey(now - (SIGNUP_WINDOW_DAYS - 1 - i) * DAY_MS),
  );
  const signupCounts = new Map<string, number>(dayKeys.map((k) => [k, 0]));

  usersSnap.docs.forEach((d) => {
    const user = d.data() as UserProfile;
    if (user.role === 'student') studentCount++;
    else if (user.role === 'teacher') teacherCount++;
    else if (user.role === 'admin') adminCount++;

    const key = toDateKey(user.createdAt);
    if (signupCounts.has(key)) {
      signupCounts.set(key, (signupCounts.get(key) || 0) + 1);
    }
  });

  const signupsByDay = dayKeys.map((date) => ({ date, count: signupCounts.get(date) || 0 }));

  return NextResponse.json({
    studentCount,
    teacherCount,
    adminCount,
    quizAttemptCount: quizAttemptsSnap.size,
    mealPlanCount: mealPlansSnap.size,
    readingAttemptCount: readingAttemptsSnap.size,
    assignedVideoCount: assignedVideosSnap.size,
    signupsByDay,
  });
}
