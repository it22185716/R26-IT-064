"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import TeacherShell from '../../../../components/dashboard/TeacherShell';
import GlassCard from '../../../../components/dashboard/GlassCard';
import StatCard from '../../../../components/StatCard';
import { fetchMealPlanHistory } from '../../../../lib/mealPlan';
import { MealPlan, UserProfile } from '../../../../lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_WINDOW_MS = 3 * DAY_MS;

// Cosmetic only — falls back to slate for any status string not seen here, so
// an unexpected value from the ML service still renders instead of breaking.
function statusBadgeClasses(status: string): string {
  switch (status) {
    case 'Normal':
      return 'bg-emerald-50 text-emerald-700';
    case 'Overweight':
      return 'bg-amber-50 text-amber-700';
    case 'Obesity':
    case 'Severe Thinness':
      return 'bg-red-50 text-red-700';
    case 'Thinness':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function formatExpiry(expiresAt: number, now: number): string {
  const daysLeft = Math.ceil((expiresAt - now) / DAY_MS);
  if (daysLeft <= 0) return 'Expired';
  return `${daysLeft}d left`;
}

export default function TeacherMealPlanPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [students, setStudents] = useState<UserProfile[] | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlan[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [historyByStudent, setHistoryByStudent] = useState<Record<string, MealPlan[]>>({});
  const [historyLoadingUid, setHistoryLoadingUid] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }
    if (profile && profile.role !== 'teacher') {
      router.replace('/dashboard/student');
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') return;

    // Live listeners, not one-time fetches — same pattern as the rest of the
    // teacher dashboard, so a newly generated plan shows up without a reload.
    const unsubStudents = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (snap) => {
      setStudents(snap.docs.map((d) => d.data() as UserProfile));
    });

    const unsubMealPlans = onSnapshot(
      query(collection(db, 'mealPlans'), orderBy('createdAt', 'desc')),
      (snap) => {
        setMealPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealPlan)));
      }
    );

    return () => {
      unsubStudents();
      unsubMealPlans();
    };
  }, [profile]);

  // mealPlans is already ordered by createdAt desc, so first-seen-wins per
  // studentId gives the latest plan — same dedup idiom used elsewhere in the
  // teacher dashboard for "latest record per student".
  const latestMealPlanByStudent = useMemo(() => {
    const map = new Map<string, MealPlan>();
    mealPlans?.forEach((p) => {
      if (!map.has(p.studentId)) map.set(p.studentId, p);
    });
    return map;
  }, [mealPlans]);

  const nutritionalStatusOptions = useMemo(
    () => Array.from(new Set((mealPlans || []).map((p) => p.nutritionalStatus))).sort(),
    [mealPlans]
  );

  const nutritionalStatusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    latestMealPlanByStudent.forEach((p) => {
      counts.set(p.nutritionalStatus, (counts.get(p.nutritionalStatus) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [latestMealPlanByStudent]);
  const topNutritionalStatus = nutritionalStatusCounts[0];
  const topNutritionalStatusLabel = topNutritionalStatus
    ? `${topNutritionalStatus[0]} (${topNutritionalStatus[1]})`
    : '—';

  const mealPlanCoverage = latestMealPlanByStudent.size;

  const allergyAlertCount = useMemo(
    () =>
      Array.from(latestMealPlanByStudent.values()).filter(
        (p) => p.profile.allergies && p.profile.allergies.length > 0
      ).length,
    [latestMealPlanByStudent]
  );

  const expiringSoonCount = useMemo(() => {
    const now = Date.now();
    return Array.from(latestMealPlanByStudent.values()).filter(
      (p) => p.expiresAt >= now && p.expiresAt <= now + EXPIRING_SOON_WINDOW_MS
    ).length;
  }, [latestMealPlanByStudent]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const term = search.trim().toLowerCase();

    return students.filter((s) => {
      const latest = latestMealPlanByStudent.get(s.uid);
      if (statusFilter !== 'all' && latest?.nutritionalStatus !== statusFilter) return false;
      if (term && !(s.name || '').toLowerCase().includes(term) && !(s.email || '').toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [students, latestMealPlanByStudent, search, statusFilter]);

  async function toggleExpanded(uid: string) {
    if (expandedUid === uid) {
      setExpandedUid(null);
      return;
    }
    setExpandedUid(uid);
    if (!historyByStudent[uid]) {
      setHistoryLoadingUid(uid);
      const history = await fetchMealPlanHistory(uid);
      setHistoryByStudent((prev) => ({ ...prev, [uid]: history }));
      setHistoryLoadingUid(null);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const now = Date.now();

  return (
    <TeacherShell userName={profile?.name || user.email || ''} title="Meal & Nutrition">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <p className="text-sm text-slate-500">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Meal & Nutrition</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Meal plan coverage, nutritional status, and allergy monitoring across your students.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Meal plans generated"
            value={students && mealPlans ? `${mealPlanCoverage}/${students.length}` : '—'}
            gradient="from-violet-500 to-purple-600"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 21V12.75M8.25 12.75a2.25 2.25 0 01-2.25-2.25V3.75m2.25 9a2.25 2.25 0 002.25-2.25V3.75M8.25 3.75v3M15.75 3.75c0 3-2.25 4.5-2.25 7.5 0 1.036.84 1.875 1.875 1.875h.375V21"
              />
            }
          />
          <StatCard
            label="Nutritional status"
            value={mealPlans ? topNutritionalStatusLabel : '—'}
            gradient="from-lime-500 to-green-600"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6zM13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
              />
            }
          />
          <StatCard
            label="Allergy alerts"
            value={mealPlans ? String(allergyAlertCount) : '—'}
            gradient="from-amber-500 to-red-600"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            }
          />
          <StatCard
            label="Plans expiring soon"
            value={mealPlans ? String(expiringSoonCount) : '—'}
            gradient="from-yellow-500 to-orange-600"
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
          />
        </div>

        <GlassCard hover={false} className="mt-8 p-6">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
            >
              <option value="all">All nutritional statuses</option>
              {nutritionalStatusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 overflow-x-auto">
            {!students || !mealPlans ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : mealPlans.length === 0 ? (
              <p className="text-sm text-slate-500">No meal plans generated yet.</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm text-slate-500">No students match these filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="py-2 font-medium">Student</th>
                    <th className="py-2 font-medium">Nutritional status</th>
                    <th className="py-2 font-medium">BMI</th>
                    <th className="py-2 font-medium">Allergies</th>
                    <th className="py-2 font-medium">Plan created</th>
                    <th className="py-2 font-medium">Expiry</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => {
                    const latest = latestMealPlanByStudent.get(s.uid);
                    const expanded = expandedUid === s.uid;
                    const history = historyByStudent[s.uid];

                    return (
                      <React.Fragment key={s.uid}>
                        <tr
                          onClick={() => latest && toggleExpanded(s.uid)}
                          className={latest ? 'cursor-pointer hover:bg-slate-50' : 'text-slate-400'}
                        >
                          <td className="py-3">
                            <p className="font-medium text-slate-700">{s.name || s.email}</p>
                            <p className="text-xs text-slate-400">{s.email}</p>
                          </td>
                          <td className="py-3">
                            {latest ? (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(
                                  latest.nutritionalStatus
                                )}`}
                              >
                                {latest.nutritionalStatus}
                              </span>
                            ) : (
                              <span className="text-slate-400">No plan yet</span>
                            )}
                          </td>
                          <td className="py-3 text-slate-600">{latest ? latest.profile.bmi : '—'}</td>
                          <td className="py-3">
                            {latest && latest.profile.allergies.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {latest.profile.allergies.map((a) => (
                                  <span
                                    key={a}
                                    className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">None</span>
                            )}
                          </td>
                          <td className="py-3 text-slate-500">
                            {latest ? new Date(latest.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 text-slate-500">{latest ? formatExpiry(latest.expiresAt, now) : '—'}</td>
                          <td className="py-3 text-right font-medium whitespace-nowrap">
                            {latest && (
                              <span className="text-sky-600">{expanded ? 'Hide history ▴' : 'View history ▾'}</span>
                            )}
                          </td>
                        </tr>

                        {expanded && latest && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50 px-4 py-5">
                              {historyLoadingUid === s.uid || !history ? (
                                <p className="text-sm text-slate-400">Loading history…</p>
                              ) : (
                                <div className="grid gap-6 lg:grid-cols-2">
                                  <div>
                                    <h4 className="text-sm font-semibold text-slate-900">BMI trend</h4>
                                    <ul className="mt-2 space-y-1.5">
                                      {history.map((p) => (
                                        <li key={p.id} className="flex items-center justify-between text-sm">
                                          <span className="text-slate-500">
                                            {new Date(p.createdAt).toLocaleDateString()}
                                          </span>
                                          <span className="text-slate-700">
                                            BMI {p.profile.bmi} · {p.nutritionalStatus}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Change since previous plan</h4>
                                    {latest.progressSinceLastPlan ? (
                                      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                                        <li>
                                          Weight: {latest.progressSinceLastPlan.weightChangeKg! > 0 ? '+' : ''}
                                          {latest.progressSinceLastPlan.weightChangeKg} kg
                                        </li>
                                        <li>
                                          Height: {latest.progressSinceLastPlan.heightChangeCm! > 0 ? '+' : ''}
                                          {latest.progressSinceLastPlan.heightChangeCm} cm
                                        </li>
                                        <li>
                                          BMI: {latest.progressSinceLastPlan.bmiChange! > 0 ? '+' : ''}
                                          {latest.progressSinceLastPlan.bmiChange}
                                        </li>
                                        <li className="text-slate-400">
                                          {latest.progressSinceLastPlan.daysSinceLastPlan} days since previous plan
                                        </li>
                                      </ul>
                                    ) : (
                                      <p className="mt-2 text-sm text-slate-400">No previous plan to compare.</p>
                                    )}
                                  </div>

                                  <div className="lg:col-span-2">
                                    <h4 className="text-sm font-semibold text-slate-900">Allergies</h4>
                                    {latest.profile.allergies.length > 0 ? (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {latest.profile.allergies.map((a) => (
                                          <span
                                            key={a}
                                            className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
                                          >
                                            {a}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-2 text-sm text-slate-400">None reported.</p>
                                    )}
                                  </div>

                                  <div className="lg:col-span-2">
                                    <h4 className="text-sm font-semibold text-slate-900">Current meal calendar</h4>
                                    <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-slate-100 text-left text-slate-400">
                                            <th className="px-3 py-1.5 font-medium">Day</th>
                                            <th className="px-3 py-1.5 font-medium">Breakfast</th>
                                            <th className="px-3 py-1.5 font-medium">Lunch</th>
                                            <th className="px-3 py-1.5 font-medium">Dinner</th>
                                            <th className="px-3 py-1.5 font-medium">Snack</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                          {latest.weeklyCalendar.map((d) => (
                                            <tr key={d.day}>
                                              <td className="px-3 py-1.5 text-slate-500">{d.day}</td>
                                              <td className="px-3 py-1.5 text-slate-700">{d.breakfast.name}</td>
                                              <td className="px-3 py-1.5 text-slate-700">{d.lunch.name}</td>
                                              <td className="px-3 py-1.5 text-slate-700">{d.dinner.name}</td>
                                              <td className="px-3 py-1.5 text-slate-700">{d.snack.name}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>
      </main>
    </TeacherShell>
  );
}
