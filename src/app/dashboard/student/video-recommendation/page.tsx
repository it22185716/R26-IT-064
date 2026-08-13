'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import StudentShell from '../../../../components/dashboard/StudentShell';
import VideoCard from '../../../../components/dashboard/VideoCard';
import { fetchAssignedVideos } from '../../../../lib/assignedVideos';
import { AssignedVideo, QuizAttempt } from '../../../../lib/types';

type CommonVideo = { title: string; url: string; duration: string; difficulty: string };
type RecommendApiItem = { title: string; url: string; video_duration: string; difficulty: string };

const badgeStyle: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700',
  Intermediate: 'bg-amber-50 text-amber-700',
  Advanced: 'bg-rose-50 text-rose-700',
};

// quizAttempts.weakestCategory comes from the question bank's subCategory
// values; the video catalog's weak_area column uses different wording for
// exactly one of the 8 categories. Every other label matches byte-for-byte,
// so only the mismatch needs an entry here — everything else passes through.
const WEAK_AREA_LABEL_MAP: Record<string, string> = {
  'Fraction to Decimal': 'Fractions to Decimals',
};

export default function VideoRecommendationPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [assigned, setAssigned] = useState<AssignedVideo[] | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [recommended, setRecommended] = useState<CommonVideo[] | null>(null);

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
    fetchAssignedVideos(user.uid)
      .then(setAssigned)
      .catch(() => setAssigned([]));
  }, [user]);

  // Same query + client-side sort pattern as src/app/dashboard/student/page.tsx
  // uses for "Last submitted" — reused as-is rather than reinvented here.
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'quizAttempts'), where('studentId', '==', user.uid));
    getDocs(q)
      .then((snap) => {
        const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizAttempt));
        results.sort((a, b) => b.completedAt - a.completedAt);
        setAttempts(results);
      })
      .catch(() => setAttempts([]));
  }, [user]);

  const weakestCategory = attempts?.[0]?.weakestCategory;

  useEffect(() => {
    // Wait for the attempts query to resolve before deciding there's nothing
    // to fetch — attempts === null mid-load must not be read as "no quiz yet".
    if (attempts === null) return;

    if (!weakestCategory) {
      setRecommended([]);
      return;
    }

    let cancelled = false;
    setRecommended(null);
    const mappedArea = WEAK_AREA_LABEL_MAP[weakestCategory] ?? weakestCategory;

    fetch('/api/video-recommendation/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weak_area: mappedArea }),
    })
      .then((res) => res.json())
      .then((json: { success: boolean; recommendations?: RecommendApiItem[] }) => {
        if (cancelled) return;
        setRecommended(
          json.success && json.recommendations?.length
            ? json.recommendations.map((r) => ({ title: r.title, url: r.url, duration: r.video_duration, difficulty: r.difficulty }))
            : [],
        );
      })
      .catch(() => {
        // Flask service down, network error, or an unmapped weak_area the
        // model doesn't recognize — same "fall through" behavior as
        // AssignVideosPanel.tsx's identical try/catch around this endpoint.
        if (!cancelled) setRecommended([]);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, weakestCategory]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const hasAssigned = (assigned?.length ?? 0) > 0;
  const hasRecommended = (recommended?.length ?? 0) > 0;
  const recommendationsLoading = assigned === null || recommended === null;

  const recommendationsSubtitle =
    hasAssigned && hasRecommended
      ? `Handpicked by your teacher, plus more based on your last quiz — you're weakest in ${weakestCategory}.`
      : hasRecommended
        ? `Based on your last quiz — you're weakest in ${weakestCategory}.`
        : hasAssigned
          ? "Handpicked for you by your teacher."
          : "Take a quiz or check back once your teacher assigns something.";

  return (
    <StudentShell userName={profile?.name || user.email || ''} title="Video Library">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <p className="text-sm text-slate-500">Video Library</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Watch and learn</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Videos picked for you based on your quiz results and your teacher's suggestions.
        </p>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-slate-900">Your recommendations</h2>
          <p className="mt-1 text-sm text-slate-500">{recommendationsSubtitle}</p>

          <div className="mt-4">
            {recommendationsLoading ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="aspect-video bg-slate-100" />
                    <div className="space-y-2 p-4">
                      <div className="h-3.5 w-4/5 rounded bg-slate-100" />
                      <div className="h-3 w-2/5 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !hasAssigned && !hasRecommended ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">No personalized recommendations yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Take a quiz to get topic-matched videos, or check back once your teacher assigns something.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {hasAssigned && (
                  <div>
                    {hasRecommended && (
                      <h3 className="text-sm font-semibold text-slate-700">Picked by your teacher</h3>
                    )}
                    <div className={`grid gap-4 sm:grid-cols-3 ${hasRecommended ? 'mt-3' : ''}`}>
                      {assigned!.map((v) => (
                        <div key={v.id}>
                          <VideoCard title={v.title} url={v.url} badge="From your teacher" badgeStyle="bg-indigo-50 text-indigo-700" />
                          {v.note && (
                            <p className="mt-2 text-xs text-slate-500">
                              &ldquo;{v.note}&rdquo; — {v.assignedByName}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasRecommended && (
                  <div>
                    {hasAssigned && (
                      <h3 className="text-sm font-semibold text-slate-700">
                        Based on your last quiz — you&apos;re weakest in {weakestCategory}
                      </h3>
                    )}
                    <div className={`grid gap-4 sm:grid-cols-3 ${hasAssigned ? 'mt-3' : ''}`}>
                      {recommended!.map((v) => (
                        <VideoCard
                          key={v.url}
                          title={v.title}
                          url={v.url}
                          duration={v.duration}
                          badge={v.difficulty}
                          badgeStyle={badgeStyle[v.difficulty] || 'bg-slate-100 text-slate-600'}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </StudentShell>
  );
}
