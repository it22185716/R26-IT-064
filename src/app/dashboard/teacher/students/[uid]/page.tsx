"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { useAuthUser } from '../../../../../hooks/useAuthUser';
import DashboardShell from '../../../../../components/DashboardShell';
import { QuizAttempt, UserProfile } from '../../../../../lib/types';

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const { user, profile, loading } = useAuthUser();
  const [student, setStudent] = useState<UserProfile | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);

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
    if (!profile || profile.role !== 'teacher' || !uid) return;

    getDoc(doc(db, 'users', uid)).then((snap) => {
      setStudent(snap.exists() ? (snap.data() as UserProfile) : null);
    });

    const q = query(collection(db, 'quizAttempts'), where('studentId', '==', uid));
    getDocs(q).then((snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt));
      results.sort((a, b) => b.completedAt - a.completedAt);
      setAttempts(results);
    });
  }, [profile, uid]);

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
      role="teacher"
      title={student?.name || student?.email || 'Student'}
      subtitle={student?.email}
      userName={profile?.name || user.email || ''}
      action={
        <a href="/dashboard/teacher/students" className="text-sm font-medium text-sky-600 hover:text-sky-700">
          ← Back to students
        </a>
      }
    >
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="font-semibold">Latest result</h3>
        {!attempts ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : !latest ? (
          <p className="mt-4 text-sm text-slate-500">This student hasn&apos;t taken a quiz yet.</p>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {Object.entries(latest.categoryScores).map(([category, score]) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{category}</span>
                    <span className="text-slate-500">{score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        category === latest.weakestCategory ? 'bg-rose-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700 font-medium">
                Weakest category: {latest.weakestCategory}
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-700 font-medium">
                Score: {latest.totalScore}/{latest.maxScore}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm overflow-x-auto">
        <h3 className="font-semibold">Attempt history</h3>
        {!attempts ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : attempts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No attempts yet.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Score</th>
                <th className="py-2 font-medium">Weakest category</th>
                <th className="py-2 font-medium">Category breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="py-3 text-slate-600 whitespace-nowrap">
                    {new Date(a.completedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 font-medium text-slate-700 whitespace-nowrap">
                    {a.totalScore}/{a.maxScore}
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-600 px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                      {a.weakestCategory}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">
                    {Object.entries(a.categoryScores)
                      .map(([category, score]) => `${category} ${score}%`)
                      .join(' · ')}
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
