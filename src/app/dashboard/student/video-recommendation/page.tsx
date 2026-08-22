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
import { toEmbedUrl, toThumbnailUrl } from '../../../../lib/youtube';

type CommonVideo = { title: string; url: string; duration: string; difficulty: string };
type RecommendApiItem = { title: string; url: string; video_duration: string; difficulty: string };

type PostTestQuestion = {
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

type PostTestStage = 'closed' | 'loading' | 'active' | 'submitting' | 'result';

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

// Same thumbnail/hover-overlay/duration-badge visual VideoCard.tsx uses,
// extracted so the main recommendation's click-to-play button and its
// no-embed-id <a> fallback can both reuse it without VideoCard itself
// changing behavior.
function MainThumbnailVisual({ thumb, duration }: { thumb: string | null; duration?: string }) {
  return (
    <>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="h-full w-full object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-colors duration-200 group-hover:bg-slate-900/20">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 opacity-0 shadow transition-opacity duration-200 group-hover:opacity-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
      {duration && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {duration}
        </span>
      )}
    </>
  );
}

export default function VideoRecommendationPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [assigned, setAssigned] = useState<AssignedVideo[] | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [recommended, setRecommended] = useState<CommonVideo[] | null>(null);

  const [postTestStage, setPostTestStage] = useState<PostTestStage>('closed');
  const [postTestQuestions, setPostTestQuestions] = useState<PostTestQuestion[]>([]);
  const [postTestAnswers, setPostTestAnswers] = useState<Record<string, string>>({});
  const [postTestResult, setPostTestResult] = useState<PostTestResult | null>(null);
  const [postTestError, setPostTestError] = useState<string | null>(null);

  const [mainVideoPlaying, setMainVideoPlaying] = useState(false);

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

  // A stale iframe must not linger once a new weak area / recommendation
  // set loads — reset back to the click-to-play thumbnail.
  useEffect(() => {
    setMainVideoPlaying(false);
  }, [recommended?.[0]?.url]);

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

  const mainRecommendation = recommended?.[0] ?? null;
  const alternativeRecommendations = recommended?.slice(1) ?? [];
  const mainEmbedUrl = mainRecommendation ? toEmbedUrl(mainRecommendation.url) : null;
  const mainThumb = mainRecommendation ? toThumbnailUrl(mainRecommendation.url) : null;

  async function startPostTest() {
    if (!user || !mainRecommendation || !weakestCategory) return;
    window.open(mainRecommendation.url, '_blank', 'noopener,noreferrer');
    setPostTestError(null);
    setPostTestStage('loading');
    try {
      const res = await fetch('/api/video-recommendation/posttest/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, topic: weakestCategory }),
      });
      if (!res.ok) throw new Error('Could not start the post-test. Please try again.');
      const data = await res.json();
      setPostTestQuestions(data.questions || []);
      setPostTestAnswers({});
      setPostTestStage('active');
    } catch {
      setPostTestError('Could not start the post-test — please try again in a moment.');
      setPostTestStage('closed');
    }
  }

  async function submitPostTest() {
    if (!user) return;
    setPostTestStage('submitting');
    setPostTestError(null);
    try {
      const res = await fetch('/api/video-recommendation/posttest/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, answers: postTestAnswers }),
      });
      if (!res.ok) throw new Error('Could not submit the post-test.');
      const data = await res.json();
      setPostTestResult(data);
      setPostTestStage('result');
    } catch {
      setPostTestError('Could not submit the post-test — please try again.');
      setPostTestStage('active');
    }
  }

  function resetPostTest() {
    setPostTestStage('closed');
    setPostTestQuestions([]);
    setPostTestAnswers({});
    setPostTestResult(null);
    setPostTestError(null);
  }

  const postTestAnsweredCount = Object.keys(postTestAnswers).length;
  const postTestAllAnswered = postTestQuestions.length > 0 && postTestAnsweredCount === postTestQuestions.length;

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

                {hasRecommended && mainRecommendation && (
                  <div>
                    {hasAssigned && (
                      <h3 className="text-sm font-semibold text-slate-700">
                        Based on your last quiz — you&apos;re weakest in {weakestCategory}
                      </h3>
                    )}
                    <div className={`grid gap-4 lg:grid-cols-3 ${hasAssigned ? 'mt-3' : ''}`}>
                      <div className="lg:col-span-2">
                        <p className="mb-2 inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                          Top pick
                        </p>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                          {mainVideoPlaying && mainEmbedUrl ? (
                            <div className="relative aspect-video overflow-hidden bg-slate-900">
                              <iframe
                                src={`${mainEmbedUrl}?autoplay=1`}
                                title={mainRecommendation.title}
                                className="absolute inset-0 h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                frameBorder={0}
                              />
                            </div>
                          ) : mainEmbedUrl ? (
                            <button
                              type="button"
                              onClick={() => setMainVideoPlaying(true)}
                              className="group block w-full text-left"
                            >
                              <div className="relative aspect-video overflow-hidden bg-slate-900">
                                <MainThumbnailVisual thumb={mainThumb} duration={mainRecommendation.duration} />
                              </div>
                            </button>
                          ) : (
                            <a
                              href={mainRecommendation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group block w-full"
                            >
                              <div className="relative aspect-video overflow-hidden bg-slate-900">
                                <MainThumbnailVisual thumb={mainThumb} duration={mainRecommendation.duration} />
                              </div>
                            </a>
                          )}
                          <div className="p-4">
                            {mainRecommendation.difficulty && (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  badgeStyle[mainRecommendation.difficulty] || 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {mainRecommendation.difficulty}
                              </span>
                            )}
                            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                              {mainRecommendation.title}
                            </p>
                          </div>
                        </div>

                        {weakestCategory && (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                            {postTestStage === 'closed' && (
                              <>
                                <button
                                  onClick={startPostTest}
                                  className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                                >
                                  I&apos;ve watched this — take the post-test
                                </button>
                                {postTestError && <p className="mt-2 text-sm text-rose-600">{postTestError}</p>}
                              </>
                            )}

                            {postTestStage === 'loading' && (
                              <p className="text-sm text-slate-500">Preparing your post-test…</p>
                            )}

                            {(postTestStage === 'active' || postTestStage === 'submitting') && (
                              <div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                  Post-test — {weakestCategory}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                  {postTestAnsweredCount} of {postTestQuestions.length} answered
                                </p>
                                <div className="mt-4 space-y-5">
                                  {postTestQuestions.map((q, i) => (
                                    <div key={q.id}>
                                      <p className="text-sm font-medium text-slate-800">
                                        {i + 1}. {q.question}
                                      </p>
                                      <div className="mt-2 space-y-2">
                                        {q.options.map((opt) => (
                                          <button
                                            key={opt.label}
                                            onClick={() =>
                                              setPostTestAnswers((prev) => ({ ...prev, [q.id]: opt.label }))
                                            }
                                            disabled={postTestStage === 'submitting'}
                                            className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                                              postTestAnswers[q.id] === opt.label
                                                ? 'border-sky-600 bg-sky-50 text-sky-700'
                                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                            }`}
                                          >
                                            {opt.text}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {postTestError && <p className="mt-4 text-sm text-rose-600">{postTestError}</p>}

                                <button
                                  onClick={submitPostTest}
                                  disabled={!postTestAllAnswered || postTestStage === 'submitting'}
                                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {postTestStage === 'submitting' ? 'Submitting…' : 'Submit post-test'}
                                </button>
                              </div>
                            )}

                            {postTestStage === 'result' && postTestResult && (
                              <div>
                                <h3 className="text-sm font-semibold text-slate-900">Your results</h3>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                                    <p className="text-xs text-slate-500">Before</p>
                                    <p className="mt-1 text-2xl font-semibold text-slate-700">
                                      {postTestResult.preScore}%
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-3 text-center">
                                    <p className="text-xs text-slate-500">Post-test</p>
                                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                                      {postTestResult.postScore}%
                                    </p>
                                  </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                  {postTestResult.correctCount} / {postTestResult.totalQuestions} correct
                                </p>

                                {postTestResult.improved ? (
                                  <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                    Great job — you improved from {postTestResult.preScore}% to{' '}
                                    {postTestResult.postScore}%!
                                  </p>
                                ) : (
                                  <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                                    You scored {postTestResult.postScore}% (was {postTestResult.preScore}% before) —
                                    try watching another recommended video and test again.
                                  </p>
                                )}

                                <button
                                  onClick={resetPostTest}
                                  className="mt-5 inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                >
                                  Done
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {alternativeRecommendations.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            You might also like
                          </p>
                          <div className="space-y-4">
                            {alternativeRecommendations.map((v) => (
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
