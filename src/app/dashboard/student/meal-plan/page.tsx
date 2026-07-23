"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import DashboardShell from '../../../../components/DashboardShell';
import { MealOption, MealOptions } from '../../../../lib/types';

const ALLERGY_OPTIONS = ['milk', 'egg', 'wheat', 'fish', 'shellfish', 'peanut', 'treenut'];

const MEAL_SECTIONS: { key: keyof MealOptions; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

type FormState = {
  age: string;
  height: string;
  weight: string;
  gender: string;
  allergies: string[];
};

type ResultState = {
  profile: { age: number; height_cm: number; weight_kg: number; gender: string; bmi: number; allergies: string[] };
  nutritionalStatus: string;
  mealGoal: string;
  confidence: number | null;
  mealOptions: MealOptions;
};

const initialForm: FormState = { age: '', height: '', weight: '', gender: 'Male', allergies: [] };

function MealCard({ option }: { option: MealOption }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">{option.name}</p>
      <p className="mt-1 text-xs text-slate-500">{option.calories_kcal} kcal · {option.cuisine}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span className="rounded-full bg-white px-2 py-0.5 border border-slate-200">P {option.protein_g}g</span>
        <span className="rounded-full bg-white px-2 py-0.5 border border-slate-200">C {option.carbs_g}g</span>
        <span className="rounded-full bg-white px-2 py-0.5 border border-slate-200">F {option.fat_g}g</span>
        <span className="rounded-full bg-white px-2 py-0.5 border border-slate-200">Fiber {option.fiber_g}g</span>
      </div>
    </div>
  );
}

export default function MealPlanPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ResultState | null>(null);

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

  function toggleAllergy(allergy: string) {
    setForm((f) => ({
      ...f,
      allergies: f.allergies.includes(allergy) ? f.allergies.filter((a) => a !== allergy) : [...f.allergies, allergy],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/meal-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          age: Number(form.age),
          height: Number(form.height),
          weight: Number(form.weight),
          gender: form.gender,
          allergies: form.allergies,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate meal plan.');
        return;
      }
      setResult(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

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
      title="Meal Plan"
      subtitle="Get an AI-personalized meal plan based on your profile."
      userName={profile?.name || user.email || ''}
    >
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Age (years)</span>
            <input
              type="number"
              required
              min={1}
              max={19}
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Gender</span>
            <select
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Height (cm)</span>
            <input
              type="number"
              required
              min={50}
              max={220}
              step="0.1"
              value={form.height}
              onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Weight (kg)</span>
            <input
              type="number"
              required
              min={5}
              max={200}
              step="0.1"
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </label>
        </div>

        <div className="mt-4">
          <span className="text-sm font-medium text-slate-700">Allergies</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map((allergy) => {
              const active = form.allergies.includes(allergy);
              return (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => toggleAllergy(allergy)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    active
                      ? 'border-sky-600 bg-sky-50 text-sky-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {allergy}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Generating…' : 'Generate Meal Plan'}
        </button>
      </form>

      {result && (
        <div className="mt-6">
          <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 p-8 text-white shadow-sm">
            <p className="text-sm font-medium text-sky-100">Nutritional status</p>
            <h2 className="mt-1 text-2xl font-bold">{result.nutritionalStatus}</h2>
            <p className="mt-3 max-w-md text-sky-100">Goal: {result.mealGoal}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-sky-100">
              <span>BMI: {result.profile.bmi}</span>
              {result.confidence !== null && <span>Confidence: {Math.round(result.confidence * 100)}%</span>}
              {result.profile.allergies.length > 0 && <span>Avoiding: {result.profile.allergies.join(', ')}</span>}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {MEAL_SECTIONS.map(({ key, label }) => (
              <div key={key} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="font-semibold">{label}</h3>
                {result.mealOptions[key].length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No matching options found.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {result.mealOptions[key].map((option) => (
                      <MealCard key={option.food_id} option={option} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
