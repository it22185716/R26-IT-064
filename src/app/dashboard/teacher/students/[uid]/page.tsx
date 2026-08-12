"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { useAuthUser } from '../../../../../hooks/useAuthUser';
import TeacherShell from '../../../../../components/dashboard/TeacherShell';
import GlassCard from '../../../../../components/dashboard/GlassCard';
import AssignVideosPanel from '../../../../../components/dashboard/AssignVideosPanel';
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

    // Live listener, not a one-time fetch — a new submission from this
    // student appears immediately while the teacher is already on this page.
    const q = query(collection(db, 'quizAttempts'), where('studentId', '==', uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt));
      results.sort((a, b) => b.completedAt - a.completedAt);
      setAttempts(results);
    });

    return () => unsubscribe();
  }, [profile, uid]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const latest = attempts?.[0];

  return (
    <TeacherShell userName={profile?.name || user.email || ''} title={student?.name || student?.email || 'Student'}>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <a href="/dashboard/teacher/students" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Back to students
        </a>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          {student?.name || student?.email || 'Student'}
        </h1>
        {student?.email && <p className="mt-1 text-sm text-slate-500">{student.email}</p>}

        <GlassCard hover={false} className="mt-8 p-6">
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
                {latest.predictionMethod === 'model' && typeof latest.confidence === 'number' && (
                  <span className="ml-1 text-rose-500">({Math.round(latest.confidence * 100)}% AI confidence)</span>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-700 font-medium">
                Score: {latest.totalScore}/{latest.maxScore}
              </div>
            </div>
          </>
        )}
        </GlassCard>

      <GlassCard hover={false} className="mt-6 overflow-x-auto p-6">
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
      </GlassCard>

      <GlassCard hover={false} className="mt-6 p-6">
        <h3 className="font-semibold">Recommend videos</h3>
        <p className="mt-1 text-sm text-slate-500">
          Assign videos for this student to watch — they&apos;ll appear on their dashboard under &quot;Your recommendations&quot;.
        </p>
        <div className="mt-4">
          <AssignVideosPanel
            studentId={uid}
            weakArea={latest?.weakestCategory}
            teacherName={profile?.name || user.email || 'Teacher'}
          />
        </div>
      </GlassCard>
      </main>
    </TeacherShell>
  );
}
