import { NextResponse } from 'next/server';
import { addDoc, collection, deleteDoc, doc, getDoc } from 'firebase/firestore/lite';
import { db } from '@/lib/firebaseServer';
import { BankQuestion } from '@/lib/quiz';

const MATH_WEAKNESS_SERVICE_URL = process.env.MATH_WEAKNESS_SERVICE_URL || 'http://127.0.0.1:5004';

type WeaknessPrediction = { weakestCategory: string; confidence: number } | null;

// Calls the trained Logistic Regression model (ml-services/math-weak-detection)
// to predict the weakest subcategory from the full 24-feature profile, rather
// than just taking the lowest raw score. Falls back to null (caller uses the
// lowest-score rule instead) if the service is down or errors — quiz
// submission must never fail because this optional service isn't running.
async function predictWeaknessWithModel(
  categoryStats: Record<string, { score: number; correct: number }>
): Promise<WeaknessPrediction> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${MATH_WEAKNESS_SERVICE_URL}/api/predict-weakness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryStats }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const result = await res.json();
    if (!result.success) return null;

    return { weakestCategory: result.weakestCategory, confidence: result.confidence };
  } catch {
    return null;
  }
}

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

  const byCategory = new Map<string, { earned: number; max: number; correct: number }>();
  let totalScore = 0;
  const maxScore = session.questions.length * 4;

  for (const q of session.questions) {
    const selectedLabel = answers?.[q.id];
    const option = q.options.find((o) => o.label === selectedLabel);
    const points = option ? option.points : 0;
    totalScore += points;

    const entry = byCategory.get(q.subCategory) || { earned: 0, max: 0, correct: 0 };
    entry.earned += points;
    entry.max += 4;
    if (points === 4) entry.correct += 1;
    byCategory.set(q.subCategory, entry);
  }

  const categoryScores: Record<string, number> = {};
  const categoryStats: Record<string, { score: number; correct: number }> = {};
  let ruleWeakestCategory = '';
  let lowestPct = Infinity;
  byCategory.forEach((v, subCategory) => {
    const pct = Math.round((v.earned / v.max) * 100);
    categoryScores[subCategory] = pct;
    categoryStats[subCategory] = { score: v.earned, correct: v.correct };
    if (pct < lowestPct) {
      lowestPct = pct;
      ruleWeakestCategory = subCategory;
    }
  });

  const modelPrediction = await predictWeaknessWithModel(categoryStats);
  const weakestCategory = modelPrediction?.weakestCategory || ruleWeakestCategory;
  const predictionMethod = modelPrediction ? 'model' : 'rule';

  const userSnap = await getDoc(doc(db, 'users', uid));
  const studentName = userSnap.exists() ? (userSnap.data() as { name?: string }).name || '' : '';

  await addDoc(collection(db, 'quizAttempts'), {
    studentId: uid,
    studentName,
    categoryScores,
    weakestCategory,
    predictionMethod,
    ...(modelPrediction ? { confidence: modelPrediction.confidence } : {}),
    totalScore,
    maxScore,
    completedAt: Date.now(),
  });

  await deleteDoc(sessionRef);

  return NextResponse.json({ categoryScores, weakestCategory, totalScore, maxScore });
}
