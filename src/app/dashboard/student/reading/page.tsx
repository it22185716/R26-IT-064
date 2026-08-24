"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import DashboardShell from '../../../../components/DashboardShell';
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

const WAVEFORM_BAR_COUNT = 28;

type RecordingState = 'idle' | 'recording' | 'recorded' | 'submitting';

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
  const barsContainerRef = useRef<HTMLDivElement | null>(null);

  const [reduceMotion, setReduceMotion] = useState(false);
  const [displayedAccuracy, setDisplayedAccuracy] = useState(0);

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
    const step = Math.max(1, Math.floor(dataArray.length / WAVEFORM_BAR_COUNT));
    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const bars = barsContainerRef.current?.children;
      if (bars) {
        for (let i = 0; i < bars.length; i++) {
          const value = dataArray[i * step] ?? 0;
          const pct = Math.max(6, Math.round((value / 255) * 100));
          (bars[i] as HTMLElement).style.height = `${pct}%`;
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
        audioBlobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        stopWaveform();
        setRecordingState('recorded');
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState('recording');

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
    >
      {passageLoading && <p className="text-sm text-slate-400">Loading passage…</p>}

      {passageError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {passageError}. Make sure the reading assessment backend is running.
        </div>
      )}

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

          {recordingState === 'recording' && (
            <div className="relative mt-6">
              {reduceMotion ? (
                <p className="text-sm font-medium text-slate-500">Recording…</p>
              ) : (
                <div className="rounded-xl bg-slate-50 p-3">
                  <div ref={barsContainerRef} aria-hidden className="flex h-12 items-end justify-center gap-[3px]">
                    {Array.from({ length: WAVEFORM_BAR_COUNT }).map((_, i) => (
                      <span key={i} className="block w-1.5 rounded-full bg-gradient-to-t from-gold-500 to-amber-400" style={{ height: '4px' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative mt-6 flex flex-wrap items-center gap-3">
            {recordingState === 'idle' && (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-700 to-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:from-gold-800 hover:to-amber-800 hover:shadow-lg hover:shadow-gold-500/25 motion-reduce:transition-none"
              >
                Start Recording
              </button>
            )}

            {recordingState === 'recording' && (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-rose-500"
              >
                <span className="h-2 w-2 rounded-full bg-white" />
                Stop Recording
              </button>
            )}

            {recordingState === 'recorded' && (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-700 to-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:from-gold-800 hover:to-amber-800 hover:shadow-lg hover:shadow-gold-500/25 motion-reduce:transition-none"
                >
                  Submit Reading
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Record Again
                </button>
              </>
            )}

            {recordingState === 'submitting' && (
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-700 to-amber-700 px-5 py-2.5 text-sm font-semibold text-white opacity-60 shadow-md shadow-gold-500/20"
              >
                Assessing…
              </button>
            )}
          </div>

          {recordError && <p className="relative mt-3 text-sm text-rose-600">{recordError}</p>}
        </div>
      )}

      {result && (
        <div className="animate-fade-in-up rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-bold tabular-nums text-slate-900">{displayedAccuracy}% accuracy</h3>
            <span
              className={`inline-flex items-center rounded-full px-5 py-2 text-base font-bold animate-pulse-glow ${levelBadgeStyle[result.level]}`}
              style={{ '--pulse-glow-rgb': LEVEL_GLOW_RGB[result.level] } as React.CSSProperties}
            >
              {result.level}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{result.message}</p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 shadow-md shadow-slate-200/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Wrong words</p>
              {result.wrongWords.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">None</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {result.wrongWords.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 shadow-md shadow-slate-200/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Missing words</p>
              {result.missingWords.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">None</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {result.missingWords.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 shadow-md shadow-slate-200/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Extra words</p>
              {result.extraWords.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">None</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {result.extraWords.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">
              Next passage difficulty: <span className="font-semibold text-slate-900">{result.nextDifficulty}</span>
            </span>
            <button
              type="button"
              onClick={handleNextPassage}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-700 to-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:from-gold-800 hover:to-amber-800 hover:shadow-lg hover:shadow-gold-500/25 motion-reduce:transition-none"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
