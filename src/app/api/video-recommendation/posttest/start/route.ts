import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import questionBank from '@/data/questionBank.json';
import { BankQuestion } from '@/lib/quiz';

// Post-test session start for the AI-Driven Adaptive Content Delivery feature.
// Mirrors src/app/api/quiz/start/route.ts's session-doc pattern exactly:
// questions (including correctLabel/points) are stored server-side keyed by
// uid, and the client only ever receives label+text.
const QUESTIONS_PER_POSTTEST = 10;
const POSTTEST_DURATION_MINUTES = 15;

const bank = questionBank as BankQuestion[];

function toClientQuestion(q: BankQuestion) {
  return {
    id: q.id,
    question: q.question,
    difficulty: q.difficulty,
    options: q.options.map((o) => ({ label: o.label, text: o.text })),
  };
}

export async function POST(request: Request) {
  const { uid, topic } = (await request.json().catch(() => ({}))) as { uid?: string; topic?: string };
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }
  const trimmedTopic = (topic || '').trim();
  if (!trimmedTopic) {
    return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
  }

  const sessionRef = adminDb.collection('videoPosttestSessions').doc(uid);
  const existing = await sessionRef.get();

  if (existing.exists) {
    const session = existing.data() as { topic: string; questions: BankQuestion[]; deadline: number };
    if (session.deadline > Date.now()) {
      return NextResponse.json({
        topic: session.topic,
        deadline: session.deadline,
        questions: session.questions.map(toClientQuestion),
      });
    }
  }

  const pool = bank.filter((q) => q.subCategory === trimmedTopic);
  if (pool.length === 0) {
    return NextResponse.json(
      { error: `No questions found for topic '${trimmedTopic}'.` },
      { status: 404 },
    );
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const questions = shuffled.slice(0, QUESTIONS_PER_POSTTEST);
  const startedAt = Date.now();
  const deadline = startedAt + POSTTEST_DURATION_MINUTES * 60 * 1000;

  await sessionRef.set({ uid, topic: trimmedTopic, questions, startedAt, deadline });

  return NextResponse.json({
    topic: trimmedTopic,
    deadline,
    questions: questions.map(toClientQuestion),
  });
}
