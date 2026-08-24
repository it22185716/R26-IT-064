"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../../hooks/useAuthUser';
import DashboardShell from '../../../../../components/DashboardShell';
import GrowthHistoryView from '../../../../../components/dashboard/GrowthHistoryView';
import { fetchMealPlanHistory } from '../../../../../lib/mealPlan';
import { MealPlan } from '../../../../../lib/types';

export default function MealPlanHistoryPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [plans, setPlans] = useState<MealPlan[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }
    if (profile && profile.role !== 'student') {
      router.replace('/dashboard/teacher');
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!user) return;
    fetchMealPlanHistory(user.uid).then(setPlans);
  }, [user]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <DashboardShell
      role="student"
      title="Growth Progress History"
      subtitle="Your height, weight, and BMI over time."
      userName={profile?.name || user.email || ''}
      backHref="/dashboard/student/meal-plan"
      backLabel="Back to Meal Plan"
    >
      {!plans ? (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">You haven&apos;t generated a meal plan yet.</p>
            <a
              href="/dashboard/student/meal-plan"
              className="mt-4 inline-flex items-center justify-center px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow hover:bg-sky-700 transition-colors"
            >
              Generate your first plan
            </a>
          </div>
        </div>
      ) : (
        <GrowthHistoryView plans={plans} />
      )}
    </DashboardShell>
  );
}
