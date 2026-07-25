"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthUser } from '../../../hooks/useAuthUser';
import { useParallax } from '../../../components/home/useParallax';
import { ScrollTrigger } from '../../../components/home/gsapClient';
import DashboardShell from '../../../components/DashboardShell';
import StatCard from '../../../components/StatCard';
import GlassCard from '../../../components/dashboard/GlassCard';
import { QuizAttempt, UserProfile } from '../../../lib/types';

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

    getDocs(query(collection(db, 'users'), where('role', '==', 'student'))).then((snap) => {
      setStudents(snap.docs.map((d) => d.data() as UserProfile));
    });

    getDocs(query(collection(db, 'quizAttempts'), orderBy('completedAt', 'desc'))).then((snap) => {
      setAttempts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt)));
    });
  }, [profile]);

  useEffect(() => {
    // The students table's height changes once data loads, which can leave
    // ScrollTrigger's cached trigger positions stale for anything below the
    // fold. Recalculate them against the real, final layout.
    if (students && attempts) ScrollTrigger.refresh();
  }, [students, attempts]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-violet-100">
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

  return (
    <DashboardShell
      role="teacher"
      title="Overview"
      subtitle="See which students need support, and where."
      userName={profile?.name || user.email || ''}
      action={
        <a
          href="/dashboard/teacher/students"
          className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(79,70,229,0.30),0_16px_32px_rgba(79,70,229,0.25)] ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(79,70,229,0.40),0_24px_44px_rgba(79,70,229,0.35)] active:translate-y-0 active:scale-95"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-[400ms] ease-out group-hover:translate-x-full"
          />
          View all students
        </a>
      }
    >
      <div ref={pageRef} className="space-y-6">
      <div ref={bannerRef} className="opacity-0">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-600 p-8 text-white shadow-[0_4px_16px_rgba(79,70,229,0.30),0_24px_48px_rgba(79,70,229,0.28)]">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
          />
          <div className="relative">
            <p className="text-sm font-medium text-sky-100">Welcome back</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{profile?.name || 'Teacher'}</h2>
            <p className="mt-3 max-w-md text-sky-100">
              {assessedCount > 0
                ? `${assessedCount} student${assessedCount === 1 ? ' has' : 's have'} completed a diagnostic. ${topWeakCategory} is the most common weak area right now.`
                : 'No students have completed a diagnostic yet.'}
            </p>
          </div>
        </div>
      </div>

      <div ref={statsRef} className="grid grid-cols-2 gap-4 opacity-0 lg:grid-cols-4">
        <StatCard
          label="Total students"
          value={students ? String(students.length) : '—'}
          accent="bg-sky-100 text-sky-600"
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
          accent="bg-indigo-100 text-indigo-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatCard
          label="Class average"
          value={classAveragePct !== null ? `${classAveragePct}%` : '—'}
          accent="bg-emerald-100 text-emerald-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 17V9m6 8V5M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />}
        />
        <StatCard
          label="Most common weak area"
          value={topWeakCategory}
          accent="bg-rose-100 text-rose-600"
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
                {students.slice(0, 5).map((s) => {
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
    </DashboardShell>
  );
}
