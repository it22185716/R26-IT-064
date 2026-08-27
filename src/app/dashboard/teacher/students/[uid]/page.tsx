"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { useAuthUser } from '../../../../../hooks/useAuthUser';
import TeacherShell from '../../../../../components/dashboard/TeacherShell';
import GlassCard from '../../../../../components/dashboard/GlassCard';
import AssignVideosPanel from '../../../../../components/dashboard/AssignVideosPanel';
import TeacherGrowthHistoryView from '../../../../../components/dashboard/TeacherGrowthHistoryView';
import ImprovementBadge from '../../../../../components/dashboard/ImprovementBadge';
import { fetchMealPlanHistoryForStudent } from '../../../../../lib/mealPlan';
import { fetchPostTestResultsForStudent } from '../../../../../lib/postTestResults';
import { MealPlan, QuizAttempt, UserProfile, VideoPostTestResult } from '../../../../../lib/types';

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const { user, profile, loading } = useAuthUser();
  const [student, setStudent] = useState<UserProfile | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlan[] | null>(null);
  const [postTestResults, setPostTestResults] = useState<VideoPostTestResult[] | null>(null);

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

  // Load this student's meal plan history for the Meal Plan History section below.
  useEffect(() => {
    if (!profile || profile.role !== 'teacher' || !uid) return;
    fetchMealPlanHistoryForStudent(uid).then(setMealPlans);
  }, [profile, uid]);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher' || !uid) return;
    fetchPostTestResultsForStudent(uid).then(setPostTestResults);
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
        <a href="/dashboard/teacher#students" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Back to Adaptive Learning
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

      <GlassCard hover={false} className="mt-6 overflow-x-auto p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-600 text-white shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
            </svg>
          </div>
          <h3 className="font-semibold">Adaptive Learning Progress</h3>
        </div>
        {!postTestResults ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : postTestResults.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">This student hasn&apos;t completed a post-test yet.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Weak area</th>
                <th className="py-2 font-medium">Pre-test score</th>
                <th className="py-2 font-medium">Post-test score</th>
                <th className="py-2 font-medium">Result</th>
                <th className="py-2 font-medium">Improved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {postTestResults.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 text-slate-600 whitespace-nowrap">
                    {new Date(r.completedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-600 px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                      {r.weakArea}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 whitespace-nowrap">{r.preScore}%</td>
                  <td className="py-3 font-medium text-slate-700 whitespace-nowrap">{r.postScore}%</td>
                  <td className="py-3 text-slate-500 whitespace-nowrap">
                    {r.correctCount}/{r.totalQuestions}
                  </td>
                  <td className="py-3">
                    <ImprovementBadge improved={r.improved}>{r.improved ? 'Improved' : 'Not yet'}</ImprovementBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {/* Meal Plan History: growth trends (BMI, weight, height) across this student's past meal plans. */}
      <GlassCard hover={false} className="mt-6 overflow-x-auto p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <h3 className="font-semibold">Meal Plan History</h3>
        </div>
        {!mealPlans ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : mealPlans.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">This student hasn&apos;t generated a meal plan yet.</p>
        ) : (
          // Delegates the actual trend rendering to the shared teacher-facing growth history view.
          <TeacherGrowthHistoryView plans={mealPlans} />
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
