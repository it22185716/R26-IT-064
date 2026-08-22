"use client";

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthUser } from '../../../hooks/useAuthUser';
import { fetchReadingHistory } from '../../../lib/reading';
import { fetchMealPlanHistory } from '../../../lib/mealPlan';
import { useParallax } from '../../../components/home/useParallax';
import { ScrollTrigger } from '../../../components/home/gsapClient';
import { useStaggerReveal } from '../../../components/dashboard/useStaggerReveal';
import StudentShell from '../../../components/dashboard/StudentShell';
import GlassCard from '../../../components/dashboard/GlassCard';
import NavCard from '../../../components/dashboard/NavCard';
import StatCard from '../../../components/StatCard';
import RadialGauge from '../../../components/dashboard/RadialGauge';
import RecommendedVideos from '../../../components/dashboard/RecommendedVideos';
import { QuizAttempt, MealPlan, ReadingAttempt } from '../../../lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;

const NAV_CARDS = [
  {
    href: '/quiz',
    title: 'Take Quiz',
    description: 'Start a new diagnostic and get instant, adaptive feedback on where you stand.',
    primary: true,
    accent: 'indigo' as const,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  {
    href: '/dashboard/student/meal-plan',
    title: 'Meal Plan',
    description: 'Get a personalized nutrition plan built around your profile.',
    accent: 'emerald' as const,
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
    accent: 'amber' as const,
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
    accent: 'violet' as const,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    ),
  },
];

const RECOMMENDATION_ACCENT: Record<string, 'indigo' | 'emerald' | 'amber' | 'violet'> = {
  '/quiz': 'indigo',
  '/dashboard/student/meal-plan': 'emerald',
  '/dashboard/student/reading': 'amber',
  '/dashboard/student': 'violet',
};

