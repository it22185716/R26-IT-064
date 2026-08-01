import { MealPlan } from './types';
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function fetchMealPlanHistory(studentId: string): Promise<MealPlan[]> {
  const q = query(collection(db, 'mealPlans'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const plans = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealPlan));
  plans.sort((a, b) => b.createdAt - a.createdAt);
  return plans;
}
