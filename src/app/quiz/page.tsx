"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/useAuthUser';

type Question = {
  id: string;
  question: string;
  options: { label: string; text: string }[];
};

type Stage = 'intro' | 'loading' | 'active' | 'submitting';

export default function QuizPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [stage, setStage] = useState<Stage>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [loading, user, router]);

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

  if (stage === 'intro' || stage === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold">Math Weak-Area Diagnostic</h1>
          <p className="mt-3 text-slate-600">
            40 questions across Arithmetic and Fractions. You&apos;ll have <strong>1 hour</strong> to
            complete the quiz once you start — the timer keeps running even if you close this tab.
          </p>
          <ul className="mt-6 text-left text-sm text-slate-600 space-y-2">
            <li>• Each question has 5 answer choices.</li>
            <li>• The quiz auto-submits when time runs out.</li>
            <li>• You can review and change answers before submitting.</li>
          </ul>
          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
          <button
            onClick={startQuiz}
            disabled={stage === 'loading'}
            className="mt-8 w-full inline-flex items-center justify-center px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow hover:bg-sky-700 transition-colors disabled:opacity-60"
          >
            {stage === 'loading' ? 'Preparing your quiz…' : 'Start Quiz'}
          </button>
          <a href="/dashboard" className="mt-4 block text-sm text-slate-500 hover:text-slate-700">
            Back to dashboard
          </a>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const q = questions[current];
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const timeLow = remainingMs < 5 * 60 * 1000;

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Question {current + 1} of {questions.length} · {answeredCount} answered
          </p>
          <div className="flex items-center gap-4">
            <span
              className={`font-mono text-lg font-semibold tabular-nums px-3 py-1 rounded-lg ${
                timeLow ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={stage === 'submitting'}
              className="px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-60"
            >
              {stage === 'submitting' ? 'Submitting…' : 'Submit Quiz'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-[1fr_220px]">
        <div className="rounded-xl bg-white border border-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{q.question}</h2>
          <div className="mt-5 space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.label }))}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  answers[q.id] === opt.label
                    ? 'border-sky-600 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              disabled={current === questions.length - 1}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm h-fit">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Questions</p>
          <div className="grid grid-cols-6 lg:grid-cols-5 gap-2">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrent(i)}
                className={`h-8 w-8 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
                  i === current
                    ? 'bg-sky-600 text-white'
                    : answers[qq.id]
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-6">
          <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold">Submit the quiz now?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {questions.length - answeredCount} question{questions.length - answeredCount === 1 ? '' : 's'}{' '}
              unanswered. You won&apos;t be able to change your answers after submitting.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Keep working
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  submitQuiz();
                }}
                className="flex-1 px-4 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition-colors"
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
