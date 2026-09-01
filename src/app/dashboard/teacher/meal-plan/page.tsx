"use client";

import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import { useStaggerReveal } from '../../../../components/dashboard/useStaggerReveal';
import { useCountUp } from '../../../../components/dashboard/useCountUp';
import TeacherShell from '../../../../components/dashboard/TeacherShell';
import GlassCard from '../../../../components/dashboard/GlassCard';
import { fetchMealPlanHistory } from '../../../../lib/mealPlan';
import { MealPlan, UserProfile } from '../../../../lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_WINDOW_MS = 3 * DAY_MS;

type StatusMeta = { badgeBg: string; badgeText: string; dot: string; icon: React.ReactNode };

const CHECK_ICON = (
  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25 4.5-4.5m5.25 2.25a9 9 0 11-18 0 9 9 0 0118 0z" />
);
const UP_ICON = <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />;
const DOWN_ICON = <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l6-6m-6 6l-6-6" />;
const WARNING_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
  />
);

// Cosmetic only — falls back to slate for any status string not seen here, so
// an unexpected value from the ML service still renders instead of breaking.
const STATUS_META: Record<string, StatusMeta> = {
  Normal: { badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', dot: 'bg-emerald-500', icon: CHECK_ICON },
  Overweight: { badgeBg: 'bg-amber-50', badgeText: 'text-amber-700', dot: 'bg-amber-500', icon: UP_ICON },
  Obesity: { badgeBg: 'bg-red-50', badgeText: 'text-red-700', dot: 'bg-red-500', icon: WARNING_ICON },
  'Severe Thinness': { badgeBg: 'bg-red-50', badgeText: 'text-red-700', dot: 'bg-red-500', icon: WARNING_ICON },
  Thinness: { badgeBg: 'bg-amber-50', badgeText: 'text-amber-700', dot: 'bg-amber-500', icon: DOWN_ICON },
};
const DEFAULT_STATUS_META: StatusMeta = {
  badgeBg: 'bg-slate-100',
  badgeText: 'text-slate-600',
  dot: 'bg-slate-400',
  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
};

function getStatusMeta(status: string): StatusMeta {
  return STATUS_META[status] || DEFAULT_STATUS_META;
}

function filterPillClasses(active: boolean): string {
  return `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
    active ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;
}

// First letter of up to the first two words of a name, falling back to '?' when there's nothing to initialize.
function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return initials || '?';
}

// Turns a raw expiry timestamp into a human "N days left"/"Expired" label for the table.
function formatExpiry(expiresAt: number, now: number): string {
  const daysLeft = Math.ceil((expiresAt - now) / DAY_MS);
  if (daysLeft <= 0) return 'Expired';
  return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
}

type MealStatTileProps = {
  icon: React.ReactNode;
  value: string;
  label: string;
  /** Tailwind gradient classes for the icon chip, e.g. "from-violet-500 to-purple-600". */
  tile: string;
  /** Tailwind bg color class for the ambient glow blob, e.g. "bg-violet-400". */
  glow: string;
};

// Frosted-glass stat tile — an icon chip in brand color floats on translucent
// glass instead of the flat gradient fill StatCard uses elsewhere, so this
// row reads as "glass over content" rather than a solid color block.
const MealStatTile = forwardRef<HTMLDivElement, MealStatTileProps>(({ icon, value, label, tile, glow }, ref) => {
  const valueRef = useCountUp(value);

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/80 hover:bg-white/75 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06),0_20px_40px_rgba(15,23,42,0.14)]"
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70 ${glow}`}
      />
      <div
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ring-1 ring-inset ring-white/40 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${tile}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {icon}
        </svg>
      </div>
      <p ref={valueRef} className="relative mt-4 text-[1.75rem] font-bold leading-none tracking-tight text-slate-900">
        {value}
      </p>
      <p className="relative mt-1.5 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
});
MealStatTile.displayName = 'MealStatTile';

