"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import DashboardShell from '../../../../components/DashboardShell';
import GlassCard from '../../../../components/dashboard/GlassCard';
import RadialGauge from '../../../../components/dashboard/RadialGauge';
import { useCountUp } from '../../../../components/dashboard/useCountUp';
import { useStaggerReveal } from '../../../../components/dashboard/useStaggerReveal';
import { gsap } from '../../../../components/home/gsapClient';
import { fetchMealPlanHistory } from '../../../../lib/mealPlan';
import { MealOption, MealOptions, MealPlan, MealPlanProgress } from '../../../../lib/types';

const ALLERGY_OPTIONS = ['milk', 'egg', 'wheat', 'fish', 'shellfish', 'peanut', 'treenut'];
const DAY_MS = 24 * 60 * 60 * 1000;
const PLAN_LENGTH_DAYS = 14;

type MealTypeStyle = {
  key: keyof MealOptions;
  label: string;
  icon: React.ReactNode;
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  cardRing: string;
};

const MEAL_TYPE_META: MealTypeStyle[] = [
  {
    key: 'breakfast',
    label: 'Breakfast',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-6.364-.386 1.591-1.591M3 12h2.25m.386-6.364 1.591 1.591M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />,
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    cardBg: 'bg-amber-50/70',
    cardRing: 'ring-amber-200/70',
  },
  {
    key: 'lunch',
    label: 'Lunch',
    // Plate: outer rim + inner well.
    icon: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <circle cx="12" cy="12" r="3.5" />
      </>
    ),
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-600',
    cardBg: 'bg-orange-50/70',
    cardRing: 'ring-orange-200/70',
  },
  {
    key: 'dinner',
    label: 'Dinner',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-600',
    cardBg: 'bg-indigo-50/70',
    cardRing: 'ring-indigo-200/70',
  },
  {
    key: 'snack',
    label: 'Snack',
    // Apple: small stem/leaf + rounded body.
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5c-.3-1.4-1.6-2.4-3-2M12 7.5c.3-1.4 1.6-2.4 3-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25c-4 0-6.5 3-6.5 6.5C5.5 18.5 8 21.5 12 21.5s6.5-3 6.5-6.75c0-3.5-2.5-6.5-6.5-6.5z" />
      </>
    ),
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-600',
    cardBg: 'bg-rose-50/70',
    cardRing: 'ring-rose-200/70',
  },
];

const PROFILE_ICON = (
  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
);
const CLOCK_ICON = <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />;
const TREND_ICON = <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />;
const CALENDAR_ICON = <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />;
const PRINTER_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
  />
);
const DOWNLOAD_ICON = (
  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 12m0 0l4.5-4.5M12 12V3" />
);

type FormState = {
  age: string;
  height: string;
  weight: string;
  gender: string;
  allergies: string[];
};

const emptyForm: FormState = { age: '', height: '', weight: '', gender: 'Male', allergies: [] };

