"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import DashboardShell from '../../../../components/DashboardShell';
import { QuizAttempt } from '../../../../lib/types';

export default function StudentHistoryPage() {
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

  return (
    <DashboardShell
      role="student"
      title="Quiz History"
      subtitle="Every diagnostic you've submitted. Ask your teacher for your results."
      userName={profile?.name || user.email || ''}
    >
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm overflow-x-auto">
        {!attempts ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : attempts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">You haven&apos;t taken a quiz yet.</p>
            <a
              href="/quiz"
              className="mt-4 inline-flex items-center justify-center px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow hover:bg-sky-700 transition-colors"
            >
              Take your first quiz
            </a>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="py-3 text-slate-600 whitespace-nowrap">
                    {new Date(a.completedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Submitted
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}
