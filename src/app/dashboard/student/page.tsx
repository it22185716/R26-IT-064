"use client";

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthUser } from '../../../hooks/useAuthUser';
import { fetchReadingHistory } from '../../../lib/reading';
import { fetchMealPlanHistory } from '../../../lib/mealPlan';
import { useParallax } from '../../../components/home/useParallax';
import { ScrollTrigger } from '../../../components/home/gsapClient';
import { useStaggerReveal } from '../../../components/dashboard/useStaggerReveal';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import DashboardBackground from '../../../components/dashboard/DashboardBackground';
import DashboardScrollTint from '../../../components/dashboard/DashboardScrollTint';
import GlassCard from '../../../components/dashboard/GlassCard';
import NavCard from '../../../components/dashboard/NavCard';
import StatCard from '../../../components/StatCard';
import RadialGauge from '../../../components/dashboard/RadialGauge';
import { QuizAttempt, MealPlan, ReadingAttempt } from '../../../lib/types';

// Scroll-tint colors for each section below the fold — soft, low-alpha radial
// washes (see DashboardScrollTint) so the white glass cards stay readable.
const TINT_PROGRESS = 'rgba(201,162,39,0.40)'; // warm gold/amber (#C9A227)
const TINT_ACTIVITY = 'rgba(79,70,229,0.42)'; // deep indigo/purple, cooler & darker
const TINT_RECOMMENDED = 'rgba(5,150,105,0.42)'; // saturated emerald/teal

const DAY_MS = 24 * 60 * 60 * 1000;

const NAV_CARDS = [
  {
    href: '/quiz',
    title: 'Take Quiz',
    description: 'Start a new diagnostic and get instant, adaptive feedback on where you stand.',
    accent: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    glow: 'shadow-lg shadow-blue-500/20',
    primary: true,
    pulseRgb: '59 130 246',
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
    accent: 'bg-gradient-to-br from-purple-500 to-violet-600',
    glow: 'shadow-lg shadow-purple-500/20',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    href: '/dashboard/student/meal-plan',
    title: 'Meal Plan',
    description: 'Get a personalized nutrition plan built around your profile.',
    accent: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    glow: 'shadow-lg shadow-emerald-500/20',
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
    glow: 'shadow-lg shadow-amber-500/20',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
  },
  {
    href: '/dashboard/student/video-recommendation',
    title: 'Video Recommendation',
    description: 'Watch curated videos picked for your learning progress.',
    accent: 'bg-gradient-to-br from-rose-500 to-pink-600',
    glow: 'shadow-lg shadow-rose-500/20',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    ),
  },
];

function bmiZone(bmi: number): { label: string; from: string; to: string } {
  if (bmi < 18.5) return { label: 'Underweight', from: '#38BDF8', to: '#0EA5E9' };
  if (bmi < 25) return { label: 'Healthy range', from: '#34D399', to: '#059669' };
  if (bmi < 30) return { label: 'Overweight', from: '#FBBF24', to: '#D97706' };
  return { label: 'Obese', from: '#FB7185', to: '#E11D48' };
}

// Visual fill only — maps a sensible 15–35 BMI display window onto 0–100%.
function bmiGaugePercent(bmi: number): number {
  return Math.max(0, Math.min(100, ((bmi - 15) / (35 - 15)) * 100));
}

type TimelineEntry = {
  id: string;
  type: 'quiz' | 'meal' | 'reading';
  label: string;
  detail: string;
  date: number;
};

const TIMELINE_DOT: Record<TimelineEntry['type'], string> = {
  quiz: 'bg-blue-500',
  meal: 'bg-emerald-500',
  reading: 'bg-amber-500',
};

