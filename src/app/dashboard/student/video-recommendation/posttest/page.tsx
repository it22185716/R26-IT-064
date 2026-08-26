'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthUser } from '../../../../../hooks/useAuthUser';

type Question = {
  id: string;
  question: string;
  difficulty: string;
  options: { label: string; text: string }[];
};

type PostTestResult = {
  preScore: number;
  postScore: number;
  improved: boolean;
  correctCount: number;
  totalQuestions: number;
};

type Stage = 'loading' | 'active' | 'submitting' | 'results';

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-slate-500">Loading…</p>
    </main>
  );
}

// Same low-opacity blurred-blob ambience used on the video-recommendation
// and reading pages, dialed back further (this is a focused test-taking
// screen — decoration must stay out of the way of readability/focus).
function AmbientBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-16 left-1/4 h-64 w-64 rounded-full bg-gold-200/20 blur-3xl animate-blob motion-reduce:animate-none" />
      <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl animate-blob [animation-delay:3s] motion-reduce:animate-none" />
    </div>
  );
}

const CHECK_ICON = <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />;

// Logo mark used at the top of the app's own header (DashboardHeader /
// StudentShell / TeacherShell / AdminShell) — reused verbatim from the quiz
// page (src/app/quiz/page.tsx) so this test-taking screen is visually
// anchored to the same app chrome and header treatment.
function BrandMark() {
  return (
    <a
      href="/dashboard/student/video-recommendation"
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

// Some post-test question text follows a "Label: value, value, value" shape
// (e.g. "Which is SMALLEST: 1/7, 2/7, 4/7, 5/7, 6/7") or a "Label 123 + 456?"
// shape with no colon (e.g. "What is the value of 961 + 181 + 498?"). Both
// get split into a label line and a more prominent values/expression line so
// the numeric part doesn't wrap awkwardly mid-sentence on narrow screens —
// split on the first colon when present, otherwise on the first digit.
// Plain-sentence questions (no colon, no digit) render unchanged.
function renderQuestionText(text: string) {
  const colonIndex = text.indexOf(':');
  const splitIndex = colonIndex !== -1 ? colonIndex + 1 : text.search(/\d/);
  if (splitIndex === -1) return text;

  const label = text.slice(0, splitIndex);
  const values = text.slice(splitIndex).trim();

  return (
    <>
      <span className="block">{label}</span>
      <span className="mt-2 block text-xl font-bold sm:text-2xl">{values}</span>
    </>
  );
}

export default function VideoPostTestPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <VideoPostTestPageInner />
    </Suspense>
  );
}

function VideoPostTestPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic');
  const { user, loading } = useAuthUser();

  const [stage, setStage] = useState<Stage>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [result, setResult] = useState<PostTestResult | null>(null);
  const submittedRef = useRef(false);
  const startedRef = useRef(false);

  // Presentational-only state added for this styling pass: reduced-motion
  // preference (gates the score count-up, mirroring the reading-practice
  // results reveal) and the animated post-score readout itself.
  const [reduceMotion, setReduceMotion] = useState(false);
  const [displayedPostScore, setDisplayedPostScore] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [loading, user, router]);

  useEffect(() => {
    if (!topic) router.replace('/dashboard/student/video-recommendation');
  }, [topic, router]);

  useEffect(() => {
    if (!user || !topic || startedRef.current) return;
    startedRef.current = true;
    fetch('/api/video-recommendation/posttest/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, topic }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not start the post-test. Please try again.');
        return res.json();
      })
      .then((data) => {
        setQuestions(data.questions || []);
        setDeadline(data.deadline);
        setAnswers({});
        setCurrent(0);
        submittedRef.current = false;
        setStage('active');
      })
      .catch(() => {
        setError('Could not start the post-test — please try again in a moment.');
      });
  }, [user, topic]);

  const submitPostTest = useCallback(async () => {
    if (!user || submittedRef.current) return;
    submittedRef.current = true;
    setStage('submitting');
    setError(null);
    try {
      const res = await fetch('/api/video-recommendation/posttest/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, answers }),
      });
      if (!res.ok) throw new Error('Could not submit the post-test.');
      const data = await res.json();
      setResult(data);
      setStage('results');
    } catch {
      setError('Could not submit the post-test. Please try again.');
      setStage('active');
      submittedRef.current = false;
    }
  }, [user, answers]);

  useEffect(() => {
    if (stage !== 'active' || !deadline) return;
    const tick = () => {
      const remaining = deadline - Date.now();
      setRemainingMs(Math.max(0, remaining));
      if (remaining <= 0) {
        submitPostTest();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [stage, deadline, submitPostTest]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Dramatic score reveal — same count-up-from-0-over-~800ms technique used
  // for the reading-practice accuracy score.
  useEffect(() => {
    if (!result) {
      setDisplayedPostScore(0);
      return;
    }
    if (reduceMotion) {
      setDisplayedPostScore(result.postScore);
      return;
    }
    const target = result.postScore;
    const duration = 800;
    const startTime = performance.now();
    let rafId: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      setDisplayedPostScore(Math.round(target * progress));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [result, reduceMotion]);

  if (loading || !user || !topic) {
    return <LoadingScreen />;
  }

  if (stage === 'loading') {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-50 flex items-center justify-center px-6">
        <AmbientBlobs />
        <div className="relative w-full max-w-sm">
          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-white p-6 text-center shadow-lg shadow-slate-200/50">
              <p className="text-sm text-rose-600">{error}</p>
              <a
                href="/dashboard/student/video-recommendation"
                className="mt-4 inline-block text-sm font-semibold text-gold-700 hover:text-gold-800"
              >
                Back to Video Library
              </a>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.8)_50%,transparent_60%)] animate-shimmer motion-reduce:hidden"
              />
              <div className="h-3 w-24 rounded-full bg-slate-100" />
              <div className="mt-5 h-5 w-5/6 rounded-full bg-slate-100" />
              <div className="mt-2.5 h-5 w-2/3 rounded-full bg-slate-100" />
              <div className="mt-6 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-11 w-full rounded-xl bg-slate-100" />
                ))}
              </div>
              <p className="relative mt-6 text-center text-sm text-slate-400">Preparing your post-test…</p>
              <button
                type="button"
                onClick={() => router.push('/dashboard/student/video-recommendation')}
                className="relative mt-2 block w-full text-center text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
              >
                Leave Quiz
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (stage === 'results' && result) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-50 flex items-center justify-center px-6 py-12">
        <AmbientBlobs />
        <div className="relative w-full max-w-md animate-fade-in-up">
          <div className="rounded-2xl bg-gradient-to-br from-gold-400 via-amber-300 to-violet-400 p-[2px] shadow-xl shadow-gold-500/10">
            <div className="rounded-[14px] bg-white p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">Post-test complete</p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">{topic}</h1>

              <div className="mt-6 flex items-end justify-center gap-5">
                <div>
                  <p className="text-xs font-medium text-slate-400">Before</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-slate-400">{result.preScore}%</p>
                </div>
                <span aria-hidden className="mb-2 text-2xl text-slate-300">
                  →
                </span>
                <div>
                  <p className={`text-xs font-semibold ${result.improved ? 'text-emerald-600' : 'text-amber-600'}`}>
                    After
                  </p>
                  <p
                    className={`mt-1 text-5xl font-extrabold tabular-nums ${
                      result.improved ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {displayedPostScore}%
                  </p>
                </div>
              </div>

              <span
                className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold animate-pulse-glow motion-reduce:animate-none ${
                  result.improved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
                style={{ '--pulse-glow-rgb': result.improved ? '16,185,129' : '245,158,11' } as React.CSSProperties}
              >
                {result.improved ? 'Improved!' : 'Keep practicing'}
              </span>

              <p className="mt-4 text-sm text-slate-500">
                {result.correctCount} / {result.totalQuestions} correct
              </p>

              {result.improved ? (
                <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  Great job — you improved from {result.preScore}% to {result.postScore}%!
                </p>
              ) : (
                <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                  You scored {result.postScore}% (was {result.preScore}% before) — try watching another recommended
                  video and test again.
                </p>
              )}

              <button
                onClick={() => router.push('/dashboard/student/video-recommendation')}
                className="mt-6 w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/25 motion-reduce:transition-none"
              >
                Back to Video Library
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return <LoadingScreen />;
  }

  const q = questions[current];
  const isLast = current === questions.length - 1;
  const currentAnswered = !!answers[q.id];
  const answeredCount = Object.keys(answers).length;
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const timeLow = remainingMs < 60 * 1000;
  const progressPct = ((current + 1) / questions.length) * 100;

  return (
    <main className="relative min-h-screen bg-slate-50 pb-16">
      <AmbientBlobs />

      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
        <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <button
            type="button"
            onClick={() => router.push('/dashboard/student/video-recommendation')}
            disabled={stage === 'submitting'}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Leave Quiz
          </button>

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4">
            <BrandMark />

            <div className="min-w-0 text-center">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-gold-600">{topic}</p>
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
                {stage === 'submitting' ? 'Submitting…' : 'Submit Test'}
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
            {stage === 'submitting' ? 'Submitting…' : 'Submit Test'}
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
              Post-Test
            </span>

            <h2
              key={q.id}
              className="motion-safe:animate-fade-in-up mt-5 text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl md:text-2xl"
            >
              {renderQuestionText(q.question)}
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
                    disabled={stage === 'submitting'}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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
                type="button"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              {isLast ? (
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={!currentAnswered || stage === 'submitting'}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {stage === 'submitting' ? 'Submitting…' : 'Submit Test'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                  disabled={!currentAnswered}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold-500/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  Next
                </button>
              )}
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
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-current={isCurrent}
                  aria-label={`Go to question ${i + 1}${isAnswered ? ' (answered)' : ''}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 ${
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
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400" />
            <h3 className="text-lg font-semibold text-slate-900">Submit the post-test now?</h3>
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
                  submitPostTest();
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
