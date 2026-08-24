"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthUser } from '../../../hooks/useAuthUser';
import { useParallax } from '../../../components/home/useParallax';
import { ScrollTrigger } from '../../../components/home/gsapClient';
import TeacherShell from '../../../components/dashboard/TeacherShell';
import StatCard from '../../../components/StatCard';
import GlassCard from '../../../components/dashboard/GlassCard';
import ImprovementBadge from '../../../components/dashboard/ImprovementBadge';
import { fetchAllPostTestResults, groupPostTestResultsByStudent } from '../../../lib/postTestResults';
import { QuizAttempt, UserProfile, VideoPostTestResult } from '../../../lib/types';

type StatusFilter = 'all' | 'completed' | 'pending';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [students, setStudents] = useState<UserProfile[] | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [postTestResults, setPostTestResults] = useState<VideoPostTestResult[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const pageRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);

  useParallax({ containerRef: pageRef, entranceRefs: [bannerRef, statsRef, panelsRef] });

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

    // Live listeners, not one-time fetches — a student's quiz submission
    // shows up here immediately without the teacher needing to reload.
    const unsubStudents = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (snap) => {
      setStudents(snap.docs.map((d) => d.data() as UserProfile));
    });

    const unsubAttempts = onSnapshot(
      query(collection(db, 'quizAttempts'), orderBy('completedAt', 'desc')),
      (snap) => {
        setAttempts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt)));
      }
    );

    return () => {
      unsubStudents();
      unsubAttempts();
    };
  }, [profile]);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') return;
    fetchAllPostTestResults().then(setPostTestResults);
  }, [profile]);

  useEffect(() => {
    // The students table's height changes once data loads, which can leave
    // ScrollTrigger's cached trigger positions stale for anything below the
    // fold. Recalculate them against the real, final layout.
    if (students && attempts && postTestResults) ScrollTrigger.refresh();
  }, [students, attempts, postTestResults]);

  const attemptsByStudent = useMemo(() => {
    const map = new Map<string, QuizAttempt[]>();
    attempts?.forEach((a) => {
      const list = map.get(a.studentId) || [];
      list.push(a);
      map.set(a.studentId, list);
    });
    return map;
  }, [attempts]);

  const postTestByStudent = useMemo(
    () => groupPostTestResultsByStudent(postTestResults || []),
    [postTestResults]
  );

  const categories = useMemo(
    () => Array.from(new Set(attempts?.map((a) => a.weakestCategory) || [])).sort(),
    [attempts]
  );

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const term = search.trim().toLowerCase();

    return students.filter((s) => {
      const latest = attemptsByStudent.get(s.uid)?.[0];

      if (statusFilter === 'completed' && !latest) return false;
      if (statusFilter === 'pending' && latest) return false;
      if (categoryFilter !== 'all' && latest?.weakestCategory !== categoryFilter) return false;
      if (term && !(s.name || '').toLowerCase().includes(term) && !(s.email || '').toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [students, attemptsByStudent, search, statusFilter, categoryFilter]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const latestByStudent = new Map<string, QuizAttempt>();
  attempts?.forEach((a) => {
    if (!latestByStudent.has(a.studentId)) latestByStudent.set(a.studentId, a);
  });

  const categoryCounts = new Map<string, number>();
  latestByStudent.forEach((a) => {
    categoryCounts.set(a.weakestCategory, (categoryCounts.get(a.weakestCategory) || 0) + 1);
  });
  const sortedCategoryCounts = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topWeakCategory = sortedCategoryCounts[0]?.[0] || '—';

  const assessedCount = latestByStudent.size;

  const latestPostTestByStudent = new Map<string, VideoPostTestResult>();
  postTestResults?.forEach((r) => {
    if (!latestPostTestByStudent.has(r.studentId)) latestPostTestByStudent.set(r.studentId, r);
  });
  const postTestedCount = latestPostTestByStudent.size;
  const postTestImprovedCount = Array.from(latestPostTestByStudent.values()).filter((r) => r.improved).length;
  const classAveragePct =
    latestByStudent.size > 0
      ? Math.round(
          Array.from(latestByStudent.values()).reduce((sum, a) => sum + (a.totalScore / a.maxScore) * 100, 0) /
            latestByStudent.size
        )
      : null;

  // "Recent" means recent activity, not Firestore's arbitrary document order —
  // students who've submitted most recently float to the top; those with no
  // attempt yet sink to the bottom.
  const recentStudents = [...(students || [])].sort((a, b) => {
    const aLatest = latestByStudent.get(a.uid)?.completedAt ?? -Infinity;
    const bLatest = latestByStudent.get(b.uid)?.completedAt ?? -Infinity;
    return bLatest - aLatest;
  });

  return (
    <TeacherShell userName={profile?.name || user.email || ''} title="Adaptive Learning">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div ref={pageRef} className="space-y-8">
      <div ref={bannerRef} className="opacity-0">
        {/* 1px gradient "edge light" border — a lit rim catching a key light
            from above-left, the signature cinematic-glass touch also used on
            the student hero. */}
        <div className="relative rounded-[2rem] bg-gradient-to-br from-white/25 via-white/10 to-transparent p-px shadow-[0_30px_80px_-24px_rgba(8,5,30,0.65)]">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#080b18] via-indigo-950 to-[#1b0f2e] px-6 py-9 sm:px-10 sm:py-12">
            {/* Atmosphere: drifting color blobs */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-16 -left-10 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl animate-blob" />
              <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl animate-blob [animation-delay:3s]" />
              <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-sky-400/15 blur-3xl animate-blob [animation-delay:5s]" />
            </div>

            {/* Faint dot grid, spotlight-faded toward the edges */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
                backgroundSize: '26px 26px',
                maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, black 25%, transparent 75%)',
                WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, black 25%, transparent 75%)',
              }}
            />

            {/* Film grain — kills banding on the flat dark gradient */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              }}
            />

            {/* Vignette — pulls focus back toward the greeting/stats */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_-10%,transparent_35%,rgba(2,6,23,0.55)_100%)]"
            />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-300 backdrop-blur-md">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse-glow motion-reduce:animate-none"
                    style={{ '--pulse-glow-rgb': '219,178,51' } as React.CSSProperties}
                  />
                  {getGreeting()}
                </span>
                <h1 className="mt-3 bg-gradient-to-br from-white via-white to-slate-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent drop-shadow-[0_4px_30px_rgba(99,102,241,0.35)] sm:text-[2.75rem]">
                  {profile?.name || 'Teacher'}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300/90">
                  {assessedCount > 0
                    ? `${assessedCount} student${assessedCount === 1 ? ' has' : 's have'} completed a diagnostic. ${topWeakCategory} is the most common weak area right now.`
                    : 'See which students need support, and where — no diagnostics submitted yet.'}
                </p>

                <div className="mt-6">
                  <a
                    href="#students"
                    className="group/cta inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-10px_rgba(255,255,255,0.55)]"
                  >
                    View all students
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-3 gap-3 sm:gap-4">
                {[
                  {
                    key: 'assessed',
                    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
                    value: students ? `${assessedCount}/${students.length}` : '—',
                    label: 'Assessed',
                    tile: 'from-blue-500 to-indigo-600',
                    glow: 'bg-indigo-500/40',
                    hoverShadow: 'hover:shadow-[0_16px_40px_-12px_rgba(99,102,241,0.45)]',
                  },
                  {
                    key: 'average',
                    icon: (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 17V9m6 8V5M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    ),
                    value: classAveragePct !== null ? `${classAveragePct}%` : '—',
                    label: 'Class average',
                    tile: 'from-emerald-500 to-teal-600',
                    glow: 'bg-emerald-500/40',
                    hoverShadow: 'hover:shadow-[0_16px_40px_-12px_rgba(16,185,129,0.45)]',
                  },
                  {
                    key: 'weakarea',
                    icon: (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    ),
                    value: topWeakCategory,
                    label: 'Top weak area',
                    tile: 'from-rose-500 to-pink-600',
                    glow: 'bg-rose-500/40',
                    hoverShadow: 'hover:shadow-[0_16px_40px_-12px_rgba(244,63,94,0.45)]',
                  },
                ].map((stat) => (
                  <div
                    key={stat.key}
                    className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.1] ${stat.hoverShadow}`}
                  >
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${stat.glow}`}
                    />
                    <div
                      className={`relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg ring-1 ring-inset ring-white/25 transition-transform duration-200 group-hover:scale-105 ${stat.tile}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {stat.icon}
                      </svg>
                    </div>
                    <p className="relative mt-3 break-words text-2xl font-bold text-white sm:text-3xl">{stat.value}</p>
                    <p className="relative mt-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={statsRef} className="grid grid-cols-2 gap-4 opacity-0 lg:grid-cols-4">
        <StatCard
          label="Total students"
          value={students ? String(students.length) : '—'}
          gradient="from-sky-500 to-blue-600"
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4"
            />
          }
        />
        <StatCard
          label="Assessed"
          value={students ? `${assessedCount}/${students.length}` : '—'}
          gradient="from-blue-500 to-indigo-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatCard
          label="Class average"
          value={classAveragePct !== null ? `${classAveragePct}%` : '—'}
          gradient="from-emerald-500 to-teal-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 17V9m6 8V5M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />}
        />
        <StatCard
          label="Most common weak area"
          value={topWeakCategory}
          gradient="from-rose-500 to-pink-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />}
        />
      </div>

      <div ref={panelsRef} className="grid gap-6 opacity-0 lg:grid-cols-3">
        <GlassCard hover={false} className="overflow-x-auto p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent students</h3>
            {students && students.length > 0 && (
              <a href="#students" className="text-sm font-medium text-sky-700 transition-colors hover:text-sky-900">
                View all
              </a>
            )}
          </div>
          {!students || !attempts ? (
            <p className="mt-4 text-sm text-slate-400">Loading…</p>
          ) : students.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No students registered yet.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-900/10 text-left text-slate-500">
                  <th className="py-2 font-medium">Student</th>
                  <th className="py-2 font-medium">Weakest category</th>
                  <th className="py-2 font-medium">Score</th>
                  <th className="py-2 font-medium">Last attempt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/10">
                {recentStudents.slice(0, 5).map((s) => {
                  const latest = latestByStudent.get(s.uid);
                  return (
                    <tr key={s.uid}>
                      <td className="py-3 font-medium text-slate-700">{s.name || s.email}</td>
                      <td className="py-3">
                        {latest ? (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                            {latest.weakestCategory}
                          </span>
                        ) : (
                          <span className="text-slate-400">No attempts</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600">
                        {latest ? `${latest.totalScore}/${latest.maxScore}` : '—'}
                      </td>
                      <td className="py-3 text-slate-500">
                        {latest ? new Date(latest.completedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </GlassCard>

        <GlassCard hover={false} className="p-6">
          <h3 className="font-semibold text-slate-900">Weakest categories (class-wide)</h3>
          {sortedCategoryCounts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No data yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sortedCategoryCounts.map(([category, count]) => (
                <li key={category} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{category}</span>
                  <span className="text-slate-500">
                    {count} student{count === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <div id="students" className="scroll-mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Student Roster</h2>
            <p className="mt-1 text-sm text-slate-500">Full roster with quiz activity.</p>
          </div>
          {postTestedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              {postTestImprovedCount} of {postTestedCount} student{postTestedCount === 1 ? '' : 's'} improved on their last post-test
            </span>
          )}
        </div>

        <GlassCard hover={false} className="mt-4 p-6">
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
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed a quiz</option>
              <option value="pending">Not attempted</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
            >
              <option value="all">All weak categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 overflow-x-auto">
            {!students || !attempts || !postTestResults ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-slate-500">No students registered yet.</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm text-slate-500">No students match these filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="py-2 font-medium">Student</th>
                    <th className="py-2 font-medium">Attempts</th>
                    <th className="py-2 font-medium">Weakest category</th>
                    <th className="py-2 font-medium">Score</th>
                    <th className="py-2 font-medium">Last attempt</th>
                    <th className="py-2 font-medium">Post-test progress</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => {
                    const studentAttempts = attemptsByStudent.get(s.uid) || [];
                    const latest = studentAttempts[0];
                    const latestPostTest = postTestByStudent.get(s.uid)?.[0];
                    return (
                      <tr
                        key={s.uid}
                        onClick={() => router.push(`/dashboard/teacher/students/${s.uid}`)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <td className="py-3">
                          <p className="font-medium text-slate-700">{s.name || s.email}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </td>
                        <td className="py-3 text-slate-600">{studentAttempts.length}</td>
                        <td className="py-3">
                          {latest ? (
                            <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-600 px-2.5 py-1 text-xs font-medium">
                              {latest.weakestCategory}
                            </span>
                          ) : (
                            <span className="text-slate-400">No attempts</span>
                          )}
                        </td>
                        <td className="py-3 text-slate-600">
                          {latest ? `${latest.totalScore}/${latest.maxScore}` : '—'}
                        </td>
                        <td className="py-3 text-slate-500">
                          {latest ? new Date(latest.completedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3">
                          {latestPostTest ? (
                            <ImprovementBadge improved={latestPostTest.improved}>
                              {latestPostTest.preScore}% → {latestPostTest.postScore}%
                            </ImprovementBadge>
                          ) : (
                            <span className="text-slate-400">No post-test yet</span>
                          )}
                        </td>
                        <td className="py-3 text-right text-sky-600 font-medium whitespace-nowrap">Continue →</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>
      </div>
      </div>
      </main>
    </TeacherShell>
  );
}