function buildTimeline(
  attempts: QuizAttempt[] | null,
  mealPlans: MealPlan[] | null,
  readingAttempts: ReadingAttempt[] | null,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  attempts?.forEach((a) =>
    entries.push({
      id: `quiz-${a.id}`,
      type: 'quiz',
      label: 'Quiz submitted',
      detail: 'Awaiting teacher review',
      date: a.completedAt,
    }),
  );
  mealPlans?.forEach((m) =>
    entries.push({
      id: `meal-${m.id}`,
      type: 'meal',
      label: 'Meal plan generated',
      detail: m.mealGoal,
      date: m.createdAt,
    }),
  );
  readingAttempts?.forEach((r) =>
    entries.push({
      id: `reading-${r.id}`,
      type: 'reading',
      label: 'Reading passage completed',
      detail: `${r.accuracy}% accuracy · ${r.difficulty}`,
      date: r.completedAt,
    }),
  );

  return entries.sort((a, b) => b.date - a.date).slice(0, 8);
}

type Recommendation = {
  key: string;
  title: string;
  description: string;
  href: string;
  accent: string;
  glow: string;
  icon: ReactNode;
};

const QUIZ_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  />
);
const MEAL_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M8.25 3v18M4.5 3v6a3.75 3.75 0 007.5 0V3M19.5 3v18M19.5 3a3 3 0 013 3v3a3 3 0 01-3 3"
  />
);
const READING_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
  />
);
// TODO: replace with real ML-driven recommendations once that service
// exists — for now these are simple rules over the student's own real
// quiz/meal-plan/reading data (already fetched above).
function buildRecommendations(
  attempts: QuizAttempt[],
  mealPlans: MealPlan[],
  readingAttempts: ReadingAttempt[],
): Recommendation[] {
  const recs: Recommendation[] = [];

  const latestAttempt = attempts[0];
  if (!latestAttempt) {
    recs.push({
      key: 'quiz-first',
      title: 'Take your first quiz',
      description: 'Get a baseline read on where you stand across topics.',
      href: '/quiz',
      accent: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      glow: 'shadow-lg shadow-blue-500/20',
      icon: QUIZ_ICON,
    });
  } else if (Date.now() - latestAttempt.completedAt > 7 * DAY_MS) {
    recs.push({
      key: 'quiz-weekly',
      title: 'Take your weekly quiz',
      description: "It's been a while since your last attempt — keep your progress fresh.",
      href: '/quiz',
      accent: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      glow: 'shadow-lg shadow-blue-500/20',
      icon: QUIZ_ICON,
    });
  }

  const latestMealPlan = mealPlans[0];
  if (!latestMealPlan) {
    recs.push({
      key: 'meal-first',
      title: 'Set up your meal plan',
      description: 'Get a personalized nutrition plan built around your profile.',
      href: '/dashboard/student/meal-plan',
      accent: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      glow: 'shadow-lg shadow-emerald-500/20',
      icon: MEAL_ICON,
    });
  } else if (Date.now() - latestMealPlan.createdAt > 30 * DAY_MS) {
    recs.push({
      key: 'meal-refresh',
      title: 'Update your meal plan',
      description: 'Your profile may have changed — refresh your recommendations.',
      href: '/dashboard/student/meal-plan',
      accent: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      glow: 'shadow-lg shadow-emerald-500/20',
      icon: MEAL_ICON,
    });
  }

  const latestReading = readingAttempts[0];
  if (!latestReading) {
    recs.push({
      key: 'reading-first',
      title: 'Try a reading passage',
      description: 'Read a short passage aloud and get instant accuracy feedback.',
      href: '/dashboard/student/reading',
      accent: 'bg-gradient-to-br from-amber-500 to-orange-600',
      glow: 'shadow-lg shadow-amber-500/20',
      icon: READING_ICON,
    });
  } else if (latestReading.level === 'LOW') {
    recs.push({
      key: 'reading-practice',
      title: 'Practice reading again',
      description: "You're close to leveling up — one more passage could do it.",
      href: '/dashboard/student/reading',
      accent: 'bg-gradient-to-br from-amber-500 to-orange-600',
      glow: 'shadow-lg shadow-amber-500/20',
      icon: READING_ICON,
    });
  }

  if (recs.length === 0) {
    recs.push({
      key: 'all-caught-up',
      title: "You're all caught up",
      description: 'Nice work — check back after your next quiz or meal plan update.',
      href: '/dashboard/student',
      accent: 'bg-gradient-to-br from-purple-500 to-violet-600',
      glow: 'shadow-lg shadow-purple-500/20',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    });
  }

  return recs.slice(0, 4);
}

