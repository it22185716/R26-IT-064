import { NextResponse } from 'next/server';
import { addDoc, collection } from 'firebase/firestore/lite';
import { db } from '@/lib/firebaseServer';

const MEAL_PLAN_SERVICE_URL = process.env.MEAL_PLAN_SERVICE_URL || 'http://127.0.0.1:5001';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    uid: string;
    age: number;
    height: number;
    weight: number;
    gender: string;
    allergies?: string[];
  };

  const { uid, age, height, weight, gender, allergies } = body;

  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }
  if (!age || !height || !weight || !gender) {
    return NextResponse.json({ error: 'Missing required field(s): age, height, weight, gender' }, { status: 400 });
  }

  let mlResponse: Response;
  try {
    mlResponse = await fetch(`${MEAL_PLAN_SERVICE_URL}/api/predict-meal-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age, height, weight, gender, allergies }),
    });
  } catch {
    return NextResponse.json({ error: 'Meal planning service is unreachable' }, { status: 502 });
  }

  const result = await mlResponse.json();
  if (!mlResponse.ok || !result.success) {
    return NextResponse.json({ error: result.error || 'Meal plan prediction failed' }, { status: 502 });
  }

  const docRef = await addDoc(collection(db, 'mealPlans'), {
    studentId: uid,
    profile: result.profile,
    nutritionalStatus: result.nutritional_status,
    mealGoal: result.meal_goal,
    confidence: result.confidence,
    mealOptions: result.meal_options,
    createdAt: Date.now(),
  });

  return NextResponse.json({
    id: docRef.id,
    profile: result.profile,
    nutritionalStatus: result.nutritional_status,
    mealGoal: result.meal_goal,
    confidence: result.confidence,
    mealOptions: result.meal_options,
  });
}
