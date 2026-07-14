import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore/lite';
import { db } from '@/lib/firebaseServer';
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

  const sessionRef = doc(db, 'quizSessions', uid);
  const existing = await getDoc(sessionRef);

  if (existing.exists()) {
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

  await setDoc(sessionRef, { uid, questions, startedAt, deadline });

  return NextResponse.json({
    deadline,
    questions: questions.map(toClientQuestion),
  });
}
