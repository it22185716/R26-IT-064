'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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

// Some post-test question text follows a "Label: value, value, value" shape
// (e.g. "Which is SMALLEST: 1/7, 2/7, 4/7, 5/7, 6/7"). Splitting on the first
// colon and giving the value list its own, more prominent line keeps a
// comma-separated list from wrapping awkwardly mid-sentence on narrow
// screens. Plain-sentence questions (no colon) render unchanged.
function renderQuestionText(text: string) {
  const colonIndex = text.indexOf(':');
  if (colonIndex === -1) return text;

  const label = text.slice(0, colonIndex + 1);
  const values = text.slice(colonIndex + 1).trim();

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

      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/student/video-recommendation')}
            disabled={stage === 'submitting'}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Leave Quiz
          </button>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">Post-test</p>
              <h1 className="text-base font-bold text-slate-900 sm:text-lg">{topic}</h1>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 font-mono text-base font-semibold tabular-nums ring-1 ring-inset motion-reduce:animate-none sm:text-lg ${
                timeLow
                  ? 'animate-pulse-glow bg-rose-50 text-rose-600 ring-rose-200'
                  : 'bg-gold-50 text-gold-700 ring-gold-200'
              }`}
              style={{ '--pulse-glow-rgb': '244,63,94' } as React.CSSProperties}
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Question {current + 1} of {questions.length} · {answeredCount} answered
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-amber-600 transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      <div className="relative max-w-2xl mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400" />

          <h2 className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
            {renderQuestionText(q.question)}
          </h2>

          <div role="radiogroup" aria-label={`Question ${current + 1} answer choices`} className="mt-6 space-y-3">
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
                  className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected
                      ? 'border-gold-400 bg-gold-50 text-gold-800 ring-1 ring-inset ring-gold-200'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                      selected ? 'border-gold-500 bg-gold-500' : 'border-slate-300 bg-white group-hover:border-slate-400'
                    }`}
                  >
                    {selected && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className={`inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${
                current === 0 ? 'invisible' : ''
              }`}
            >
              Previous
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                disabled={!currentAnswered || stage === 'submitting'}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none motion-reduce:transition-none"
              >
                {stage === 'submitting' ? 'Submitting…' : 'Submit Test'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                disabled={!currentAnswered}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none motion-reduce:transition-none"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/30 px-6">
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
