"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthUser } from '../../../hooks/useAuthUser';
import DashboardShell from '../../../components/DashboardShell';
import StatCard from '../../../components/StatCard';
import { QuizAttempt } from '../../../lib/types';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);

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
      <main className="min-h-screen flex items-center justify-center bg-white">
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
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow hover:bg-sky-700 transition-colors"
        >
          Take Quiz
        </a>
      }
    >
      <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white p-8 shadow-sm">
        <p className="text-sm font-medium text-sky-100">Welcome back</p>
        <h2 className="mt-1 text-2xl font-bold">{profile?.name || 'Student'}</h2>
        <p className="mt-3 text-sky-100 max-w-md">
          {latest
            ? 'Your latest quiz has been submitted. Your teacher will review the results and reach out with feedback.'
            : "You haven't taken a diagnostic yet — start your first quiz when you're ready."}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <StatCard
          label="Attempts taken"
          value={attempts ? String(attempts.length) : '—'}
          accent="bg-sky-50 text-sky-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />}
        />
        <StatCard
          label="Last submitted"
          value={latest ? new Date(latest.completedAt).toLocaleDateString() : '—'}
          accent="bg-indigo-50 text-indigo-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Recent activity</h3>
          {attempts && attempts.length > 0 && (
            <a href="/dashboard/student/history" className="text-sm font-medium text-sky-600 hover:text-sky-700">
              View all
            </a>
          )}
        </div>
        {!attempts ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : attempts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No attempts yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {attempts.slice(0, 5).map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">{new Date(a.completedAt).toLocaleDateString()}</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submitted
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
