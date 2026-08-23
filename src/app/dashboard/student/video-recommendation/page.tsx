'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import StudentShell from '../../../../components/dashboard/StudentShell';
import VideoCard from '../../../../components/dashboard/VideoCard';
import { fetchAssignedVideos } from '../../../../lib/assignedVideos';
import { AssignedVideo, QuizAttempt } from '../../../../lib/types';
import { toEmbedUrl, toThumbnailUrl } from '../../../../lib/youtube';
import { useParallax } from '../../../../components/home/useParallax';
import { useStaggerReveal } from '../../../../components/dashboard/useStaggerReveal';
import { gsap, ScrollTrigger } from '../../../../components/home/gsapClient';

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

// One-off "curtain draw" flourish for the screening room panel — a restrained
// scale-in layered on top of useParallax's own fade/slide for the same
// element. Kept local to this page per the task's constraints rather than
// added to the shared hooks. Mirrors useParallax.ts's own defensive
// structure: poll for the ref to mount, gsap.context() + matchMedia gate on
// prefers-reduced-motion, ScrollTrigger start/toggleActions, ctx.revert() on
// cleanup.
function useScreeningRoomCurtain(ref: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    let cancelled = false;
    let rafId: number | undefined;
    let ctx: ReturnType<typeof gsap.context> | undefined;

    const setup = () => {
      if (cancelled) return;
      if (!ref.current) {
        rafId = requestAnimationFrame(setup);
        return;
      }

      try {
        ctx = gsap.context(() => {
          const mm = gsap.matchMedia();
          mm.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.fromTo(
              ref.current,
              { scale: 0.97 },
              {
                scale: 1,
                duration: 0.5,
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: ref.current,
                  start: 'top 85%',
                  toggleActions: 'play none none reverse',
                },
              },
            );
          });
        }, ref);
      } catch (err) {
        console.error('useScreeningRoomCurtain: GSAP setup failed, skipping the scale flourish.', err);
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

export default function VideoRecommendationPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [assigned, setAssigned] = useState<AssignedVideo[] | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [recommended, setRecommended] = useState<CommonVideo[] | null>(null);

  const [mainVideoPlaying, setMainVideoPlaying] = useState(false);

  // Counts computed above the loading gate below so the choreography hooks —
  // which are hooks and must run unconditionally on every render — have
  // stable primitives to key their deps on.
  const assignedCount = assigned?.length ?? 0;
  const alternativeCount = Math.max(0, (recommended?.length ?? 0) - 1);

  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const screeningRoomRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const alternativesRef = useRef<HTMLDivElement>(null);
  const assignedRef = useRef<HTMLDivElement>(null);

  const altGridRef = useRef<HTMLDivElement>(null);
  const assignedGridRef = useRef<HTMLDivElement>(null);

  // Dynamically-sized ref pools — recreated only when the item count changes,
  // so a stable identity persists across renders that don't add/remove items.
  // VideoCard.tsx is a plain function component (not forwardRef), and it's
  // out of scope to change — so each item gets a wrapping div ref instead of
  // a ref straight into VideoCard.
  const altItemRefs = useMemo(
    () => Array.from({ length: alternativeCount }, () => React.createRef<HTMLDivElement>()),
    [alternativeCount],
  );
  const assignedItemRefs = useMemo(
    () => Array.from({ length: assignedCount }, () => React.createRef<HTMLDivElement>()),
    [assignedCount],
  );

  // Step 1 + Step 3: page-level entrance choreography, plus a subtle parallax
  // drift on the screening room's ambient glow. Mirrors the exact hook usage
  // in src/app/dashboard/student/page.tsx.
  useParallax({
    containerRef: mainRef,
    entranceRefs: [headerRef, screeningRoomRef, alternativesRef, assignedRef],
    layers: [{ ref: glowRef, speed: -30 }],
  });

  // Step 2: two independent "poster shelf" stagger groups.
  useStaggerReveal(altGridRef, altItemRefs, { start: 'top 85%', deps: [alternativeCount] });
  useStaggerReveal(assignedGridRef, assignedItemRefs, { start: 'top 85%', deps: [assignedCount] });

  // Step 4: the screening room's one-off curtain-draw scale, layered on top
  // of its own entrance fade/slide from useParallax above.
  useScreeningRoomCurtain(screeningRoomRef);

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

  // Recommendations and assigned videos load async and change page height,
  // which can leave ScrollTrigger's cached trigger positions for anything
  // below the fold stale (same reasoning as the identical comment in
  // src/app/dashboard/student/page.tsx). Recalculate once both have settled.
  useEffect(() => {
    if (assigned !== null && recommended !== null) ScrollTrigger.refresh();
  }, [assigned, recommended]);

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

  function startPostTest() {
    if (!mainRecommendation || !weakestCategory) return;
    router.push(`/dashboard/student/video-recommendation/posttest?topic=${encodeURIComponent(weakestCategory)}`);
  }

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
      <main ref={mainRef} className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div ref={headerRef} className="opacity-0">
          <p className="text-sm text-slate-500">Video Library</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Watch and learn</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Videos picked for you based on your quiz results and your teacher's suggestions.
          </p>
        </div>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-slate-900">Your recommendations</h2>
          <p className="mt-1 text-sm text-slate-500">{recommendationsSubtitle}</p>

          <div className="mt-4">
            {recommendationsLoading && (
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
            )}

            {!recommendationsLoading && !hasAssigned && !hasRecommended && (
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
            )}

            {/* Always mounted (even while loading/empty) so useParallax's one-shot
                entrance setup — which never retries — reliably finds these refs.
                Hidden via `hidden`, not conditional rendering, until there's
                something to show; Step 6's ScrollTrigger.refresh() then
                recalculates trigger positions once real content replaces this
                placeholder layout. */}
            <div className={`space-y-6 ${recommendationsLoading || (!hasAssigned && !hasRecommended) ? 'hidden' : ''}`}>
              <div ref={assignedRef} className="opacity-0">
                {hasAssigned && (
                  <div className="rounded-2xl bg-gradient-to-b from-indigo-50/40 via-white to-white p-4 -m-4">
                    {hasRecommended && (
                      <h3 className="text-sm font-semibold text-slate-700">Picked by your teacher</h3>
                    )}
                    <div ref={assignedGridRef} className={`grid gap-4 sm:grid-cols-3 ${hasRecommended ? 'mt-3' : ''}`}>
                      {assigned?.map((v, i) => (
                        <div key={v.id} ref={assignedItemRefs[i]}>
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
              </div>

              <div>
                {hasRecommended && mainRecommendation && hasAssigned && (
                  <h3 className="text-sm font-semibold text-slate-700">
                    Based on your last quiz — you&apos;re weakest in {weakestCategory}
                  </h3>
                )}
                <div className={`grid gap-4 lg:grid-cols-3 ${hasAssigned && hasRecommended ? 'mt-3' : ''}`}>
                  <div ref={screeningRoomRef} className="relative opacity-0 lg:col-span-2">
                    {/* Soft, low-opacity color blobs behind the featured card — the
                        same "gold (project accent) + violet (secondary)" pairing used
                        for the card's own gradient ring, just diffused into ambient
                        light atmosphere rather than a hard shape. Always mounted (even
                        before a recommendation exists) so the parallax layer wires up
                        on the very first setup pass. */}
                    <div ref={glowRef} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                      <div className="absolute -top-8 left-6 h-56 w-56 rounded-full bg-gold-200/40 blur-3xl animate-blob motion-reduce:animate-none" />
                      <div className="absolute -top-14 right-0 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl animate-blob [animation-delay:3s] motion-reduce:animate-none" />
                      <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-rose-200/30 blur-3xl animate-blob [animation-delay:5s] motion-reduce:animate-none" />
                    </div>

                    {hasRecommended && mainRecommendation && (
                      <>
                        <div className="mb-2 inline-flex items-center rounded-full bg-gradient-to-r from-gold-700 to-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm shadow-violet-500/20">
                          Top pick
                        </div>
                        {/* Gradient "glow ring" frame — a padding-box double-background
                            trick (gradient outer + solid white inner) gives the featured
                            card its presence via a colorful border and soft tinted
                            shadow, instead of a dark backdrop. */}
                        <div className="rounded-2xl bg-gradient-to-br from-gold-400 via-amber-300 to-violet-400 p-[2px] shadow-xl shadow-gold-500/10">
                          <div className="overflow-hidden rounded-[14px] bg-white">
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
                        </div>

                        {weakestCategory && (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                            <button
                              onClick={startPostTest}
                              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-gold-700 to-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-gold-500/20 transition-all duration-300 hover:from-gold-800 hover:to-amber-800 hover:shadow-lg hover:shadow-gold-500/25 motion-reduce:transition-none"
                            >
                              I&apos;ve watched this — take the post-test
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div ref={alternativesRef} className="opacity-0">
                    {alternativeRecommendations.length > 0 && (
                      <div className="rounded-2xl bg-gradient-to-b from-indigo-50/40 via-white to-white p-4 -m-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          You might also like
                        </p>
                        {/* 2-up only in the sm–lg range, where this section is still
                            full page width; back to 1 column at lg+ once it's confined
                            to the narrow 1/3 sidebar next to the featured card, so cards
                            never get squeezed into a cramped mini-grid. */}
                        <div ref={altGridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                          {alternativeRecommendations.map((v, i) => (
                            <div key={v.url} ref={altItemRefs[i]}>
                              <VideoCard
                                title={v.title}
                                url={v.url}
                                duration={v.duration}
                                badge={v.difficulty}
                                badgeStyle={badgeStyle[v.difficulty] || 'bg-slate-100 text-slate-600'}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </StudentShell>
  );
}
