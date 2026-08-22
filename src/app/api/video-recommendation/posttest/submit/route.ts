import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { BankQuestion } from '@/lib/quiz';
import { QuizAttempt, VideoPostTestResult } from '@/lib/types';

export async function POST(request: Request) {
  const { uid, answers } = (await request.json().catch(() => ({}))) as {
    uid?: string;
    answers?: Record<string, string>;
  };
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }

  const sessionRef = adminDb.collection('videoPosttestSessions').doc(uid);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'No active post-test session' }, { status: 400 });
  }

  const session = sessionSnap.data() as { topic: string; questions: BankQuestion[] };

  let earned = 0;
  let correctCount = 0;
  const maxScore = session.questions.length * 4;

  for (const q of session.questions) {
    const selectedLabel = answers?.[q.id];
    const option = q.options.find((o) => o.label === selectedLabel);
    const points = option ? option.points : 0;
    earned += points;
    if (points === 4) correctCount += 1;
  }

  const postScore = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;

  const attemptsSnap = await adminDb
    .collection('quizAttempts')
    .where('studentId', '==', uid)
    .get();
  const attempts = attemptsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt));
  attempts.sort((a, b) => b.completedAt - a.completedAt);
  const preScore = attempts[0]?.categoryScores?.[session.topic] ?? 0;

  const improved = postScore > preScore;

  const result: Omit<VideoPostTestResult, 'id'> = {
    studentId: uid,
    weakArea: session.topic,
    preScore,
    postScore,
    improved,
    correctCount,
    totalQuestions: session.questions.length,
    completedAt: Date.now(),
  };

  await adminDb.collection('videoPostTestResults').add(result);
  await sessionRef.delete();

  return NextResponse.json({
    preScore,
    postScore,
    improved,
    correctCount,
    totalQuestions: session.questions.length,
  });
}