type Achievement = {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: ReactNode;
};

// TODO: replace with real data from Firebase once a dedicated
// achievements/milestones collection exists. The `unlocked` flags below are
// already derived from real counts — only the badge catalog is a placeholder.
function buildAchievements(
  attempts: QuizAttempt[],
  mealPlans: MealPlan[],
  readingAttempts: ReadingAttempt[],
): Achievement[] {
  return [
    {
      key: 'first-quiz',
      title: 'First Steps',
      description: 'Complete your first quiz',
      unlocked: attempts.length >= 1,
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
    {
      key: 'consistent-learner',
      title: 'Consistent Learner',
      description: 'Complete 5 quizzes',
      unlocked: attempts.length >= 5,
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />,
    },
    {
      key: 'meal-planner',
      title: 'Meal Planner',
      description: 'Generate your first meal plan',
      unlocked: mealPlans.length >= 1,
      icon: MEAL_ICON,
    },
    {
      key: 'bookworm',
      title: 'Bookworm',
      description: 'Complete 3 reading passages',
      unlocked: readingAttempts.length >= 3,
      icon: READING_ICON,
    },
  ];
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlan[] | null>(null);
  const [readingAttempts, setReadingAttempts] = useState<ReadingAttempt[] | null>(null);

  const mainRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const navGridRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const recommendedRef = useRef<HTMLDivElement>(null);

  const navCardRef0 = useRef<HTMLAnchorElement>(null);
  const navCardRef1 = useRef<HTMLAnchorElement>(null);
  const navCardRef2 = useRef<HTMLAnchorElement>(null);
  const navCardRef3 = useRef<HTMLAnchorElement>(null);
  const navCardRef4 = useRef<HTMLAnchorElement>(null);
  const navCardRefs = [navCardRef0, navCardRef1, navCardRef2, navCardRef3, navCardRef4];

  const progressGridRef = useRef<HTMLDivElement>(null);
  const progressCardRef0 = useRef<HTMLDivElement>(null);
  const progressCardRef1 = useRef<HTMLDivElement>(null);
  const progressCardRef2 = useRef<HTMLDivElement>(null);
  const progressCardRef3 = useRef<HTMLDivElement>(null);
  const progressCardRefs = [progressCardRef0, progressCardRef1, progressCardRef2, progressCardRef3];

  const achievementsGridRef = useRef<HTMLDivElement>(null);
  const achievementRef0 = useRef<HTMLDivElement>(null);
  const achievementRef1 = useRef<HTMLDivElement>(null);
  const achievementRef2 = useRef<HTMLDivElement>(null);
  const achievementRef3 = useRef<HTMLDivElement>(null);
  const achievementRefs = [achievementRef0, achievementRef1, achievementRef2, achievementRef3];

  useParallax({ containerRef: mainRef, entranceRefs: [heroRef, activityRef, recommendedRef] });
  useStaggerReveal(navGridRef, navCardRefs);
  useStaggerReveal(progressGridRef, progressCardRefs, { start: 'top 80%' });
  useStaggerReveal(achievementsGridRef, achievementRefs, { start: 'top 80%' });

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

  // TODO: replace with real data from Firebase — already wired to the
  // mealPlans/readingAttempts collections written by their respective API
  // routes, so this becomes real the moment a student has used those features.
  useEffect(() => {
    if (!user) return;
    fetchMealPlanHistory(user.uid).then(setMealPlans);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchReadingHistory(user.uid).then(setReadingAttempts);
  }, [user]);

  useEffect(() => {
    // New sections load their data async and change page height, which can
    // leave ScrollTrigger's cached trigger positions (incl. the scroll-tint
    // sections) stale for anything below the fold. Recalculate once loaded.
    if (attempts && mealPlans && readingAttempts) ScrollTrigger.refresh();
  }, [attempts, mealPlans, readingAttempts]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-violet-100">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const latest = attempts?.[0];
  const latestMealPlan = mealPlans?.[0];
  const latestReading = readingAttempts?.[0];
  const timeline = buildTimeline(attempts, mealPlans, readingAttempts);
  const dataLoaded = attempts && mealPlans && readingAttempts;
  const recommendations = dataLoaded ? buildRecommendations(attempts, mealPlans, readingAttempts) : [];
  const achievements = dataLoaded ? buildAchievements(attempts, mealPlans, readingAttempts) : [];

  // Corner badges for the Quick actions cards below the floating bar.
  const quickActionBadges: Record<string, string | undefined> = {
    '/quiz': attempts && attempts.length > 0 ? `${attempts.length} taken` : undefined,
    '/dashboard/student/history': attempts && attempts.length > 0 ? `${attempts.length}` : undefined,
    '/dashboard/student/meal-plan': latestMealPlan ? bmiZone(latestMealPlan.profile.bmi).label : mealPlans ? 'Not set up' : undefined,
    '/dashboard/student/reading': latestReading ? latestReading.level : readingAttempts ? 'Not started' : undefined,
  };

  return (
    <div className="relative min-h-screen">
      <DashboardBackground scrollContainerRef={mainRef} />
      <DashboardScrollTint />

      <div className="relative flex min-h-screen flex-col">
        <DashboardHeader role="student" title="Overview" userName={profile?.name || user.email || ''} />

        <main ref={mainRef} className="flex-1">
          {/* Full-bleed hero — deliberately outside the max-w-6xl content
              container below so the image can touch both screen edges. */}
          <div ref={heroRef} className="opacity-0">
            <div className="relative h-[400px] w-full overflow-hidden rounded-b-3xl shadow-[0_8px_30px_rgba(26,16,53,0.35),0_32px_64px_rgba(26,16,53,0.30)] sm:h-[460px]">
              {/* TODO: replace with real Hayagiri College photo */}
              <Image
                src="/hero-campus.jpg"
                alt="Hayagiri International Buddhist College campus"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center animate-ken-burns"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
                <p className="text-sm font-semibold tracking-wide text-gold-300">Welcome back</p>
                <h2 className="mt-1 text-3xl font-bold text-white drop-shadow-sm sm:text-4xl">{profile?.name || 'Student'}</h2>
                <p className="mt-3 max-w-xl text-base text-white/85">
                  Track your quizzes, get a personalized meal plan, sharpen your reading, and explore recommended
                  videos — all in one place.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl space-y-12 px-4 pb-10 pt-10 sm:px-6 md:px-10 md:pb-14 md:pt-14">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
              <div ref={navGridRef} className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {NAV_CARDS.map((card, i) => (
                  <NavCard
                    key={card.href}
                    ref={navCardRefs[i]}
                    href={card.href}
                    title={card.title}
                    description={card.description}
                    icon={card.icon}
                    accent={card.accent}
                    glow={card.glow}
                    primary={card.primary}
                    pulseRgb={card.pulseRgb}
                    badge={quickActionBadges[card.href]}
                  />
                ))}
              </div>
            </div>

            {/* ---- Your Progress (scroll-tint: gold/amber) ---- */}
            <section data-dashboard-tint data-tint-color={TINT_PROGRESS}>
              <h2 className="text-lg font-semibold text-slate-900">Your progress</h2>
              <div ref={progressGridRef} className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  ref={progressCardRefs[0]}
                  label="Attempts taken"
                  value={attempts ? String(attempts.length) : '—'}
                  accent="bg-gold-100 text-gold-700"
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />}
                />
                <StatCard
                  ref={progressCardRefs[1]}
                  label="Last submitted"
                  value={latest ? new Date(latest.completedAt).toLocaleDateString() : '—'}
                  accent="bg-maroon-100 text-maroon-700"
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                />

                <GlassCard ref={progressCardRefs[2]} className="flex flex-col items-center p-5">
                  {latestMealPlan ? (
                    <RadialGauge
                      percent={bmiGaugePercent(latestMealPlan.profile.bmi)}
                      centerLabel={latestMealPlan.profile.bmi.toFixed(1)}
                      label={bmiZone(latestMealPlan.profile.bmi).label}
                      colorFrom={bmiZone(latestMealPlan.profile.bmi).from}
                      colorTo={bmiZone(latestMealPlan.profile.bmi).to}
                    />
                  ) : mealPlans === null ? (
                    <p className="my-8 text-sm text-slate-400">Loading…</p>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-center">
                      <p className="text-sm text-slate-500">No meal plan yet</p>
                      <a href="/dashboard/student/meal-plan" className="mt-2 text-sm font-semibold text-maroon-600 hover:text-maroon-800">
                        Generate one →
                      </a>
                    </div>
                  )}
                </GlassCard>

                <GlassCard ref={progressCardRefs[3]} className="flex flex-col items-center justify-center p-5 text-center">
                  {latestReading ? (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {READING_ICON}
                        </svg>
                      </div>
                      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{latestReading.level}</p>
                      <p className="text-sm font-medium text-slate-600">
                        Reading level · {readingAttempts?.length} passage{readingAttempts?.length === 1 ? '' : 's'}
                      </p>
                    </>
                  ) : readingAttempts === null ? (
                    <p className="my-8 text-sm text-slate-400">Loading…</p>
                  ) : (
                    <div className="py-4">
                      <p className="text-sm text-slate-500">No reading practice yet</p>
                      <a href="/dashboard/student/reading" className="mt-2 text-sm font-semibold text-maroon-600 hover:text-maroon-800">
                        Start reading →
                      </a>
                    </div>
                  )}
                </GlassCard>
              </div>
            </section>

            {/* ---- Recent Activity (scroll-tint: indigo/purple) ---- */}
            <section data-dashboard-tint data-tint-color={TINT_ACTIVITY}>
              <div ref={activityRef} className="opacity-0">
                <GlassCard hover={false} className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Recent activity</h3>
                    {attempts && attempts.length > 0 && (
                      <a href="/dashboard/student/history" className="text-sm font-medium text-maroon-600 transition-colors hover:text-maroon-800">
                        View quiz history
                      </a>
                    )}
                  </div>
                  {!dataLoaded ? (
                    <p className="mt-4 text-sm text-slate-400">Loading…</p>
                  ) : timeline.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No activity yet — take a quiz or generate a meal plan to get started.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-slate-900/10">
                      {timeline.map((entry) => (
                        <li key={entry.id} className="flex items-center gap-3 py-3 text-sm">
                          <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${TIMELINE_DOT[entry.type]}`} />
                          <span className="flex-1 text-slate-700">{entry.label}</span>
                          <span className="text-slate-500">{entry.detail}</span>
                          <span className="shrink-0 text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </GlassCard>
              </div>
            </section>

            {/* ---- Recommended for You (scroll-tint: teal/emerald) ---- */}
            <section data-dashboard-tint data-tint-color={TINT_RECOMMENDED}>
              <div ref={recommendedRef} className="opacity-0">
                <h2 className="text-lg font-semibold text-slate-900">Recommended for you</h2>
                {!dataLoaded ? (
                  <p className="mt-4 text-sm text-slate-400">Loading…</p>
                ) : (
                  <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {recommendations.map((rec) => (
                      <NavCard
                        key={rec.key}
                        href={rec.href}
                        title={rec.title}
                        description={rec.description}
                        icon={rec.icon}
                        accent={rec.accent}
                        glow={rec.glow}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ---- Achievements (scroll-tint: reverts to the base blue/purple mesh) ---- */}
            <section data-dashboard-tint>
              <h2 className="text-lg font-semibold text-slate-900">Achievements</h2>
              <div ref={achievementsGridRef} className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {(dataLoaded ? achievements : buildAchievements([], [], [])).map((a, i) => (
                  <GlassCard
                    key={a.key}
                    ref={achievementRefs[i]}
                    hover={false}
                    className={`flex flex-col items-center p-5 text-center transition-opacity duration-300 ${
                      a.unlocked ? '' : 'opacity-50 grayscale'
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner ${
                        a.unlocked ? 'bg-gradient-to-br from-gold-400 to-gold-600' : 'bg-slate-300'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {a.icon}
                      </svg>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-slate-900">{a.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{a.description}</p>
                    {a.unlocked && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Unlocked
                      </span>
                    )}
                  </GlassCard>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
