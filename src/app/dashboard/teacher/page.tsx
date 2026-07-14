"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthUser } from '../../../hooks/useAuthUser';
import DashboardShell from '../../../components/DashboardShell';
import StatCard from '../../../components/StatCard';
import { QuizAttempt, UserProfile } from '../../../lib/types';

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [students, setStudents] = useState<UserProfile[] | null>(null);
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
    if (!profile || profile.role !== 'teacher') return;

    getDocs(query(collection(db, 'users'), where('role', '==', 'student'))).then((snap) => {
      setStudents(snap.docs.map((d) => d.data() as UserProfile));
    });

    getDocs(query(collection(db, 'quizAttempts'), orderBy('completedAt', 'desc'))).then((snap) => {
      setAttempts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt)));
    });
  }, [profile]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
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
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow hover:bg-sky-700 transition-colors"
        >
          View all students
        </a>
      }
    >
      <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white p-8 shadow-sm">
        <p className="text-sm font-medium text-sky-100">Welcome back</p>
        <h2 className="mt-1 text-2xl font-bold">{profile?.name || 'Teacher'}</h2>
        <p className="mt-3 text-sky-100 max-w-md">
          {assessedCount > 0
            ? `${assessedCount} student${assessedCount === 1 ? ' has' : 's have'} completed a diagnostic. ${topWeakCategory} is the most common weak area right now.`
            : 'No students have completed a diagnostic yet.'}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total students"
          value={students ? String(students.length) : '—'}
          accent="bg-sky-50 text-sky-600"
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
          accent="bg-indigo-50 text-indigo-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatCard
          label="Class average"
          value={classAveragePct !== null ? `${classAveragePct}%` : '—'}
          accent="bg-emerald-50 text-emerald-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 17V9m6 8V5M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />}
        />
        <StatCard
          label="Most common weak area"
          value={topWeakCategory}
          accent="bg-rose-50 text-rose-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-100 bg-white p-6 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Recent students</h3>
            {students && students.length > 0 && (
              <a href="/dashboard/teacher/students" className="text-sm font-medium text-sky-600 hover:text-sky-700">
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
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 font-medium">Student</th>
                  <th className="py-2 font-medium">Weakest category</th>
                  <th className="py-2 font-medium">Score</th>
                  <th className="py-2 font-medium">Last attempt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.slice(0, 5).map((s) => {
                  const latest = latestByStudent.get(s.uid);
                  return (
                    <tr key={s.uid}>
                      <td className="py-3 font-medium text-slate-700">{s.name || s.email}</td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Weakest categories (class-wide)</h3>
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
        </div>
      </div>
    </DashboardShell>
  );
}
