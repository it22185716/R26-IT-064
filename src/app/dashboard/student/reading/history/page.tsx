"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../../hooks/useAuthUser';
import DashboardShell from '../../../../../components/DashboardShell';
import { fetchReadingHistory } from '../../../../../lib/reading';
import { ReadingAttempt } from '../../../../../lib/types';

const levelBadgeStyle: Record<string, string> = {
  HIGH: 'bg-emerald-50 text-emerald-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  LOW: 'bg-rose-50 text-rose-700',
};

export default function ReadingHistoryPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [attempts, setAttempts] = useState<ReadingAttempt[] | null>(null);

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
    fetchReadingHistory(user.uid).then(setAttempts);
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
      title="Reading History"
      subtitle="Every reading passage you've attempted."
      userName={profile?.name || user.email || ''}
    >
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm overflow-x-auto">
        {!attempts ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : attempts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">You haven&apos;t practiced reading yet.</p>
            <a
              href="/dashboard/student/reading"
              className="mt-4 inline-flex items-center justify-center px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow hover:bg-sky-700 transition-colors"
            >
              Start reading practice
            </a>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Difficulty</th>
                <th className="py-2 font-medium">Accuracy</th>
                <th className="py-2 font-medium">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="py-3 text-slate-600 whitespace-nowrap">
                    {new Date(a.completedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-slate-600">{a.difficulty}</td>
                  <td className="py-3 text-slate-600">{a.accuracy}%</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelBadgeStyle[a.level]}`}
                    >
                      {a.level}
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
