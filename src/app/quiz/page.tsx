"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthUser } from '@/hooks/useAuthUser';
import { QuizAttempt } from '@/lib/types';
import StudentShell from '@/components/dashboard/StudentShell';

type Question = {
  id: string;
  question: string;
  options: { label: string; text: string }[];
};

type Stage = 'intro' | 'loading' | 'active' | 'submitting';

// Icon paths reused verbatim from elsewhere in this app (meal-plan / post-test
// pages) so every glyph is a known-good heroicons outline path.
const PENCIL_ICON = (
  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
);
const CLOCK_ICON = <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />;
const LIST_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.007H3.75V6.75Zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0ZM4.125 12a.375.375 0 11-.75 0 .375.375 0 01.75 0Zm0 5.25a.375.375 0 11-.75 0 .375.375 0 01.75 0Z"
  />
);
const CHECK_ICON = <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />;
const CHECK_CIRCLE_ICON = (
  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
);
const INFO_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
  />
);

// Same low-opacity blurred-blob ambience used on the post-test / video-recommendation
// pages, dialed back further still — this page is compact and the blobs should
// never compete with the two cards for attention.
function AmbientBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-gold-200/15 blur-3xl animate-blob motion-reduce:animate-none" />
      <div className="absolute bottom-0 right-1/5 h-64 w-64 rounded-full bg-indigo-200/15 blur-3xl animate-blob [animation-delay:3s] motion-reduce:animate-none" />
    </div>
  );
}

// Logo mark used at the top of the app's own header (DashboardHeader /
// StudentShell / TeacherShell / AdminShell) — reused verbatim here so the
// quiz screen is visually anchored to the same app chrome, just without the
// full nav shell (this is a focused, distraction-free test-taking screen).
function BrandMark() {
  return (
    <a
      href="/dashboard/student"
      className="group flex min-w-0 items-center gap-2 justify-self-start"
    >
      <Image
        src="/logo.png"
        alt="Hayagiri International Buddhist College crest"
        width={44}
        height={44}
        priority
        className="h-9 w-9 shrink-0 rounded-full border border-gold-500/30 shadow-sm transition-transform duration-200 ease-out group-hover:scale-105 sm:h-11 sm:w-11"
      />
      <span className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="flex items-center gap-1.5 truncate text-sm font-semibold tracking-tight text-slate-900">
          Hayagiri
          <span aria-hidden className="h-1 w-1 rounded-full bg-gold-500" />
        </span>
        <span className="truncate text-xs text-slate-500">AI Learning Platform</span>
      </span>
    </a>
  );
}