function formFromProfile(profile: MealPlan['profile']): FormState {
  return {
    age: String(profile.age),
    height: String(profile.height_cm),
    weight: String(profile.weight_kg),
    gender: profile.gender,
    allergies: profile.allergies,
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Plans created before weeklyCalendar/expiresAt existed have neither field —
// treat those as expired so they fall into the "refresh your plan" flow
// instead of rendering a NaN countdown or crashing on a missing calendar.
function daysLeft(plan: MealPlan): number {
  if (!plan.expiresAt) return -1;
  return Math.ceil((plan.expiresAt - Date.now()) / DAY_MS);
}

function heightLabel(cm: number): string {
  if (cm > 0) return 'Grew taller';
  if (cm < 0) return 'Height changed';
  return 'Height steady';
}

function weightLabel(kg: number): string {
  if (kg > 0) return 'Gained weight';
  if (kg < 0) return 'Weight changed';
  return 'Weight steady';
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function growthHeadline(progress: MealPlanProgress): string {
  const wins: string[] = [];
  if (progress.heightChangeCm > 0) wins.push(`grew ${progress.heightChangeCm}cm`);
  if (progress.weightChangeKg > 0) wins.push(`gained ${progress.weightChangeKg}kg`);
  if (wins.length === 0) {
    return "Your profile is up to date since your last plan — keep it up! 🌱";
  }
  return `You ${wins.join(' and ')} since your last plan — great progress! 🎉`;
}

function GrowthStat({ value, label }: { value: string; label: string }) {
  const ref = useCountUp(value);
  return (
    <div className="rounded-2xl bg-emerald-50/70 p-4 text-center ring-1 ring-inset ring-emerald-200/60">
      <p ref={ref} className="text-2xl font-bold tracking-tight text-emerald-800">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-emerald-700/80">{label}</p>
    </div>
  );
}

// Packaging-label style: each nutrient gets its own consistent hue everywhere
// it appears, independent of which meal type card it's shown in.
function MealOptionCard({ option, cardBg, cardRing }: { option: MealOption; cardBg: string; cardRing: string }) {
  return (
    <div
      className={`rounded-xl ${cardBg} p-4 ring-1 ring-inset ${cardRing} transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md`}
    >
      <p className="text-sm font-semibold text-slate-800">{option.name}</p>
      <p className="mt-1 text-xs text-slate-500">
        {option.calories_kcal} kcal · {option.cuisine}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">P {option.protein_g}g</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">C {option.carbs_g}g</span>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">F {option.fat_g}g</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Fiber {option.fiber_g}g</span>
      </div>
    </div>
  );
}

function ConfirmDialog({
  daysRemaining,
  onCancel,
  onConfirm,
}: {
  daysRemaining: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div aria-hidden onClick={onCancel} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
      <div className="motion-safe:animate-fade-in-up relative w-full max-w-sm rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-8.25 3.75h.008v.008h-.008v-.008z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900">Still have {daysRemaining} days left</h3>
        <p className="mt-1.5 text-sm text-slate-600">
          Your current 14-day plan is still active. Create a new one anyway? Your old plan will be replaced.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Keep current plan
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition-transform hover:-translate-y-0.5"
          >
            Create new plan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MealPlanPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);
  const statusCardRef = useRef<HTMLDivElement>(null);
  const growthCardRef = useRef<HTMLDivElement>(null);
  const calendarCardRef = useRef<HTMLDivElement>(null);
  const dayContentRef = useRef<HTMLDivElement>(null);
  // One entry per calendar day, filled via callback refs on the always-mounted
  // (but off-screen) print view — used by html2canvas to capture each day
  // for its own PDF page.
  const dayPrintRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Set right before a *fresh* generation's setCurrentPlan call, consumed by
  // the celebration effect below — distinguishes "just generated" from
  // "loaded an existing plan on mount", which should only stagger in quietly.
  const justGeneratedRef = useRef(false);

  useStaggerReveal(cardsGridRef, [profileCardRef, statusCardRef]);
  // Growth Progress + Calendar mount later (only once a plan exists), so this
  // needs to re-run whenever the active plan changes — covers both loading an
  // existing plan on page load and a freshly generated one.
  useStaggerReveal(resultsRef, [growthCardRef, calendarCardRef], { deps: [currentPlan?.id] });

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
    fetchMealPlanHistory(user.uid).then((plans) => {
      const latest = plans[0] ?? null;
      setCurrentPlan(latest);
      if (latest) {
        setForm(formFromProfile(latest.profile));
        setProfileExpanded(false);
      }
      setPlanLoading(false);
    });
  }, [user]);

  // Quick fade+slide whenever the selected day changes, replacing the old
  // instant swap. useLayoutEffect so it applies before paint — otherwise the
  // new day's content would flash at full opacity for a frame first.
  useLayoutEffect(() => {
    const el = dayContentRef.current;
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(el, { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.2, ease: 'power2.out' });
  }, [selectedDay]);

  // One-off celebratory pulse on Plan Status, but only right after the
  // student generates a fresh plan — not on an ordinary page load where an
  // existing plan is fetched (that gets the quiet stagger-reveal instead).
  useLayoutEffect(() => {
    if (!justGeneratedRef.current) return;
    justGeneratedRef.current = false;
    const el = statusCardRef.current;
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(el, { scale: 1 }, { scale: 1.04, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1 });
  }, [currentPlan?.id]);

  function toggleAllergy(allergy: string) {
    setForm((f) => ({
      ...f,
      allergies: f.allergies.includes(allergy) ? f.allergies.filter((a) => a !== allergy) : [...f.allergies, allergy],
    }));
  }

  async function doGenerate() {
    if (!user) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/meal-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          age: Number(form.age),
          height: Number(form.height),
          weight: Number(form.weight),
          gender: form.gender,
          allergies: form.allergies,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate meal plan.');
        return;
      }
      justGeneratedRef.current = true;
      setCurrentPlan(data as MealPlan);
      setSelectedDay(1);
      setProfileExpanded(false);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (currentPlan && daysLeft(currentPlan) > 0) {
      setShowConfirm(true);
      return;
    }
    doGenerate();
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    if (!currentPlan || dayPrintRefs.current.length === 0) return;
    setGeneratingPdf(true);
    try {
      // Dynamically imported so the (sizeable) libraries are only fetched
      // when the user actually asks for a PDF, not on every page load.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

      const studentName = profile?.name || user?.email || 'Student';
      const dateRange = `${formatDate(currentPlan.createdAt)} – ${formatDate(currentPlan.expiresAt)}`;
      const generatedOn = formatDate(Date.now());
      const totalDays = currentPlan.weeklyCalendar.length;

      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      for (let i = 0; i < totalDays; i++) {
        const dayEl = dayPrintRefs.current[i];
        if (!dayEl) continue;
        if (i > 0) pdf.addPage();

        let y = margin;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(15, 23, 42);
        pdf.text(studentName, margin, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(90, 90, 90);
        pdf.text(`14-Day Meal Plan · ${dateRange}`, margin, y);
        y += 8;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 8;

        // JPEG at 0.85 instead of PNG: this content is flat-shaded text/boxes,
        // not photos, so the compression is visually lossless in practice but
        // cuts a 14-page PDF from ~26MB down to a few MB.
        const canvas = await html2canvas(dayEl, { scale: 1.5, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.85);

        // Constrain to the remaining page space (below the header, above the
        // footer) so a day's content is never cut off mid-card.
        const availableHeight = pageHeight - y - margin - 8;
        let imgWidth = contentWidth;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;
        if (imgHeight > availableHeight) {
          imgHeight = availableHeight;
          imgWidth = imgHeight * (canvas.width / canvas.height);
        }
        const imgX = margin + (contentWidth - imgWidth) / 2;
        pdf.addImage(imgData, 'JPEG', imgX, y, imgWidth, imgHeight);

        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Generated by Hayagiri AI Learning Platform · ${generatedOn} · Page ${i + 1} of ${totalDays}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' },
        );
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      const safeName = studentName.trim().replace(/\s+/g, '-').toLowerCase() || 'student';
      pdf.save(`${safeName}-meal-plan-${fileDate}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-violet-100">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const remaining = currentPlan ? daysLeft(currentPlan) : 0;
  const isExpired = currentPlan ? remaining <= 0 : false;
  const hasCalendar = Boolean(currentPlan?.weeklyCalendar && currentPlan.weeklyCalendar.length > 0);
  const selectedDayPlan = currentPlan?.weeklyCalendar?.find((d) => d.day === selectedDay);
  // "Freshly generated" = within the first ~2 days of a 14-day plan — swaps
  // Plan Status from its everyday amber/orange countdown accent to a
  // one-time celebratory emerald/teal.
  const isFreshPlan = currentPlan ? !isExpired && remaining >= 12 : false;
  const statusIconGradient = isFreshPlan ? 'from-emerald-400 to-teal-600' : 'from-amber-400 to-orange-500';
  const statusLabelColor = isFreshPlan ? 'text-emerald-700' : 'text-amber-700';
  const statusWash = isFreshPlan ? 'from-emerald-100/60' : 'from-amber-100/60';

  return (
    <>
    <DashboardShell
      role="student"
      title="Meal Dashboard"
      subtitle="Your AI-personalized 14-day nutrition plan, built around you."
      userName={profile?.name || user.email || ''}
      backHref="/dashboard/student"
      backLabel="Back to Overview"
    >
      {showConfirm && currentPlan && (
        <ConfirmDialog
          daysRemaining={remaining}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false);
            doGenerate();
          }}
        />
      )}

      <div ref={cardsGridRef} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ---- Your Profile ---- */}
        <GlassCard ref={profileCardRef} className="p-6 opacity-0 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {PROFILE_ICON}
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Your Profile</p>
              <h3 className="text-lg font-bold text-slate-900">
                {profileExpanded ? (currentPlan ? 'Update your details' : 'Tell us about you') : 'Profile summary'}
              </h3>
            </div>
          </div>

          {!profileExpanded && currentPlan ? (
            <div className="mt-5">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-sky-50 px-3 py-1.5 font-medium text-sky-700">{currentPlan.profile.age} yrs</span>
                <span className="rounded-full bg-sky-50 px-3 py-1.5 font-medium text-sky-700">{currentPlan.profile.height_cm} cm</span>
                <span className="rounded-full bg-sky-50 px-3 py-1.5 font-medium text-sky-700">{currentPlan.profile.weight_kg} kg</span>
                <span className="rounded-full bg-sky-50 px-3 py-1.5 font-medium text-sky-700 capitalize">{currentPlan.profile.gender}</span>
                {currentPlan.profile.allergies.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-700">
                    Avoiding: {currentPlan.profile.allergies.join(', ')}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-500">Plan focus: {currentPlan.mealGoal}</p>
              <button
                type="button"
                onClick={() => setProfileExpanded(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Edit profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Age (years)</span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={19}
                    value={form.age}
                    onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Gender</span>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Height (cm)</span>
                  <input
                    type="number"
                    required
                    min={50}
                    max={220}
                    step="0.1"
                    value={form.height}
                    onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Weight (kg)</span>
                  <input
                    type="number"
                    required
                    min={5}
                    max={200}
                    step="0.1"
                    value={form.weight}
                    onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </label>
              </div>

              <div className="mt-4">
                <span className="text-sm font-medium text-slate-700">Allergies</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ALLERGY_OPTIONS.map((allergy) => {
                    const active = form.allergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => toggleAllergy(allergy)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                          active ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {allergy}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? 'Generating…' : currentPlan ? 'Generate New Plan' : 'Generate Meal Plan'}
                </button>
                {currentPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(formFromProfile(currentPlan.profile));
                      setProfileExpanded(false);
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </GlassCard>

        {/* ---- Plan Status ---- */}
        <GlassCard ref={statusCardRef} className="relative flex flex-col overflow-hidden p-6 opacity-0">
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${statusWash} via-transparent to-transparent transition-colors duration-500`}
          />
          <div className="relative flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-inner transition-colors duration-500 ${statusIconGradient}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {CLOCK_ICON}
              </svg>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-500 ${statusLabelColor}`}>
                Plan Status
              </p>
              <h3 className="text-lg font-bold text-slate-900">14-Day Plan</h3>
            </div>
          </div>

          <div className="relative mt-5 flex flex-1 flex-col items-center justify-center">
            {planLoading ? (
              <p className="py-8 text-sm text-slate-400">Loading…</p>
            ) : !currentPlan ? (
              <p className="py-8 text-center text-sm text-slate-500">Generate your first plan to start the countdown.</p>
            ) : isExpired ? (
              <div className="text-center">
                <p className="text-3xl">🎉</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">Your plan has ended!</p>
                <p className="mt-1 text-sm text-slate-500">Update your profile for a fresh 14-day plan.</p>
                <button
                  type="button"
                  onClick={() => setProfileExpanded(true)}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow"
                >
                  Refresh my plan
                </button>
              </div>
            ) : (
              <>
                <RadialGauge
                  percent={(remaining / PLAN_LENGTH_DAYS) * 100}
                  centerLabel={`${remaining}d`}
                  label={remaining === 1 ? 'day left' : 'days left'}
                  colorFrom={remaining > 7 ? '#34D399' : remaining > 3 ? '#EACB53' : '#FB923C'}
                  colorTo={remaining > 7 ? '#059669' : remaining > 3 ? '#A9841C' : '#EA580C'}
                />
                <p className="mt-4 text-center text-xs text-slate-500">
                  {remaining > 7 ? 'Plenty of time left 👍' : remaining > 3 ? 'Getting close — nice work so far!' : 'Almost time to refresh!'}
                </p>
              </>
            )}
          </div>
        </GlassCard>
      </div>

      {currentPlan && (
        <div ref={resultsRef} className="mt-5 space-y-5">
          {/* ---- Growth Progress ---- */}
          {currentPlan.progressSinceLastPlan && (
            <GlassCard ref={growthCardRef} hover={false} className="overflow-hidden p-6 opacity-0">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/60 via-transparent to-transparent"
              />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {TREND_ICON}
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Growth Progress</p>
                    <h3 className="text-lg font-bold text-slate-900">{growthHeadline(currentPlan.progressSinceLastPlan)}</h3>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <GrowthStat
                    value={`${Math.abs(currentPlan.progressSinceLastPlan.heightChangeCm)}cm`}
                    label={heightLabel(currentPlan.progressSinceLastPlan.heightChangeCm)}
                  />
                  <GrowthStat
                    value={`${Math.abs(currentPlan.progressSinceLastPlan.weightChangeKg)}kg`}
                    label={weightLabel(currentPlan.progressSinceLastPlan.weightChangeKg)}
                  />
                  <GrowthStat
                    value={`${currentPlan.progressSinceLastPlan.daysSinceLastPlan}`}
                    label={currentPlan.progressSinceLastPlan.daysSinceLastPlan === 1 ? 'day since last plan' : 'days since last plan'}
                  />
                </div>
              </div>
            </GlassCard>
          )}

          {/* ---- 14-Day Meal Calendar ---- */}
          <GlassCard ref={calendarCardRef} hover={false} className="p-6 opacity-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {CALENDAR_ICON}
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">14-Day Meal Calendar</p>
                  <h3 className="text-lg font-bold text-slate-900">
                    {hasCalendar ? `Day ${selectedDay} of ${PLAN_LENGTH_DAYS}` : 'Not available for this plan'}
                  </h3>
                </div>
              </div>

              {hasCalendar && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {PRINTER_ICON}
                    </svg>
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={generatingPdf}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {DOWNLOAD_ICON}
                    </svg>
                    {generatingPdf ? 'Generating…' : 'Download PDF'}
                  </button>
                </div>
              )}
            </div>

            {!hasCalendar ? (
              <p className="mt-5 text-sm text-slate-500">
                This plan was created before the 14-day calendar existed — generate a new plan to get one.
              </p>
            ) : (
              <>
                <div className="mt-5 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2">
                  {currentPlan.weeklyCalendar.map((d) => {
                    const active = d.day === selectedDay;
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => setSelectedDay(d.day)}
                        className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                          active
                            ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)] scale-105'
                            : 'bg-indigo-50/70 text-indigo-600 ring-1 ring-inset ring-indigo-200/60 hover:bg-indigo-100/80'
                        }`}
                      >
                        Day {d.day}
                      </button>
                    );
                  })}
                </div>

                {selectedDayPlan && (
                  <div ref={dayContentRef} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {MEAL_TYPE_META.map(({ key, label, icon, badgeBg, badgeText, cardBg, cardRing }) => (
                      <div key={key}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${badgeBg} ${badgeText}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              {icon}
                            </svg>
                          </span>
                          <span className="text-sm font-semibold text-slate-700">{label}</span>
                        </div>
                        <MealOptionCard option={selectedDayPlan[key]} cardBg={cardBg} cardRing={cardRing} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </GlassCard>
        </div>
      )}
    </DashboardShell>

    {/* Always mounted (off-screen, not display:none) so html2canvas can
        rasterize it on demand and the @media print rules can reveal it in
        place of the rest of the dashboard chrome. Renders every day, not
        just the one selected on screen. */}
    {currentPlan && hasCalendar && (
      <div className="meal-plan-print-view" aria-hidden="true">
        <div className="print-header">
          <h1>{profile?.name || user.email || 'Student'}</h1>
          <p>
            14-Day Meal Plan · {formatDate(currentPlan.createdAt)} – {formatDate(currentPlan.expiresAt)}
          </p>
          <p>
            Age {currentPlan.profile.age} · Focus: {currentPlan.mealGoal}
          </p>
        </div>

        {currentPlan.weeklyCalendar.map((d, i) => (
          <div
            key={d.day}
            ref={(el) => {
              dayPrintRefs.current[i] = el;
            }}
            className="print-day"
          >
            <h2 className="print-day-title">Day {d.day}</h2>
            <div className="print-meal-grid">
              {MEAL_TYPE_META.map(({ key, label }) => (
                <div key={key} className="print-meal">
                  <p className="print-meal-label">{label}</p>
                  <p className="print-meal-name">{d[key].name}</p>
                  <p className="print-meal-nutrition">
                    {d[key].calories_kcal} kcal · P {d[key].protein_g}g · C {d[key].carbs_g}g · F {d[key].fat_g}g · Fiber{' '}
                    {d[key].fiber_g}g
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="print-footer">Generated by Hayagiri AI Learning Platform · {formatDate(Date.now())}</p>
      </div>
    )}
    </>
  );
}
