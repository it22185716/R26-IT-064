"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import TeacherShell from '../../../../components/dashboard/TeacherShell';
import GlassCard from '../../../../components/dashboard/GlassCard';
import { QuizAttempt, UserProfile } from '../../../../lib/types';

type StatusFilter = 'all' | 'completed' | 'pending';

export default function TeacherStudentsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [students, setStudents] = useState<UserProfile[] | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

    // Live listeners, not one-time fetches — the roster updates immediately
    // when a student submits, no page reload needed.
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

  const attemptsByStudent = useMemo(() => {
    const map = new Map<string, QuizAttempt[]>();
    attempts?.forEach((a) => {
      const list = map.get(a.studentId) || [];
      list.push(a);
      map.set(a.studentId, list);
    });
    return map;
  }, [attempts]);

  const categories = useMemo(
    () => Array.from(new Set(attempts?.map((a) => a.weakestCategory) || [])).sort(),
    [attempts]
  );

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const term = search.trim().toLowerCase();

    return students.filter((s) => {
      const latest = attemptsByStudent.get(s.uid)?.[0];

      if (statusFilter === 'completed' && !latest) return false;
      if (statusFilter === 'pending' && latest) return false;
      if (categoryFilter !== 'all' && latest?.weakestCategory !== categoryFilter) return false;
      if (term && !(s.name || '').toLowerCase().includes(term) && !(s.email || '').toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [students, attemptsByStudent, search, statusFilter, categoryFilter]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <TeacherShell userName={profile?.name || user.email || ''} title="Students">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <p className="text-sm text-slate-500">Management</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Students</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Full roster with quiz activity.</p>

        <GlassCard hover={false} className="mt-8 p-6">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed a quiz</option>
            <option value="pending">Not attempted</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
          >
            <option value="all">All weak categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 overflow-x-auto">
          {!students || !attempts ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-slate-500">No students registered yet.</p>
          ) : filteredStudents.length === 0 ? (
            <p className="text-sm text-slate-500">No students match these filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2 font-medium">Student</th>
                  <th className="py-2 font-medium">Attempts</th>
                  <th className="py-2 font-medium">Weakest category</th>
                  <th className="py-2 font-medium">Score</th>
                  <th className="py-2 font-medium">Last attempt</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const studentAttempts = attemptsByStudent.get(s.uid) || [];
                  const latest = studentAttempts[0];
                  return (
                    <tr
                      key={s.uid}
                      onClick={() => router.push(`/dashboard/teacher/students/${s.uid}`)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="py-3">
                        <p className="font-medium text-slate-700">{s.name || s.email}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </td>
                      <td className="py-3 text-slate-600">{studentAttempts.length}</td>
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
                      <td className="py-3 text-right text-sky-600 font-medium whitespace-nowrap">Continue →</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        </GlassCard>
      </main>
    </TeacherShell>
  );
}
