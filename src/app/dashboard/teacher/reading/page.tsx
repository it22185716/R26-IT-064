"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import TeacherShell from '../../../../components/dashboard/TeacherShell';
import GlassCard from '../../../../components/dashboard/GlassCard';
import StatCard from '../../../../components/StatCard';
import CategoryBreakdownChart from '../../../../components/dashboard/CategoryBreakdownChart';
import { ReadingAttempt, UserProfile } from '../../../../lib/types';

// Same HIGH/MEDIUM/LOW color mapping as the student-facing reading page's
// levelBadgeStyle (src/app/dashboard/student/reading/page.tsx), minus the
// glow shadow — that's sized for a single hero badge, not a table pill.
const levelPillStyle: Record<string, string> = {
  HIGH: 'bg-emerald-50 text-emerald-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  LOW: 'bg-rose-50 text-rose-700',
};

export default function TeacherReadingProgressPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [students, setStudents] = useState<UserProfile[] | null>(null);
  const [attempts, setAttempts] = useState<ReadingAttempt[] | null>(null);
  const [search, setSearch] = useState('');

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

    // Live listeners, not one-time fetches — same pattern as the rest of the
    // teacher dashboard. A single class-wide query, not one per student.
    const unsubStudents = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (snap) => {
      setStudents(snap.docs.map((d) => d.data() as UserProfile));
    });

    const unsubAttempts = onSnapshot(
      query(collection(db, 'readingAttempts'), orderBy('completedAt', 'desc')),
      (snap) => {
        setAttempts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReadingAttempt)));
      }
    );

    return () => {
      unsubStudents();
      unsubAttempts();
    };
  }, [profile]);

  // attempts is already ordered by completedAt desc, so first-seen-wins per
  // studentId gives each student's most recent attempt — same dedup idiom
  // used for "latest record per student" elsewhere in the teacher dashboard.
  const attemptsByStudent = useMemo(() => {
    const map = new Map<string, ReadingAttempt[]>();
    attempts?.forEach((a) => {
      const list = map.get(a.studentId) || [];
      list.push(a);
      map.set(a.studentId, list);
    });
    return map;
  }, [attempts]);

  const latestByStudent = useMemo(() => {
    const map = new Map<string, ReadingAttempt>();
    attemptsByStudent.forEach((list, studentId) => {
      if (list[0]) map.set(studentId, list[0]);
    });
    return map;
  }, [attemptsByStudent]);

  const assessedCount = latestByStudent.size;

  const classAverageAccuracy = useMemo(() => {
    if (latestByStudent.size === 0) return null;
    const total = Array.from(latestByStudent.values()).reduce((sum, a) => sum + a.accuracy, 0);
    return Math.round(total / latestByStudent.size);
  }, [latestByStudent]);

  const levelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    latestByStudent.forEach((a) => {
      counts.set(a.level, (counts.get(a.level) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [latestByStudent]);
  const topLevel = levelCounts[0];
  const topLevelLabel = topLevel ? `${topLevel[0]} (${topLevel[1]})` : '—';

  const levelDistributionPct = useMemo(() => {
    const total = latestByStudent.size;
    if (total === 0) return {};
    const scores: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    latestByStudent.forEach((a) => {
      scores[a.level] = (scores[a.level] || 0) + 1;
    });
    Object.keys(scores).forEach((k) => {
      scores[k] = Math.round((scores[k] / total) * 100);
    });
    return scores;
  }, [latestByStudent]);

  // A pattern, not a blip — a single LOW attempt doesn't count. Both of the
  // student's last two attempts (most recent first) must be LOW.
  const belowGradeLevelCount = useMemo(() => {
    let count = 0;
    attemptsByStudent.forEach((list) => {
      if (list.length >= 2 && list[0].level === 'LOW' && list[1].level === 'LOW') count += 1;
    });
    return count;
  }, [attemptsByStudent]);

  // Name-alphabetical is the predictable default — a "needs attention first"
  // sort would need a defined tiebreak policy across LOW/never-assessed/etc.
  // that nobody has specified yet, so keep this simple and scannable.
  // Only students with at least one recorded attempt belong in this table.
  const assessedStudents = useMemo(() => {
    if (!students) return [];
    return [...students]
      .filter((s) => latestByStudent.has(s.uid))
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  }, [students, latestByStudent]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assessedStudents;
    return assessedStudents.filter(
      (s) => (s.name || '').toLowerCase().includes(term) || (s.email || '').toLowerCase().includes(term)
    );
  }, [assessedStudents, search]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <TeacherShell userName={profile?.name || user.email || ''} title="Reading Progress">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <p className="text-sm text-slate-500">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Reading Progress</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Class-wide reading assessment coverage, accuracy, and level trends.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Assessments completed"
            value={students && attempts ? `${assessedCount}/${students.length}` : '—'}
            gradient="from-cyan-500 to-teal-600"
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
          />
          <StatCard
            label="Class average accuracy"
            value={attempts ? (classAverageAccuracy !== null ? `${classAverageAccuracy}%` : '—') : '—'}
            gradient="from-indigo-500 to-violet-600"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            }
          />
          <StatCard
            label="Reading level distribution"
            value={attempts ? topLevelLabel : '—'}
            gradient="from-purple-500 to-fuchsia-600"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6zM13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
              />
            }
          />
          <StatCard
            label="Below grade level"
            value={attempts ? String(belowGradeLevelCount) : '—'}
            gradient="from-amber-600 to-red-700"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6L9 12.75l4.306-4.306a11.95 11.95 0 015.814 5.518l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941"
              />
            }
          />
        </div>

        <GlassCard hover={false} className="mt-6 p-6">
          <h3 className="font-semibold text-slate-900">Reading level breakdown</h3>
          {!students || !attempts ? (
            <p className="mt-4 text-sm text-slate-400">Loading…</p>
          ) : attempts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No reading assessments recorded yet.</p>
          ) : (
            <div className="mt-4 max-w-md">
              <CategoryBreakdownChart categoryScores={levelDistributionPct} weakestCategory="LOW" />
            </div>
          )}
        </GlassCard>

        <GlassCard hover={false} className="mt-6 p-6">
          <h3 className="font-semibold text-slate-900">Student Progress</h3>
          <p className="mt-1 text-sm text-slate-500">
            Reading level, accuracy, and assessment activity for students who have completed at least one assessment.
          </p>

          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            {!students || !attempts ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-slate-500">No students registered yet.</p>
            ) : assessedStudents.length === 0 ? (
              <p className="text-sm text-slate-500">No students have completed a reading assessment yet.</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm text-slate-500">No students match this search.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="py-2 font-medium">Student</th>
                    <th className="py-2 font-medium">Level</th>
                    <th className="py-2 font-medium">Accuracy</th>
                    <th className="py-2 font-medium">Assessments</th>
                    <th className="py-2 font-medium">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s, idx) => {
                    const latest = latestByStudent.get(s.uid);
                    const attemptCount = attemptsByStudent.get(s.uid)?.length ?? 0;
                    return (
                      <tr key={s.uid} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="py-3">
                          <p className="font-medium text-slate-700">{s.name || s.email}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </td>
                        <td className="py-3">
                          {latest && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${levelPillStyle[latest.level]}`}>
                              {latest.level}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-600">{latest ? `${latest.accuracy}%` : '—'}</td>
                        <td className="py-3 text-slate-600">{attemptCount}</td>
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
        </GlassCard>
      </main>
    </TeacherShell>
  );
}
