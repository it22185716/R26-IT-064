"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthUser } from '../../../hooks/useAuthUser';
import { useParallax } from '../../../components/home/useParallax';
import { ScrollTrigger } from '../../../components/home/gsapClient';
import TeacherShell from '../../../components/dashboard/TeacherShell';
import StatCard from '../../../components/StatCard';
import GlassCard from '../../../components/dashboard/GlassCard';
import { QuizAttempt, UserProfile } from '../../../lib/types';

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
    // The students table's height changes once data loads, which can leave
    // ScrollTrigger's cached trigger positions stale for anything below the
    // fold. Recalculate them against the real, final layout.
    if (students && attempts) ScrollTrigger.refresh();
  }, [students, attempts]);

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
    <TeacherShell userName={profile?.name || user.email || ''} title="Overview">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div ref={pageRef} className="space-y-8">
      <div ref={bannerRef} className="opacity-0">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-8 sm:px-10 sm:py-10">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-16 -left-10 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl animate-blob" />
            <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl animate-blob [animation-delay:3s]" />
            <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl animate-blob [animation-delay:5s]" />
          </div>

          <div className="relative">
            <p className="text-sm font-medium text-indigo-200">{getGreeting()}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">{profile?.name || 'Teacher'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              {assessedCount > 0
                ? `${assessedCount} student${assessedCount === 1 ? ' has' : 's have'} completed a diagnostic. ${topWeakCategory} is the most common weak area right now.`
                : 'See which students need support, and where — no diagnostics submitted yet.'}
            </p>

            <div className="mt-6">
              <a
                href="/dashboard/teacher/students"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-100"
              >
                View all students
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
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
              <a href="/dashboard/teacher/students" className="text-sm font-medium text-sky-700 transition-colors hover:text-sky-900">
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
      </div>
      </main>
    </TeacherShell>
  );
}
