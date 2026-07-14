import { NextResponse } from 'next/server';
import { addDoc, collection, deleteDoc, doc, getDoc } from 'firebase/firestore/lite';
import { db } from '@/lib/firebaseServer';
import { BankQuestion } from '@/lib/quiz';

export async function POST(request: Request) {
  const { uid, answers } = (await request.json()) as { uid: string; answers: Record<string, string> };
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }

  const sessionRef = doc(db, 'quizSessions', uid);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) {
    return NextResponse.json({ error: 'No active quiz session' }, { status: 400 });
  }

  const session = sessionSnap.data() as { questions: BankQuestion[] };

  const byCategory = new Map<string, { earned: number; max: number }>();
  let totalScore = 0;
  const maxScore = session.questions.length * 4;

  for (const q of session.questions) {
    const selectedLabel = answers?.[q.id];
    const option = q.options.find((o) => o.label === selectedLabel);
    const points = option ? option.points : 0;
    totalScore += points;

    const entry = byCategory.get(q.subCategory) || { earned: 0, max: 0 };
    entry.earned += points;
    entry.max += 4;
    byCategory.set(q.subCategory, entry);
  }

  const categoryScores: Record<string, number> = {};
  let weakestCategory = '';
  let lowestPct = Infinity;
  byCategory.forEach((v, subCategory) => {
    const pct = Math.round((v.earned / v.max) * 100);
    categoryScores[subCategory] = pct;
    if (pct < lowestPct) {
      lowestPct = pct;
      weakestCategory = subCategory;
    }
  });

  const userSnap = await getDoc(doc(db, 'users', uid));
  const studentName = userSnap.exists() ? (userSnap.data() as { name?: string }).name || '' : '';

  await addDoc(collection(db, 'quizAttempts'), {
    studentId: uid,
    studentName,
    categoryScores,
    weakestCategory,
    totalScore,
    maxScore,
    completedAt: Date.now(),
  });

  await deleteDoc(sessionRef);

  return NextResponse.json({ categoryScores, weakestCategory, totalScore, maxScore });
}
