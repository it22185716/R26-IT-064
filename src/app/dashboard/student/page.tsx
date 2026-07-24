"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthUser } from '../../../hooks/useAuthUser';
import { useParallax } from '../../../components/home/useParallax';
import DashboardShell from '../../../components/DashboardShell';
import StatCard from '../../../components/StatCard';
import GlassCard from '../../../components/dashboard/GlassCard';
import { QuizAttempt } from '../../../lib/types';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  useParallax({ containerRef: pageRef, entranceRefs: [bannerRef, statsRef, activityRef] });

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
    const q = query(collection(db, 'quizAttempts'), where('studentId', '==', user.uid));
    getDocs(q).then((snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt));
      results.sort((a, b) => b.completedAt - a.completedAt);
      setAttempts(results);
    });
  }, [user]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-violet-100">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const latest = attempts?.[0];

  return (
    <DashboardShell
      role="student"
      title="Overview"
      subtitle="Take diagnostics and track your submission history."
      userName={profile?.name || user.email || ''}
      action={
        <a
          href="/quiz"
          className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(79,70,229,0.30),0_16px_32px_rgba(79,70,229,0.25)] ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(79,70,229,0.40),0_24px_44px_rgba(79,70,229,0.35)] active:translate-y-0 active:scale-95"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-[400ms] ease-out group-hover:translate-x-full"
          />
          Take Quiz
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
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{profile?.name || 'Student'}</h2>
              <p className="mt-3 max-w-md text-sky-100">
                {latest
                  ? 'Your latest quiz has been submitted. Your teacher will review the results and reach out with feedback.'
                  : "You haven't taken a diagnostic yet — start your first quiz when you're ready."}
              </p>
            </div>
          </div>
        </div>

        <div ref={statsRef} className="grid grid-cols-2 gap-4 opacity-0">
          <StatCard
            label="Attempts taken"
            value={attempts ? String(attempts.length) : '—'}
            accent="bg-sky-100 text-sky-600"
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />}
          />
          <StatCard
            label="Last submitted"
            value={latest ? new Date(latest.completedAt).toLocaleDateString() : '—'}
            accent="bg-indigo-100 text-indigo-600"
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
          />
        </div>

        <div ref={activityRef} className="opacity-0">
          <GlassCard hover={false} className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Recent activity</h3>
              {attempts && attempts.length > 0 && (
                <a href="/dashboard/student/history" className="text-sm font-medium text-sky-700 transition-colors hover:text-sky-900">
                  View all
                </a>
              )}
            </div>
            {!attempts ? (
              <p className="mt-4 text-sm text-slate-400">Loading…</p>
            ) : attempts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No attempts yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-900/10">
                {attempts.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="text-slate-600">{new Date(a.completedAt).toLocaleDateString()}</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Submitted
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
