"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import DashboardShell from '../../../../components/DashboardShell';
import { fetchPassage, submitReadingAttempt, ReadingAssessResult } from '../../../../lib/reading';
import { ReadingDifficulty, ReadingPassage } from '../../../../lib/types';

const DIFFICULTIES: ReadingDifficulty[] = ['Easy', 'Medium', 'Hard'];

const levelBadgeStyle: Record<string, string> = {
  HIGH: 'bg-emerald-50 text-emerald-700',
  MEDIUM: 'bg-amber-50 text-amber-700',
  LOW: 'bg-rose-50 text-rose-700',
};

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

  function selectDifficulty(next: ReadingDifficulty) {
    setDifficulty(next);
    loadPassage(next);
  }

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
        setRecordingState('recorded');
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState('recording');
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
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <span className="text-sm font-medium text-slate-700">Difficulty</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => selectDifficulty(d)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                difficulty === d
                  ? 'border-sky-600 bg-sky-50 text-sky-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {passageLoading && <p className="text-sm text-slate-400">Loading passage…</p>}

      {passageError && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {passageError}. Make sure the reading assessment backend is running.
        </div>
      )}

      {passage && !passageLoading && (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {passage.difficulty}
            </span>
          </div>
          <p className="text-lg leading-relaxed text-slate-800">{passage.text}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {recordingState === 'idle' && (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-sky-700"
              >
                Start Recording
              </button>
            )}

            {recordingState === 'recording' && (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-rose-700"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Stop Recording
              </button>
            )}

            {recordingState === 'recorded' && (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-sky-700"
                >
                  Submit Reading
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Record Again
                </button>
              </>
            )}

            {recordingState === 'submitting' && (
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white opacity-60 shadow"
              >
                Assessing…
              </button>
            )}
          </div>

          {recordError && <p className="mt-3 text-sm text-rose-600">{recordError}</p>}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">{result.accuracy}% accuracy</h3>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${levelBadgeStyle[result.level]}`}
            >
              {result.level}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{result.message}</p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
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
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
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
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-sky-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
