import { MealPlan } from './types';
import { auth, db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function fetchMealPlanHistory(studentId: string): Promise<MealPlan[]> {
  const q = query(collection(db, 'mealPlans'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const plans = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealPlan));
  plans.sort((a, b) => b.createdAt - a.createdAt);
  return plans;
}

// For teacher-facing views: goes through the meal-plan-history API route
// (Admin SDK, bypasses client Security Rules) rather than a direct client
// read, since it's unconfirmed whether the deployed rules let a teacher
// read another user's mealPlans docs the way fetchMealPlanHistory above does.
export async function fetchMealPlanHistoryForStudent(studentId: string): Promise<MealPlan[]> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/teacher/meal-plan-history?studentId=${encodeURIComponent(studentId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to load meal plan history');
  const data = await res.json();
  return data.plans as MealPlan[];
}
