"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import DashboardShell from '../../../../components/DashboardShell';

type Recommendation = {
  priority: number;
  video_title: string;
  video_url: string;
  video_duration: string;
  difficulty_level: string;
  predicted_class: 'High' | 'Medium' | 'Low';
  content_quality_score: number;
  student_suitability_score: number;
};

type RecommendResponse = {
  weak_area: string;
  recommendations: Recommendation[];
};

// Raw shape returned by the Flask /recommend endpoint (ml-services/video-recommendation/app.py).
type ApiRecommendation = {
  rank: number;
  title: string;
  url: string;
  duration_minutes: number;
  video_duration: string;
  difficulty: string;
  predicted_suitability: 'High' | 'Medium' | 'Low';
  content_quality_score: number;
  student_suitability_score: number;
};

type ApiRecommendResponse = {
  success: boolean;
  weak_area: string;
  recommendations: ApiRecommendation[];
  error?: string;
};

function toRecommendation(api: ApiRecommendation): Recommendation {
  return {
    priority: api.rank,
    video_title: api.title,
    video_url: api.url,
    video_duration: api.video_duration,
    difficulty_level: api.difficulty,
    predicted_class: api.predicted_suitability,
    content_quality_score: api.content_quality_score,
    student_suitability_score: api.student_suitability_score,
  };
}

// TODO: replace with the real weak_area coming from the Weak Detection component
const WEAK_AREA = 'Addition';

function toEmbedUrl(url: string): string | null {
  // handles both youtu.be/ID and youtube.com/watch?v=ID; returns null when the
  // URL has no extractable video ID (e.g. a youtube.com/results search-query
  // link, which YouTube refuses to render inside an iframe).
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const longMatch = url.match(/[?&]v=([^?&]+)/);
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
  return null;
}

const classBadgeStyle: Record<string, string> = {
  High: 'bg-emerald-50 text-emerald-700',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
};

export default function VideoRecommendationPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<Recommendation | null>(null);

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
    // Goes through the Next.js proxy (src/app/api/video-recommendation/recommend/route.ts),
    // which forwards to the Flask service (ml-services/video-recommendation/app.py, port 5002).
    fetch('/api/video-recommendation/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weak_area: WEAK_AREA }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch recommendations');
        return res.json();
      })
      .then((json: ApiRecommendResponse) => {
        if (!json.success) throw new Error(json.error || 'Failed to fetch recommendations');
        const recommendations = json.recommendations.map(toRecommendation);
        setData({ weak_area: json.weak_area, recommendations });
        setActiveVideo(recommendations[0] ?? null);
      })
      .catch((err) => setError(err.message));
  }, [user]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const mainVideo = data?.recommendations[0];
  const alternatives = data?.recommendations.slice(1) ?? [];
  const embedUrl = activeVideo ? toEmbedUrl(activeVideo.video_url) : null;

  return (
    <DashboardShell
      role="student"
      title="Your Personalized Video Recommendations"
      subtitle="Videos selected by our AI model based on your weak area."
      userName={profile?.name || user.email || ''}
      backHref="/dashboard/student"
      backLabel="Back to Overview"
    >
      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600">
          {error}. Make sure the recommendation backend is running.
        </div>
      )}

      {!error && !data && (
        <p className="text-sm text-slate-400">Loading recommendations…</p>
      )}

      {mainVideo && activeVideo && (
        <>
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                #1 Recommended Video
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${classBadgeStyle[mainVideo.predicted_class]}`}
              >
                Predicted: {mainVideo.predicted_class}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">{activeVideo.video_title}</h3>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                  {embedUrl ? (
                    <iframe
                      key={embedUrl}
                      src={embedUrl}
                      title={activeVideo.video_title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <a
                      href={activeVideo.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-300 transition-colors hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9l5 3-5 3V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">This video isn&apos;t embeddable — open on YouTube</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-xl border border-slate-100 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-xl font-bold text-slate-900">{activeVideo.difficulty_level}</p>
                  <p className="text-xs text-slate-400">Difficulty</p>
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-xl font-bold text-slate-900">{activeVideo.video_duration}</p>
                  <p className="text-xs text-slate-400">Length</p>
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-xl font-bold text-slate-900">{activeVideo.predicted_class}</p>
                  <p className="text-xs text-slate-400">Model confidence</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/quiz?topic=${encodeURIComponent(WEAK_AREA)}`)}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 font-semibold text-white shadow transition-colors hover:bg-sky-700"
            >
              I've watched this video
            </button>
          </div>

          {alternatives.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Alternative Recommendations
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {alternatives.map((rec) => (
                  <div key={`${rec.video_url}-${rec.priority}`} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">#{rec.priority}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classBadgeStyle[rec.predicted_class]}`}
                      >
                        {rec.predicted_class}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">{rec.video_title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {rec.difficulty_level} · {rec.video_duration}
                    </p>
                    <button
                      onClick={() => setActiveVideo(rec)}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
                    >
                      Watch video
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
