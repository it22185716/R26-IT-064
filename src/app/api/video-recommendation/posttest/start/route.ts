import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import postTestQuestionBank from '@/data/postTestQuestionBank.json';
import { BankQuestion } from '@/lib/quiz';
import { QuizAttempt } from '@/lib/types';

// Post-test session start for the AI-Driven Adaptive Content Delivery feature.
// Draws from its own dedicated bank (src/data/postTestQuestionBank.json,
// converted from studentPosttestQuestionBankV3.csv via
// scripts/convert-posttest-bank.js) — a separate dataset/ID space from the
// main quiz's questionBank.json, so post-test questions are never the same
// pool the student saw in the pretest quiz.
// Mirrors src/app/api/quiz/start/route.ts's session-doc pattern exactly:
// questions (including correctLabel/points) are stored server-side keyed by
// uid, and the client only ever receives label+text.
const QUESTIONS_PER_POSTTEST = 10;
const POSTTEST_DURATION_MINUTES = 20;

const bank = postTestQuestionBank as BankQuestion[];

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

  const attemptsSnap = await adminDb
    .collection('quizAttempts')
    .where('studentId', '==', uid)
    .get();
  const attempts = attemptsSnap.docs.map((d) => d.data() as QuizAttempt);
  attempts.sort((a, b) => b.completedAt - a.completedAt);
  const excludedIds = new Set(attempts[0]?.questionIdsByCategory?.[trimmedTopic] ?? []);

  const fullPool = bank.filter((q) => q.subCategory === trimmedTopic);
  if (fullPool.length === 0) {
    return NextResponse.json(
      { error: `No questions found for topic '${trimmedTopic}'.` },
      { status: 404 },
    );
  }

  // Exclude questions already seen in the student's pretest, kept from when
  // the post-test shared questionBank.json with the main quiz. Now that the
  // post-test draws from its own bank (disjoint "PT_"-prefixed IDs), this is
  // a no-op in practice — left in place as harmless defense-in-depth rather
  // than ripped out. If it ever did trim the pool below
  // QUESTIONS_PER_POSTTEST, we'd return however many remain rather than
  // erroring out.
  const pool = fullPool.filter((q) => !excludedIds.has(q.id));

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