export default function QuizPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [stage, setStage] = useState<Stage>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'quizAttempts'), where('studentId', '==', user.uid));
    getDocs(q).then((snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt));
      results.sort((a, b) => b.completedAt - a.completedAt);
      setAttempts(results);
    });
  }, [user]);

  async function startQuiz() {
    if (!user) return;
    setStage('loading');
    setError(null);
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      if (!res.ok) throw new Error('Could not start the quiz. Please try again.');
      const data = await res.json();
      setQuestions(data.questions);
      setDeadline(data.deadline);
      setAnswers({});
      setCurrent(0);
      submittedRef.current = false;
      setStage('active');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStage('intro');
    }
  }

  const submitQuiz = useCallback(async () => {
    if (!user || submittedRef.current) return;
    submittedRef.current = true;
    setStage('submitting');
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, answers }),
      });
      if (!res.ok) throw new Error('Could not submit the quiz.');
      router.push('/dashboard/student');
    } catch (err) {
      setError('Could not submit the quiz. Please try again.');
      setStage('active');
      submittedRef.current = false;
    }
  }, [user, answers, router]);

  useEffect(() => {
    if (stage !== 'active' || !deadline) return;
    const tick = () => {
      const remaining = deadline - Date.now();
      setRemainingMs(Math.max(0, remaining));
      if (remaining <= 0) {
        submitQuiz();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [stage, deadline, submitQuiz]);

  const answeredCount = Object.keys(answers).length;

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  let content: React.ReactNode;
  let showShell = false;

  if (stage === 'intro' || stage === 'loading') {
    showShell = true;
    content = (
      <main className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-12">
        <AmbientBlobs />
        <div className="relative max-w-xl mx-auto">
          {/* ---- Diagnostic intro card ---- */}
          <div className="motion-safe:animate-fade-in-up relative w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-xl shadow-gold-500/10">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400" />

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-amber-600 text-white shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {PENCIL_ICON}
              </svg>
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">Math Weak-Area Diagnostic</h1>
            <p className="mt-3 text-slate-600">
              40 questions across Arithmetic and Fractions. You&apos;ll have <strong>1 hour</strong> to
              complete the quiz once you start — the timer keeps running even if you close this tab.
            </p>

            <ul className="mt-6 space-y-3 text-left text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {LIST_ICON}
                  </svg>
                </span>
                <span className="pt-0.5">Each question has 5 answer choices.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {CLOCK_ICON}
                  </svg>
                </span>
                <span className="pt-0.5">The quiz auto-submits when time runs out.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    {CHECK_ICON}
                  </svg>
                </span>
                <span className="pt-0.5">You can review and change answers before submitting.</span>
              </li>
            </ul>

            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

            <button
              onClick={startQuiz}
              disabled={stage === 'loading'}
              className="mt-8 w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none motion-reduce:transition-none"
            >
              {stage === 'loading' ? 'Preparing your quiz…' : 'Start Quiz'}
            </button>
            <a
              href="/dashboard/student"
              className="mt-5 block text-center text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </main>
    );
  } else if (questions.length === 0) {
    content = (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  } else {
    const q = questions[current];
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    const timeLow = remainingMs < 5 * 60 * 1000;
    const progressPct = ((current + 1) / questions.length) * 100;
    const isFirst = current === 0;
    const isLast = current === questions.length - 1;

    content = (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 pb-16">
      <AmbientBlobs />

      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
        <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4">
            <BrandMark />

            <div className="min-w-0 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">Math Weak-Area Diagnostic</p>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                Question <span className="font-semibold text-slate-900 tabular-nums">{String(current + 1).padStart(2, '0')}</span>{' '}
                of {questions.length}
                <span className="mx-1.5 text-slate-300">·</span>
                {answeredCount} answered
              </p>
            </div>

            <div className="flex items-center gap-2 justify-self-end sm:gap-3">
              <span
                className={`shrink-0 rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums ring-1 ring-inset motion-reduce:animate-none sm:text-lg ${
                  timeLow
                    ? 'animate-pulse-glow bg-rose-50 text-rose-600 ring-rose-200'
                    : 'bg-gold-50 text-gold-700 ring-gold-200'
                }`}
                style={{ '--pulse-glow-rgb': '244,63,94' } as React.CSSProperties}
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <button
                onClick={() => setShowSubmitConfirm(true)}
                disabled={stage === 'submitting'}
                className="hidden items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:inline-flex"
              >
                {stage === 'submitting' ? 'Submitting…' : 'Submit Quiz'}
              </button>
            </div>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-amber-600 transition-all duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <button
            onClick={() => setShowSubmitConfirm(true)}
            disabled={stage === 'submitting'}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none motion-reduce:transition-none sm:hidden"
          >
            {stage === 'submitting' ? 'Submitting…' : 'Submit Quiz'}
          </button>
        </div>
      </header>

      {error && (
        <div className="relative mx-auto mt-4 max-w-5xl px-4 sm:px-6">
          <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        </div>
      )}

      <div className="motion-safe:animate-fade-in-up relative mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[1fr_220px] lg:gap-8">
        <div className="rounded-2xl bg-gradient-to-br from-gold-300/60 via-amber-300/40 to-indigo-200/50 p-px shadow-xl shadow-gold-500/10">
          <div className="relative overflow-hidden rounded-[15px] bg-white/90 p-6 backdrop-blur-xl sm:p-8 md:p-10">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400" />

            <span className="inline-flex items-center rounded-full bg-gold-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-700 ring-1 ring-inset ring-gold-100">
              Math Diagnostic
            </span>

            <h2
              key={q.id}
              className="motion-safe:animate-fade-in-up mt-5 text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl md:text-2xl"
            >
              {q.question}
            </h2>

            <div
              key={`${q.id}-options`}
              role="radiogroup"
              aria-label={`Question ${current + 1} answer choices`}
              className="motion-safe:animate-fade-in-up mt-6 space-y-3 sm:mt-7"
            >
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.label }))}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-colors ${
                      selected
                        ? 'border-gold-400 bg-gold-50 text-gold-800 shadow-sm ring-1 ring-inset ring-gold-200'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold transition-colors duration-200 ${
                        selected
                          ? 'bg-gradient-to-br from-gold-500 to-amber-600 text-white shadow'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span>{opt.text}</span>
                    {selected && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="ml-auto h-5 w-5 flex-none text-gold-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        {CHECK_ICON}
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex justify-between gap-3">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={isFirst}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                disabled={isLast}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Questions</p>
            <span className="text-xs font-semibold text-gold-600 tabular-nums">
              {answeredCount}/{questions.length}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-8 gap-2 sm:grid-cols-10 lg:grid-cols-5">
            {questions.map((qq, i) => {
              const isCurrent = i === current;
              const isAnswered = !!answers[qq.id];
              return (
                <button
                  key={qq.id}
                  onClick={() => setCurrent(i)}
                  aria-current={isCurrent}
                  aria-label={`Go to question ${i + 1}${isAnswered ? ' (answered)' : ''}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-gradient-to-br from-gold-500 to-amber-600 text-white shadow'
                      : isAnswered
                      ? 'bg-gold-100 text-gold-700 hover:bg-gold-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-gradient-to-br from-gold-500 to-amber-600" />
              Current
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-gold-300" />
              Answered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-slate-300" />
              Unanswered
            </span>
          </div>
        </aside>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/30 px-6">
          <div className="motion-safe:animate-modal-pop relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400" />
            <h3 className="text-lg font-semibold text-slate-900">Submit the quiz now?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {questions.length - answeredCount} question{questions.length - answeredCount === 1 ? '' : 's'}{' '}
              unanswered. You won&apos;t be able to change your answers after submitting.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Keep working
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  submitQuiz();
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/25 motion-reduce:transition-none"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    );
  }

  return showShell ? (
    <StudentShell userName={profile?.name || user.email || ''} title="Take Quiz">
      {content}
    </StudentShell>
  ) : (
    content
  );
}
