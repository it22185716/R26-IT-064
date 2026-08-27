import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { DayPlan, MealOptions, MealPlan } from '@/lib/types';

const MEAL_PLAN_SERVICE_URL = process.env.MEAL_PLAN_SERVICE_URL || 'http://127.0.0.1:5001';
const DAY_MS = 24 * 60 * 60 * 1000;
const PLAN_DURATION_MS = 14 * DAY_MS;
const CALENDAR_DAYS = 14;
const MEAL_TYPES: (keyof MealOptions)[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Rounds to one decimal place so growth deltas display cleanly (e.g. "1.3cm" not "1.2999999...").
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Cycles through each meal type's option list with modulo indexing so a
// 14-day calendar can be built from the single set of options the ML
// service returns, without calling it 14 times.
function buildWeeklyCalendar(mealOptions: MealOptions): DayPlan[] | null {
  if (MEAL_TYPES.some((type) => mealOptions[type].length === 0)) return null;

  return Array.from({ length: CALENDAR_DAYS }, (_, i) => ({
    day: i + 1,
    breakfast: mealOptions.breakfast[i % mealOptions.breakfast.length],
    lunch: mealOptions.lunch[i % mealOptions.lunch.length],
    dinner: mealOptions.dinner[i % mealOptions.dinner.length],
    snack: mealOptions.snack[i % mealOptions.snack.length],
  }));
}

// Generates a new 14-day meal plan for a student and stores it, tracking growth since their last plan.
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

  // Calls the Flask ML service to get a nutritional status prediction and meal options.
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

  const weeklyCalendar = buildWeeklyCalendar(result.meal_options);
  if (!weeklyCalendar) {
    return NextResponse.json(
      { error: 'The meal plan is missing options for one or more meal types.' },
      { status: 502 },
    );
  }

  // where(studentId) + orderBy(createdAt) would need a composite index Firestore
  // doesn't create automatically (same reason lib/mealPlan.ts sorts client-side
  // instead) — fetch by studentId alone and sort in memory.
  const previousSnap = await adminDb.collection('mealPlans').where('studentId', '==', uid).get();
  const previousDocs = previousSnap.docs.sort((a, b) => b.data().createdAt - a.data().createdAt);
  const previousDoc = previousDocs[0];
  const previous = previousDoc ? ({ id: previousDoc.id, ...previousDoc.data() } as MealPlan) : null;

  const now = Date.now();
  // Compute what's changed since the student's last plan, if one exists, for the growth-progress UI.
  const progressSinceLastPlan = previous
    ? {
        previousPlanId: previous.id,
        daysSinceLastPlan: Math.round((now - previous.createdAt) / DAY_MS),
        heightChangeCm: round1(height - previous.profile.height_cm),
        weightChangeKg: round1(weight - previous.profile.weight_kg),
        bmiChange: round1(result.profile.bmi - previous.profile.bmi),
      }
    : null;

  const newPlan = {
    studentId: uid,
    profile: result.profile,
    nutritionalStatus: result.nutritional_status,
    mealGoal: result.meal_goal,
    confidence: result.confidence,
    mealOptions: result.meal_options,
    createdAt: now,
    expiresAt: now + PLAN_DURATION_MS,
    weeklyCalendar,
    progressSinceLastPlan,
  };

  const docRef = await adminDb.collection('mealPlans').add(newPlan);

  return NextResponse.json({ id: docRef.id, ...newPlan });
}
