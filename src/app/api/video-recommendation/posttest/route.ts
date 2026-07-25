import { NextResponse } from 'next/server';
import questionBank from '@/data/questionBank.json';

// Post-test question source for the AI-Driven Adaptive Content Delivery feature.
// Reads the (2.8MB) question bank on the server so it is NOT bundled into the
// client. Returns 10 random questions for a given topic.
//
// NOTE: `topic` here is the questionBank `subCategory` key. The caller is
// responsible for mapping the model/video weak-area name onto this key — the
// two data sources disagree on one label ("Fractions to Decimals" vs
// "Fraction to Decimal"). See the mapping in the page component.

type BankOption = { label: string; text: string; points: number };
type BankQuestion = {
  id: string;
  category: string;
  subCategory: string;
  difficulty: string;
  question: string;
  options: BankOption[];
  correctLabel: string;
};

const bank = questionBank as BankQuestion[];
const QUESTIONS_PER_POSTTEST = 10;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { topic?: string };
  const topic = (body.topic || '').trim();

  if (!topic) {
    return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
  }

  const pool = bank.filter((q) => q.subCategory === topic);
  if (pool.length === 0) {
    return NextResponse.json(
      { error: `No questions found for topic '${topic}'.` },
      { status: 404 },
    );
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const questions = shuffled.slice(0, QUESTIONS_PER_POSTTEST).map((q) => ({
    id: q.id,
    question: q.question,
    difficulty: q.difficulty,
    options: q.options.map((o) => ({ label: o.label, text: o.text })),
    correctLabel: q.correctLabel,
  }));

  return NextResponse.json({ topic, count: questions.length, questions });
}
