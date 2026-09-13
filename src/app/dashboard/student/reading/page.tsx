"use client";

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import DashboardShell from '../../../../components/DashboardShell';
import { useStaggerReveal } from '../../../../components/dashboard/useStaggerReveal';
import { fetchPassage, submitReadingAttempt, ReadingAssessResult } from '../../../../lib/reading';
import { ReadingDifficulty, ReadingPassage } from '../../../../lib/types';

const levelBadgeStyle: Record<string, string> = {
  HIGH: 'bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-500/20',
  MEDIUM: 'bg-amber-50 text-amber-700 shadow-md shadow-amber-500/20',
  LOW: 'bg-rose-50 text-rose-700 shadow-md shadow-rose-500/20',
};

// RGB triplets for the animate-pulse-glow keyframe's --pulse-glow-rgb var —
// recolored per reading level to match levelBadgeStyle's emerald/amber/rose.
const LEVEL_GLOW_RGB: Record<string, string> = {
  HIGH: '16,185,129',
  MEDIUM: '245,158,11',
  LOW: '244,63,94',
};

// Gold glow for the mic button's recording ring — same --pulse-glow-rgb
// technique as LEVEL_GLOW_RGB, tuned to the gold-500 brand accent.
const MIC_GLOW_RGB = '201,162,39';

const WAVEFORM_BAR_COUNT = 28;

type RecordingState = 'idle' | 'recording' | 'recorded' | 'submitting';

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path strokeLinecap="round" d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  );
}

type WordAccent = 'rose' | 'gold' | 'maroon';

// Full class strings (not built from template literals) so Tailwind's JIT
// content scan — a text search over this file, not an AST walk — actually
// sees each utility and generates it. Same pattern as levelBadgeStyle above.
const WORD_CARD_STYLES: Record<WordAccent, { header: string; iconBadge: string; countBadge: string; chip: string; emptyIcon: string }> = {
  rose: {
    header: 'border-rose-100 bg-rose-50',
    iconBadge: 'bg-rose-500 shadow-rose-500/30',
    countBadge: 'bg-rose-100 text-rose-700',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    emptyIcon: 'bg-rose-50 text-rose-300',
  },
  gold: {
    header: 'border-gold-100 bg-gold-50',
    iconBadge: 'bg-gold-600 shadow-gold-500/30',
    countBadge: 'bg-gold-100 text-gold-700',
    chip: 'bg-gold-50 text-gold-700 ring-gold-200',
    emptyIcon: 'bg-gold-50 text-gold-300',
  },
  maroon: {
    header: 'border-maroon-200 bg-maroon-100',
    iconBadge: 'bg-maroon-500 shadow-maroon-500/30',
    countBadge: 'bg-maroon-100 text-maroon-700',
    chip: 'bg-maroon-50 text-maroon-700 ring-maroon-200',
    emptyIcon: 'bg-maroon-50 text-maroon-300',
  },
};

const WordBreakdownCard = forwardRef<
  HTMLDivElement,
  {
    label: string;
    words: string[];
    accent: WordAccent;
    emptyMessage: string;
    footnote: string;
    icon: React.ReactNode;
  }
>(function WordBreakdownCard({ label, words, accent, emptyMessage, footnote, icon }, ref) {
  const styles = WORD_CARD_STYLES[accent];
  const isEmpty = words.length === 0;

  return (
    <div ref={ref} className={`overflow-hidden rounded-2xl border shadow-md shadow-slate-200/40 ${styles.header}`}>
      <div className="flex items-center justify-between gap-2 border-b border-black/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${styles.iconBadge}`}>
            {icon}
          </span>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</p>
        </div>
        <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${styles.countBadge}`}>
          {words.length}
        </span>
      </div>

      <div className="p-6">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${styles.emptyIcon}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <p className="text-sm font-semibold text-slate-700">None</p>
            <p className="text-xs text-slate-400">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {words.map((w, i) => (
                <span key={i} className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${styles.chip}`}>
                  {w}
                </span>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 8h.01M11 12h1v4h1" />
              </svg>
              {footnote}
            </p>
          </>
        )}
      </div>
    </div>
  );
});
WordBreakdownCard.displayName = 'WordBreakdownCard';