export default function TeacherMealPlanPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [students, setStudents] = useState<UserProfile[] | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlan[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'has' | 'none'>('all');
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [historyByStudent, setHistoryByStudent] = useState<Record<string, MealPlan[]>>({});
  const [historyLoadingUid, setHistoryLoadingUid] = useState<string | null>(null);

  const statsGridRef = useRef<HTMLDivElement>(null);
  const statTileRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  useStaggerReveal(statsGridRef, statTileRefs);

  // Redirect unauthenticated users to sign in, and non-teachers away from this page.
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

  // Uids of students that currently exist, so stat tiles derived from
  // mealPlans can be cross-checked against the same source of truth the
  // table uses instead of trusting studentIds that may be orphaned.
  const currentStudentUids = useMemo(() => new Set((students ?? []).map((s) => s.uid)), [students]);

  // Distinct statuses seen across all plans, used to populate the filter pills.
  const nutritionalStatusOptions = useMemo(
    () => Array.from(new Set((mealPlans || []).map((p) => p.nutritionalStatus))).sort(),
    [mealPlans]
  );

  // Only counts students who are both in the current students list and have
  // a meal plan — latestMealPlanByStudent alone can include studentIds whose
  // account was deleted or changed role, which would inflate this beyond
  // students.length (the denominator shown in the same tile).
  const mealPlanCoverage = useMemo(
    () => (students ?? []).filter((s) => latestMealPlanByStudent.has(s.uid)).length,
    [students, latestMealPlanByStudent]
  );

  // Counts current students whose latest plan lists at least one allergy, for the "Allergy alerts" tile.
  const allergyAlertCount = useMemo(
    () =>
      Array.from(latestMealPlanByStudent.entries()).filter(
        ([uid, p]) => currentStudentUids.has(uid) && p.profile.allergies && p.profile.allergies.length > 0
      ).length,
    [latestMealPlanByStudent, currentStudentUids]
  );

  // Current students' plans expiring within the next 3 days, so teachers can nudge them to regenerate in time.
  const expiringSoonCount = useMemo(() => {
    const now = Date.now();
    return Array.from(latestMealPlanByStudent.entries()).filter(
      ([uid, p]) => currentStudentUids.has(uid) && p.expiresAt >= now && p.expiresAt <= now + EXPIRING_SOON_WINDOW_MS
    ).length;
  }, [latestMealPlanByStudent, currentStudentUids]);

  // Applies the search box and the status/plan-presence filters together to the student list.
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const term = search.trim().toLowerCase();

    return students.filter((s) => {
      const latest = latestMealPlanByStudent.get(s.uid);
      if (planFilter === 'has' && !latest) return false;
      if (planFilter === 'none' && latest) return false;
      if (statusFilter !== 'all' && latest?.nutritionalStatus !== statusFilter) return false;
      if (term && !(s.name || '').toLowerCase().includes(term) && !(s.email || '').toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [students, latestMealPlanByStudent, search, statusFilter, planFilter]);

  // Expands a student's row and lazy-loads their meal plan history only the first time it's opened.
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

        <div ref={statsGridRef} className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MealStatTile
            ref={statTileRefs[0]}
            label="Meal plans generated"
            value={students && mealPlans ? `${mealPlanCoverage}/${students.length}` : '—'}
            tile="from-violet-500 to-purple-600"
            glow="bg-violet-400"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 21V12.75M8.25 12.75a2.25 2.25 0 01-2.25-2.25V3.75m2.25 9a2.25 2.25 0 002.25-2.25V3.75M8.25 3.75v3M15.75 3.75c0 3-2.25 4.5-2.25 7.5 0 1.036.84 1.875 1.875 1.875h.375V21"
              />
            }
          />
          <MealStatTile
            ref={statTileRefs[1]}
            label="Allergy alerts"
            value={mealPlans ? String(allergyAlertCount) : '—'}
            tile="from-amber-500 to-red-600"
            glow="bg-amber-400"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            }
          />
          <MealStatTile
            ref={statTileRefs[2]}
            label="Plans expiring soon"
            value={mealPlans ? String(expiringSoonCount) : '—'}
            tile="from-yellow-500 to-orange-600"
            glow="bg-orange-400"
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
          />
        </div>

        <GlassCard hover={false} className="mt-8 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <svg
                aria-hidden
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              >
                <circle cx="10.5" cy="10.5" r="6.5" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="relative">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value as 'all' | 'has' | 'none')}
                className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All students</option>
                <option value="has">Has a meal plan</option>
                <option value="none">No meal plan yet</option>
              </select>
              <svg
                aria-hidden
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setStatusFilter('all')} className={filterPillClasses(statusFilter === 'all')}>
                All
              </button>
              {nutritionalStatusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={filterPillClasses(statusFilter === s)}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === s ? 'bg-white' : getStatusMeta(s).dot}`} />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {!students || !mealPlans ? (
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
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
                    const meta = latest ? getStatusMeta(latest.nutritionalStatus) : null;
                    const expiry = latest ? formatExpiry(latest.expiresAt, now) : null;
                    const expiryUrgent = latest ? latest.expiresAt <= now + EXPIRING_SOON_WINDOW_MS : false;

                    return (
                      <React.Fragment key={s.uid}>
                        <tr
                          onClick={() => latest && toggleExpanded(s.uid)}
                          className={`group transition-colors ${latest ? 'cursor-pointer hover:bg-slate-50/80' : ''}`}
                        >
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-maroon-600 text-[11px] font-semibold text-white shadow-sm">
                                {getInitials(s.name || s.email)}
                              </span>
                              <span className="min-w-0">
                                <p className="truncate font-medium text-slate-700">{s.name || s.email}</p>
                                <p className="truncate text-xs text-slate-400">{s.email}</p>
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            {latest && meta ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badgeBg} ${meta.badgeText}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  {meta.icon}
                                </svg>
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
                                {latest.profile.allergies.slice(0, 3).map((a) => (
                                  <span
                                    key={a}
                                    className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                                  >
                                    {a}
                                  </span>
                                ))}
                                {latest.profile.allergies.length > 3 && (
                                  <span className="text-xs text-slate-400">+{latest.profile.allergies.length - 3}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">None</span>
                            )}
                          </td>
                          <td className="py-3 text-slate-500">
                            {latest ? new Date(latest.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3">
                            {latest ? (
                              <span
                                className={`text-xs font-semibold ${
                                  expiry === 'Expired' ? 'text-red-600' : expiryUrgent ? 'text-amber-600' : 'text-slate-500'
                                }`}
                              >
                                {expiry}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {latest && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                                  expanded ? 'rotate-180 text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            )}
                          </td>
                        </tr>

                        {expanded && latest && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50/70 px-4 py-5">
                              {historyLoadingUid === s.uid || !history ? (
                                <p className="text-sm text-slate-400">Loading history…</p>
                              ) : (
                                <div className="animate-fade-in-up grid gap-6 lg:grid-cols-2">
                                  <div>
                                    <h4 className="text-sm font-semibold text-slate-900">BMI trend</h4>
                                    <ul className="mt-2 space-y-1.5">
                                      {history.map((p) => (
                                        <li key={p.id} className="flex items-center justify-between text-sm">
                                          <span className="text-slate-500">
                                            {new Date(p.createdAt).toLocaleDateString()}
                                          </span>
                                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                                            <span className={`h-1.5 w-1.5 rounded-full ${getStatusMeta(p.nutritionalStatus).dot}`} />
                                            BMI {p.profile.bmi} · {p.nutritionalStatus}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Change since previous plan</h4>
                                    {latest.progressSinceLastPlan ? (
                                      <ul className="mt-2 space-y-1.5 text-sm">
                                        <li className="flex items-center justify-between">
                                          <span className="text-slate-500">Weight</span>
                                          <span className="font-medium text-slate-700">
                                            {latest.progressSinceLastPlan.weightChangeKg! > 0 ? '+' : ''}
                                            {latest.progressSinceLastPlan.weightChangeKg} kg
                                          </span>
                                        </li>
                                        <li className="flex items-center justify-between">
                                          <span className="text-slate-500">Height</span>
                                          <span className="font-medium text-slate-700">
                                            {latest.progressSinceLastPlan.heightChangeCm! > 0 ? '+' : ''}
                                            {latest.progressSinceLastPlan.heightChangeCm} cm
                                          </span>
                                        </li>
                                        <li className="flex items-center justify-between">
                                          <span className="text-slate-500">BMI</span>
                                          <span className="font-medium text-slate-700">
                                            {latest.progressSinceLastPlan.bmiChange! > 0 ? '+' : ''}
                                            {latest.progressSinceLastPlan.bmiChange}
                                          </span>
                                        </li>
                                        <li className="pt-1 text-xs text-slate-400">
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
