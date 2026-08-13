import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { pickQuizQuestions, QUIZ_DURATION_MINUTES, BankQuestion } from '@/lib/quiz';

function toClientQuestion(q: BankQuestion) {
  return {
    id: q.id,
    question: q.question,
    options: q.options.map((o) => ({ label: o.label, text: o.text })),
  };
}

export async function POST(request: Request) {
  const { uid } = await request.json();
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }

  const sessionRef = adminDb.collection('quizSessions').doc(uid);
  const existing = await sessionRef.get();

  if (existing.exists) {
    const session = existing.data() as { questions: BankQuestion[]; deadline: number };
    if (session.deadline > Date.now()) {
      return NextResponse.json({
        deadline: session.deadline,
        questions: session.questions.map(toClientQuestion),
      });
    }
  }

  const questions = pickQuizQuestions();
  const startedAt = Date.now();
  const deadline = startedAt + QUIZ_DURATION_MINUTES * 60 * 1000;

  await sessionRef.set({ uid, questions, startedAt, deadline });

  return NextResponse.json({
    deadline,
    questions: questions.map(toClientQuestion),
  });
}