const TIMELINE_ICON_STYLE: Record<TimelineEntry['type'], string> = {
  quiz: 'bg-indigo-50 text-indigo-600',
  meal: 'bg-emerald-50 text-emerald-600',
  reading: 'bg-amber-50 text-amber-600',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

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

// "Your progress" tiles are tinted to match their Quick actions counterpart
// (Meal Plan = emerald, Reading Practice = amber) rather than the BMI zone or
// reading level — so the same feature carries the same color across both
// sections, regardless of the specific state. The RadialGauge's own ring
// still uses bmiZone()'s colorFrom/colorTo, so the health-status signal isn't
// lost, it just lives inside the gauge instead of tinting the whole card.
const MEAL_PROGRESS_CARD = 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white';
const MEAL_PROGRESS_TILE = 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30';
const READING_PROGRESS_CARD = 'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white';
const READING_PROGRESS_TILE = 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30';

const ACHIEVEMENT_THEME: Record<string, { card: string; tile: string; shadow: string; pill: string }> = {
  'first-quiz': {
    card: 'border-indigo-100 bg-gradient-to-br from-indigo-50 to-white',
    tile: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    shadow: 'shadow-indigo-500/30',
    pill: 'bg-indigo-50 text-indigo-700',
  },
  'consistent-learner': {
    card: 'border-violet-100 bg-gradient-to-br from-violet-50 to-white',
    tile: 'bg-gradient-to-br from-purple-500 to-violet-600',
    shadow: 'shadow-violet-500/30',
    pill: 'bg-violet-50 text-violet-700',
  },
  'meal-planner': {
    card: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-white',
    tile: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/30',
    pill: 'bg-emerald-50 text-emerald-700',
  },
  bookworm: {
    card: 'border-amber-100 bg-gradient-to-br from-amber-50 to-white',
    tile: 'bg-gradient-to-br from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/30',
    pill: 'bg-amber-50 text-amber-700',
  },
};

type TimelineEntry = {
  id: string;
  type: 'quiz' | 'meal' | 'reading';
  label: string;
  detail: string;
  date: number;
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

const TIMELINE_ICON: Record<TimelineEntry['type'], ReactNode> = {
  quiz: QUIZ_ICON,
  meal: MEAL_ICON,
  reading: READING_ICON,
};

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
      icon: QUIZ_ICON,
    });
  } else if (Date.now() - latestAttempt.completedAt > 7 * DAY_MS) {
    recs.push({
      key: 'quiz-weekly',
      title: 'Take your weekly quiz',
      description: "It's been a while since your last attempt — keep your progress fresh.",
      href: '/quiz',
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
      icon: MEAL_ICON,
    });
  } else if (Date.now() - latestMealPlan.createdAt > 30 * DAY_MS) {
    recs.push({
      key: 'meal-refresh',
      title: 'Update your meal plan',
      description: 'Your profile may have changed — refresh your recommendations.',
      href: '/dashboard/student/meal-plan',
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
      icon: READING_ICON,
    });
  } else if (latestReading.level === 'LOW') {
    recs.push({
      key: 'reading-practice',
      title: 'Practice reading again',
      description: "You're close to leveling up — one more passage could do it.",
      href: '/dashboard/student/reading',
      icon: READING_ICON,
    });
  }

  if (recs.length === 0) {
    recs.push({
      key: 'all-caught-up',
      title: "You're all caught up",
      description: 'Nice work — check back after your next quiz or meal plan update.',
      href: '/dashboard/student',
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

  const dataLoaded = attempts && mealPlans && readingAttempts;
  const recommendations = dataLoaded ? buildRecommendations(attempts, mealPlans, readingAttempts) : [];

  const mainRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const navGridRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const recommendedRef = useRef<HTMLDivElement>(null);

  const navCardRef0 = useRef<HTMLAnchorElement>(null);
  const navCardRef1 = useRef<HTMLAnchorElement>(null);
  const navCardRef2 = useRef<HTMLAnchorElement>(null);
  const navCardRef3 = useRef<HTMLAnchorElement>(null);
  const navCardRefs = [navCardRef0, navCardRef1, navCardRef2, navCardRef3];

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

  const recommendedGridRef = useRef<HTMLDivElement>(null);
  const recommendationRef0 = useRef<HTMLAnchorElement>(null);
  const recommendationRef1 = useRef<HTMLAnchorElement>(null);
  const recommendationRef2 = useRef<HTMLAnchorElement>(null);
  const recommendationRef3 = useRef<HTMLAnchorElement>(null);
  const recommendationRefs = [recommendationRef0, recommendationRef1, recommendationRef2, recommendationRef3];

  useParallax({ containerRef: mainRef, entranceRefs: [heroRef, activityRef, recommendedRef] });
  useStaggerReveal(navGridRef, navCardRefs);
  useStaggerReveal(progressGridRef, progressCardRefs, { start: 'top 80%' });
  useStaggerReveal(achievementsGridRef, achievementRefs, { start: 'top 80%' });
  useStaggerReveal(recommendedGridRef, recommendationRefs, { start: 'top 85%', deps: [recommendations.length] });

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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const latest = attempts?.[0];
  const latestMealPlan = mealPlans?.[0];
  const latestReading = readingAttempts?.[0];
  const timeline = buildTimeline(attempts, mealPlans, readingAttempts);
  const achievements = dataLoaded ? buildAchievements(attempts, mealPlans, readingAttempts) : [];

  // Corner badges for the Quick actions cards below the floating bar.
  const quickActionBadges: Record<string, string | undefined> = {
    '/quiz': attempts && attempts.length > 0 ? `${attempts.length} taken` : undefined,
    '/dashboard/student/meal-plan': latestMealPlan ? bmiZone(latestMealPlan.profile.bmi).label : mealPlans ? 'Not set up' : undefined,
    '/dashboard/student/reading': latestReading ? latestReading.level : readingAttempts ? 'Not started' : undefined,
  };

  return (
    <StudentShell userName={profile?.name || user.email || ''} title="Overview">
      <main ref={mainRef} className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div ref={heroRef} className="opacity-0">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-9 sm:px-10 sm:py-12">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-16 -left-10 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl animate-blob" />
              <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl animate-blob [animation-delay:3s]" />
              <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl animate-blob [animation-delay:5s]" />
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(255,255,255,0.06),transparent)]" />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gold-300">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                  {getGreeting()}
                </span>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-[2.75rem]">
                  {profile?.name || 'Student'}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                  Track your quizzes, get a personalized meal plan, sharpen your reading, and explore recommended
                  videos — all in one place.
                </p>
              </div>

              <div className="grid shrink-0 grid-cols-3 gap-3 sm:gap-4">
                <div className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 transition-colors duration-200 group-hover:bg-indigo-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {QUIZ_ICON}
                    </svg>
                  </div>
                  <p className="mt-3 text-2xl font-bold leading-none text-white">{attempts ? attempts.length : '—'}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                    {attempts && attempts.length === 1 ? 'Quiz taken' : 'Quizzes taken'}
                  </p>
                </div>

                <div className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 transition-colors duration-200 group-hover:bg-amber-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {READING_ICON}
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-bold leading-snug text-white sm:text-base">
                    {readingAttempts?.[0]?.level || 'No reading yet'}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-slate-400">Reading level</p>
                </div>

                <div className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 transition-colors duration-200 group-hover:bg-emerald-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {MEAL_ICON}
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-bold leading-snug text-white sm:text-base">
                    {mealPlans?.[0] ? bmiZone(mealPlans[0].profile.bmi).label : 'No meal plan yet'}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-slate-400">Nutrition</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
            <div ref={navGridRef} className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {NAV_CARDS.map((card, i) => (
                <NavCard
                  key={card.href}
                  ref={navCardRefs[i]}
                  href={card.href}
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                  primary={card.primary}
                  accent={card.accent}
                  badge={quickActionBadges[card.href]}
                />
              ))}
            </div>
          </div>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Your progress</h2>
            <div ref={progressGridRef} className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                ref={progressCardRefs[0]}
                label="Attempts taken"
                value={attempts ? String(attempts.length) : '—'}
                gradient="from-blue-500 to-indigo-600"
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />}
              />
              <StatCard
                ref={progressCardRefs[1]}
                label="Last submitted"
                value={latest ? new Date(latest.completedAt).toLocaleDateString() : '—'}
                gradient="from-indigo-500 to-blue-600"
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
              />

              <GlassCard ref={progressCardRefs[2]} className={`flex flex-col items-center p-5 ${MEAL_PROGRESS_CARD}`}>
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
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-inner ring-1 ring-inset ring-white/25 ${MEAL_PROGRESS_TILE}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {MEAL_ICON}
                      </svg>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">No meal plan yet</p>
                    <a href="/dashboard/student/meal-plan" className="mt-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                      Generate one →
                    </a>
                  </div>
                )}
              </GlassCard>

              <GlassCard
                ref={progressCardRefs[3]}
                className={`flex flex-col items-center justify-center p-5 text-center ${READING_PROGRESS_CARD}`}
              >
                {latestReading ? (
                  <>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-inner ring-1 ring-inset ring-white/25 ${READING_PROGRESS_TILE}`}>
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
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-inner ring-1 ring-inset ring-white/25 ${READING_PROGRESS_TILE}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {READING_ICON}
                      </svg>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">No reading practice yet</p>
                    <a href="/dashboard/student/reading" className="mt-1 text-sm font-semibold text-amber-600 hover:text-amber-700">
                      Start reading →
                    </a>
                  </div>
                )}
              </GlassCard>
            </div>
          </section>

          <section>
            <div ref={activityRef} className="opacity-0">
              <GlassCard hover={false} className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">Recent activity</h3>
                  {attempts && attempts.length > 0 && (
                    <a href="/quiz" className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700">
                      View quiz history
                    </a>
                  )}
                </div>
                {!dataLoaded ? (
                  <p className="mt-4 text-sm text-slate-400">Loading…</p>
                ) : timeline.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No activity yet — take a quiz or generate a meal plan to get started.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {timeline.map((entry) => (
                      <li key={entry.id} className="-mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3.5 text-sm transition-colors duration-150 hover:bg-slate-50">
                        <span
                          aria-hidden
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TIMELINE_ICON_STYLE[entry.type]}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {TIMELINE_ICON[entry.type]}
                          </svg>
                        </span>
                        <span className="flex-1 font-medium text-slate-700">{entry.label}</span>
                        <span className="hidden text-slate-500 sm:inline">{entry.detail}</span>
                        <span className="shrink-0 text-xs font-medium text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            </div>
          </section>

          <section>
            <div ref={recommendedRef} className="opacity-0">
              <h2 className="text-base font-semibold text-slate-900">Recommended for you</h2>
              {!dataLoaded ? (
                <p className="mt-4 text-sm text-slate-400">Loading…</p>
              ) : (
                <div ref={recommendedGridRef} className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {recommendations.map((rec, i) => (
                    <NavCard
                      key={rec.key}
                      ref={recommendationRefs[i]}
                      href={rec.href}
                      title={rec.title}
                      description={rec.description}
                      icon={rec.icon}
                      accent={RECOMMENDATION_ACCENT[rec.href] ?? 'indigo'}
                    />
                  ))}
                </div>
              )}

              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Videos for you</h3>
                  <a
                    href="/dashboard/student/video-recommendation"
                    className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                  >
                    See all
                  </a>
                </div>
                <div className="mt-3">
                  <RecommendedVideos studentId={user.uid} />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900">Achievements</h2>
            <div ref={achievementsGridRef} className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {(dataLoaded ? achievements : buildAchievements([], [], [])).map((a, i) => (
                <GlassCard
                  key={a.key}
                  ref={achievementRefs[i]}
                  hover={false}
                  className={`flex flex-col items-center p-5 text-center ${a.unlocked ? ACHIEVEMENT_THEME[a.key]?.card ?? '' : 'opacity-60'
                    }`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.unlocked
                        ? `text-white shadow-lg ${ACHIEVEMENT_THEME[a.key]?.tile ?? 'bg-gradient-to-br from-blue-500 to-indigo-600'} ${ACHIEVEMENT_THEME[a.key]?.shadow ?? ''}`
                        : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      {a.icon}
                    </svg>
                  </div>
                  <h3 className={`mt-3 text-sm font-semibold ${a.unlocked ? 'text-slate-900' : 'text-slate-400'}`}>
                    {a.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{a.description}</p>
                  <span
                    className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.unlocked ? ACHIEVEMENT_THEME[a.key]?.pill ?? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {a.unlocked ? '✓ Unlocked' : 'Locked'}
                  </span>
                </GlassCard>
              ))}
            </div>
          </section>
        </div>
      </main>
    </StudentShell>
  );
}
