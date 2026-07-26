"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthUser } from '../../../hooks/useAuthUser';
import { useParallax } from '../../../components/home/useParallax';
import { ScrollTrigger } from '../../../components/home/gsapClient';
import { useStaggerReveal } from '../../../components/dashboard/useStaggerReveal';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import DashboardBackground from '../../../components/dashboard/DashboardBackground';
import GlassCard from '../../../components/dashboard/GlassCard';
import NavCard from '../../../components/dashboard/NavCard';
import StatCard from '../../../components/StatCard';
import { QuizAttempt } from '../../../lib/types';

const NAV_CARDS = [
  {
    href: '/quiz',
    title: 'Take Quiz',
    description: 'Start a new diagnostic and get instant, adaptive feedback on where you stand.',
    accent: 'bg-gradient-to-br from-sky-500 to-indigo-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  {
    href: '/dashboard/student/history',
    title: 'Quiz History',
    description: 'Review your past attempts and see how your scores have progressed.',
    accent: 'bg-gradient-to-br from-indigo-500 to-violet-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    href: '/dashboard/student/meal-plan',
    title: 'Meal Plan',
    description: 'Get a personalized nutrition plan built around your profile.',
    accent: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 3v18M4.5 3v6a3.75 3.75 0 007.5 0V3M19.5 3v18M19.5 3a3 3 0 013 3v3a3 3 0 01-3 3"
      />
    ),
  },
  {
    href: '/dashboard/student/reading',
    title: 'Reading Practice',
    description: 'Read a passage aloud and get instant accuracy feedback from our AI model.',
    accent: 'bg-gradient-to-br from-amber-500 to-orange-600',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
  },
];

export default function StudentDashboard() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);

  const mainRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const navGridRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const navCardRef0 = useRef<HTMLAnchorElement>(null);
  const navCardRef1 = useRef<HTMLAnchorElement>(null);
  const navCardRef2 = useRef<HTMLAnchorElement>(null);
  const navCardRef3 = useRef<HTMLAnchorElement>(null);
  const navCardRefs = [navCardRef0, navCardRef1, navCardRef2, navCardRef3];

  useParallax({ containerRef: mainRef, entranceRefs: [heroRef, statsRef, activityRef] });
  useStaggerReveal(navGridRef, navCardRefs);

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

  useEffect(() => {
    // The activity list's height changes once attempts load, which can leave
    // ScrollTrigger's cached trigger positions stale for anything below the
    // fold. Recalculate them against the real, final layout.
    if (attempts) ScrollTrigger.refresh();
  }, [attempts]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-violet-100">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const latest = attempts?.[0];

  return (
    <div className="relative min-h-screen">
      <DashboardBackground scrollContainerRef={mainRef} />

      <div className="relative flex min-h-screen flex-col">
        <DashboardHeader role="student" title="Overview" userName={profile?.name || user.email || ''} />

        <main ref={mainRef} className="flex-1">
          <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 md:px-10 md:py-14">
            <div ref={heroRef} className="opacity-0">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-600 p-8 text-white shadow-[0_4px_20px_rgba(79,70,229,0.30),0_32px_64px_rgba(79,70,229,0.30)] sm:p-10">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
                />
                <div className="relative">
                  <p className="text-sm font-medium text-sky-100">Welcome back</p>
                  <h2 className="mt-1 text-3xl font-bold sm:text-4xl">{profile?.name || 'Student'}</h2>
                  <p className="mt-4 max-w-xl text-sky-100">
                    {latest
                      ? 'Your latest quiz has been submitted. Your teacher will review the results and reach out with feedback.'
                      : "You haven't taken a diagnostic yet — start your first quiz when you're ready."}
                  </p>
                  <a
                    href="/quiz"
                    className="group relative mt-6 inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-[0_2px_8px_rgba(15,23,42,0.20),0_16px_32px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(15,23,42,0.25),0_24px_44px_rgba(15,23,42,0.22)] active:translate-y-0 active:scale-95"
                  >
                    Take Quiz
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
              <div ref={navGridRef} className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {NAV_CARDS.map((card, i) => (
                  <NavCard
                    key={card.href}
                    ref={navCardRefs[i]}
                    href={card.href}
                    title={card.title}
                    description={card.description}
                    accent={card.accent}
                    icon={card.icon}
                  />
                ))}
              </div>
            </div>

            <div ref={statsRef} className="opacity-0">
              <h2 className="text-lg font-semibold text-slate-900">Your progress</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
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
        </main>
      </div>
    </div>
  );
}