export default function ReadingPracticePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();

  const [difficulty, setDifficulty] = useState<ReadingDifficulty>('Easy');
  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [passageError, setPassageError] = useState('');
  const [passageLoading, setPassageLoading] = useState(false);

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordError, setRecordError] = useState('');
  const [result, setResult] = useState<ReadingAssessResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);

  // Waveform visualizer — entirely parallel to the MediaRecorder pipeline
  // above; never touches chunksRef/audioBlobRef.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  // Waveform is drawn as two mirrored halves flanking the mic button, each
  // its own DOM list; startWaveformLoop writes frequency bins into both.
  const leftBarsRef = useRef<HTMLDivElement | null>(null);
  const rightBarsRef = useRef<HTMLDivElement | null>(null);

  // True while stopRecording() was triggered by "Try Again" mid-recording —
  // tells recorder.onstop to discard the take and return to idle instead of
  // handing it off as a completed recording.
  const discardTakeRef = useRef(false);
  const timerIntervalRef = useRef<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [reduceMotion, setReduceMotion] = useState(false);
  const [displayedAccuracy, setDisplayedAccuracy] = useState(0);

  const resultCardsRowRef = useRef<HTMLDivElement>(null);
  const resultCardRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  useStaggerReveal(resultCardsRowRef, resultCardRefs, { deps: [result] });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Score reveal: count the accuracy % up from 0 over ~800ms whenever a new
  // result lands.
  useEffect(() => {
    if (!result) {
      setDisplayedAccuracy(0);
      return;
    }
    const target = result.accuracy;
    const duration = 800;
    const startTime = performance.now();
    let rafId: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      setDisplayedAccuracy(Math.round(target * progress));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [result]);

  // A student navigating away mid-recording must not leak the audio graph.
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (timerIntervalRef.current !== null) window.clearInterval(timerIntervalRef.current);
      try {
        audioCtxRef.current?.close();
      } catch {
        // already closed — nothing to do
      }
    };
  }, []);

  function startWaveformLoop() {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!analyser || !dataArray) return;
    const halfCount = WAVEFORM_BAR_COUNT / 2;
    const step = Math.max(1, Math.floor(dataArray.length / WAVEFORM_BAR_COUNT));
    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const leftBars = leftBarsRef.current?.children;
      const rightBars = rightBarsRef.current?.children;
      if (leftBars) {
        for (let i = 0; i < leftBars.length; i++) {
          const value = dataArray[i * step] ?? 0;
          const pct = Math.max(6, Math.round((value / 255) * 100));
          (leftBars[i] as HTMLElement).style.height = `${pct}%`;
        }
      }
      if (rightBars) {
        for (let i = 0; i < rightBars.length; i++) {
          const value = dataArray[(halfCount + i) * step] ?? 0;
          const pct = Math.max(6, Math.round((value / 255) * 100));
          (rightBars[i] as HTMLElement).style.height = `${pct}%`;
        }
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
  }

  function stopWaveform() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    try {
      audioCtxRef.current?.close();
    } catch {
      // already closed — nothing to do
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
  }

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

  async function loadPassage(nextDifficulty: ReadingDifficulty) {
    if (!user) return;
    setPassageError('');
    setPassageLoading(true);
    setResult(null);
    setRecordingState('idle');
    setRecordingSeconds(0);
    audioBlobRef.current = null;
    try {
      const p = await fetchPassage(nextDifficulty, user.uid);
      setPassage(p);
    } catch (err) {
      setPassage(null);
      setPassageError(err instanceof Error ? err.message : 'Failed to fetch a passage.');
    } finally {
      setPassageLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadPassage(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function startRecording() {
    setRecordError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        stopWaveform();
        if (timerIntervalRef.current !== null) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (discardTakeRef.current) {
          discardTakeRef.current = false;
          audioBlobRef.current = null;
          setRecordingSeconds(0);
          setRecordingState('idle');
          return;
        }
        audioBlobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordingState('recorded');
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState('recording');
      setRecordingSeconds(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);

      // Waveform visualizer — a parallel tap on the same stream, entirely
      // decorative. Never wired to chunksRef/audioBlobRef, so a failure here
      // must never surface as a recording error.
      if (!reduceMotion) {
        try {
          const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioContextCtor();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          audioCtxRef.current = audioCtx;
          analyserRef.current = analyser;
          dataArrayRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
          startWaveformLoop();
        } catch {
          // Visualizer is decorative only — recording still works without it.
        }
      }
    } catch {
      setRecordError('Microphone access is required to record your reading.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function restartRecording() {
    discardTakeRef.current = true;
    mediaRecorderRef.current?.stop();
  }

  async function handleSubmit() {
    if (!user || !passage || !audioBlobRef.current) return;
    setRecordingState('submitting');
    setRecordError('');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlobRef.current, 'recording.webm');
      formData.append('passageId', passage.passageId);
      formData.append('studentId', user.uid);
      formData.append('currentDifficulty', passage.difficulty);

      const res = await submitReadingAttempt(formData);
      setResult(res);
      setRecordingState('idle');
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : 'Failed to submit your reading.');
      setRecordingState('recorded');
    }
  }

  function handleNextPassage() {
    if (!result) return;
    setDifficulty(result.nextDifficulty);
    loadPassage(result.nextDifficulty);
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <DashboardShell
      role="student"
      title="Reading Practice"
      subtitle="Read the passage aloud and get instant feedback on your accuracy."
      userName={profile?.name || user.email || ''}
      backHref="/dashboard/student"
      backLabel="Back to Overview"
      action={
        <div className="hidden items-center gap-3 rounded-2xl bg-gradient-to-br from-gold-50 to-amber-50 px-4 py-2.5 ring-1 ring-inset ring-gold-100 sm:flex">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-600 to-amber-600 text-white shadow-sm shadow-gold-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
          <p className="text-sm font-semibold leading-tight text-gold-800">
            Better Reading,<br />Brighter Future
          </p>
        </div>
      }
    >
      {passageLoading && <p className="text-sm text-slate-400">Loading passage…</p>}

      {passageError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {passageError}. Make sure the reading assessment backend is running.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
      {passage && !passageLoading && (
        <div className="relative animate-fade-in-up overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8">
          {/* Thin gold rule along the top edge — the card's signature accent, no dark backdrop needed */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400" />
          {/* Soft gold accent shape tucked in the corner */}
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-100/70 blur-2xl" />

          <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center rounded-full bg-gold-50 px-3 py-1 text-xs font-semibold text-gold-700 ring-1 ring-inset ring-gold-200">
              {passage.difficulty}
            </span>

            {recordingState === 'recording' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold tracking-widest text-rose-600 ring-1 ring-inset ring-rose-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                REC
              </span>
            )}
          </div>

          {/* Teleprompter framing — a subtle gold-tinted panel behind the script, in place of a dark backdrop */}
          <div className="relative rounded-xl bg-gold-50/40 p-5 sm:p-6">
            <p className="text-xl leading-loose text-slate-800 sm:text-2xl sm:leading-loose">
              {passage.text}
            </p>
          </div>

          {/* Recording studio — one panel whose contents swap per recordingState,
              echoing a single cohesive control surface rather than a stack of
              conditionally-rendered rows. */}
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-gold-100/80 bg-gradient-to-br from-gold-50/60 via-white to-amber-50/30 p-5 sm:p-6">
            {recordingState === 'idle' && (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <button
                  type="button"
                  onClick={startRecording}
                  aria-label="Start recording"
                  className="group flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-700 to-amber-700 text-white shadow-md shadow-gold-500/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gold-500/25 motion-reduce:transition-none"
                >
                  <MicIcon className="h-6 w-6" />
                </button>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Tap to start recording</p>
                  <p className="text-xs text-slate-500">Read the passage above aloud, nice and clear.</p>
                </div>
              </div>
            )}

            {recordingState === 'recording' && (
              <div className="flex flex-col items-center gap-4">
                <div className="flex w-full items-center gap-3 sm:gap-5">
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-rose-500"
                  >
                    <span className="h-2 w-2 rounded-full bg-white" />
                    Stop Recording
                  </button>

                  <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-4">
                    {!reduceMotion && (
                      <div ref={leftBarsRef} aria-hidden className="flex h-10 flex-1 items-end justify-end gap-[3px] overflow-hidden">
                        {Array.from({ length: WAVEFORM_BAR_COUNT / 2 }).map((_, i) => (
                          <span key={i} className="block w-1.5 shrink-0 rounded-full bg-gradient-to-t from-gold-500 to-amber-400" style={{ height: '4px' }} />
                        ))}
                      </div>
                    )}

                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-700 to-amber-700 text-white shadow-md shadow-gold-500/30">
                      {!reduceMotion && (
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-full animate-pulse-glow motion-reduce:hidden"
                          style={{ '--pulse-glow-rgb': MIC_GLOW_RGB } as React.CSSProperties}
                        />
                      )}
                      <MicIcon className="relative h-5 w-5" />
                    </div>

                    {!reduceMotion && (
                      <div ref={rightBarsRef} aria-hidden className="flex h-10 flex-1 items-end justify-start gap-[3px] overflow-hidden">
                        {Array.from({ length: WAVEFORM_BAR_COUNT / 2 }).map((_, i) => (
                          <span key={i} className="block w-1.5 shrink-0 rounded-full bg-gradient-to-t from-gold-500 to-amber-400" style={{ height: '4px' }} />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={restartRecording}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Try Again
                  </button>
                </div>

                <p className="text-xs font-semibold tabular-nums tracking-widest text-gold-700">
                  {reduceMotion ? 'Recording…' : `Recording… ${formatDuration(recordingSeconds)}`}
                </p>
              </div>
            )}

            {recordingState === 'recorded' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Recording ready</p>
                  <p className="text-xs tabular-nums text-slate-500">Length: {formatDuration(recordingSeconds)}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-700 to-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:from-gold-800 hover:to-amber-800 hover:shadow-lg hover:shadow-gold-500/25 motion-reduce:transition-none"
                  >
                    Submit Reading
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Record Again
                  </button>
                </div>
              </div>
            )}

            {recordingState === 'submitting' && (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-700 to-amber-700 text-white shadow-md shadow-gold-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-800">Assessing your reading…</p>
              </div>
            )}
          </div>

          {recordError && <p className="relative mt-3 text-sm text-rose-600">{recordError}</p>}
        </div>
      )}

        </div>

        <aside className="lg:col-span-1">
          <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-white to-gold-50/60 p-6 shadow-lg shadow-slate-200/50 lg:sticky lg:top-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-600 to-amber-600 text-white shadow-md shadow-gold-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="12" cy="12" r="0.5" fill="currentColor" />
                </svg>
              </span>
              <h3 className="text-base font-bold text-slate-900">Tips for Better Reading</h3>
            </div>

            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="2" width="6" height="11" rx="3" />
                    <path strokeLinecap="round" d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Speak clearly</p>
                  <p className="text-xs text-slate-500">Use a natural and steady voice.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md shadow-indigo-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Keep a good pace</p>
                  <p className="text-xs text-slate-500">Not too fast, not too slow.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-md shadow-amber-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M8 15c1.2 1 2.6 1.5 4 1.5s2.8-.5 4-1.5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Watch your pronunciation</p>
                  <p className="text-xs text-slate-500">Try to pronounce each word correctly.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6-4.8-4.6 6.6-.9L12 2.5z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">You can do it!</p>
                  <p className="text-xs text-slate-500">Practice makes progress.</p>
                </div>
              </li>
            </ul>

            <div className="mt-5 rounded-xl bg-gradient-to-r from-gold-50 to-amber-50 p-4 text-center ring-1 ring-inset ring-gold-100">
              <p className="text-sm font-semibold text-gold-700">
                Every word you read<br />builds your confidence!
              </p>
            </div>
          </div>
        </aside>
      </div>

      {result && (
        <div className="animate-fade-in-up space-y-4">
          {/* Accuracy banner */}
          <div className="relative overflow-hidden rounded-2xl border border-gold-100/80 bg-gradient-to-br from-gold-50/70 via-white to-amber-50/40 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="relative flex flex-wrap items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-600 to-amber-600 text-white shadow-md shadow-gold-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 17V9m4 8V5m4 12v-6" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold tabular-nums text-slate-900">{displayedAccuracy}% accuracy</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold animate-pulse-glow ${levelBadgeStyle[result.level]}`}
                    style={{ '--pulse-glow-rgb': LEVEL_GLOW_RGB[result.level] } as React.CSSProperties}
                  >
                    {result.level}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{result.message}</p>
              </div>

              {/* Encouraging flourish — hidden on narrow screens to keep the banner from crowding */}
              <div aria-hidden className="hidden shrink-0 items-center gap-2 pl-2 sm:flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gold-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.5l1.4 4.6 4.6 1.4-4.6 1.4L12 14.5l-1.4-4.6L6 8.5l4.6-1.4L12 2.5z" />
                </svg>
                <p className="text-sm font-medium italic leading-snug text-gold-700">
                  It&apos;s okay to make mistakes —<br />that&apos;s how we learn!
                </p>
              </div>
            </div>
          </div>

          {/* Word breakdown */}
          <div ref={resultCardsRowRef} className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <WordBreakdownCard
              ref={resultCardRefs[0]}
              label="Wrong words"
              words={result.wrongWords}
              accent="rose"
              emptyMessage="No wrong words found!"
              footnote="These words didn't match what you read."
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            />
            <WordBreakdownCard
              ref={resultCardRefs[1]}
              label="Missing words"
              words={result.missingWords}
              accent="gold"
              emptyMessage="No missing words found!"
              footnote="These words were not pronounced clearly enough to detect."
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <WordBreakdownCard
              ref={resultCardRefs[2]}
              label="Extra words"
              words={result.extraWords}
              accent="maroon"
              emptyMessage="No extra words found!"
              footnote="These were said but aren't in the passage."
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6-4.8-4.6 6.6-.9L12 2.5z" />
                </svg>
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <span className="text-sm text-slate-600">
              Next passage difficulty: <span className="font-semibold text-slate-900">{result.nextDifficulty}</span>
            </span>
            <button
              type="button"
              onClick={handleNextPassage}
              className="ml-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-700 to-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:from-gold-800 hover:to-amber-800 hover:shadow-lg hover:shadow-gold-500/25 motion-reduce:transition-none"
            >
              Continue
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
