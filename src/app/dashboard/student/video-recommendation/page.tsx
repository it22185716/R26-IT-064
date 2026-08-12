'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import StudentShell from '../../../../components/dashboard/StudentShell';
import VideoCard from '../../../../components/dashboard/VideoCard';
import { fetchAssignedVideos } from '../../../../lib/assignedVideos';
import { AssignedVideo } from '../../../../lib/types';

type CommonVideo = { title: string; url: string; duration: string; difficulty: string };

const badgeStyle: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700',
  Intermediate: 'bg-amber-50 text-amber-700',
  Advanced: 'bg-rose-50 text-rose-700',
};

export default function VideoRecommendationPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [assigned, setAssigned] = useState<AssignedVideo[] | null>(null);
  const [common, setCommon] = useState<CommonVideo[] | null>(null);

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

  useEffect(() => {
    fetch('/api/video-recommendation/common')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json: { success: boolean; videos: CommonVideo[] }) => setCommon(json.success ? json.videos : []))
      .catch(() => setCommon([]));
  }, []);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <StudentShell userName={profile?.name || user.email || ''} title="Video Library">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <p className="text-sm text-slate-500">Video Library</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Watch and learn</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Videos picked for you by your teacher, plus a general library to explore on your own.
        </p>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-slate-900">Your recommendations</h2>
          <p className="mt-1 text-sm text-slate-500">Handpicked for you by your teacher.</p>

          <div className="mt-4">
            {assigned === null ? (
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
            ) : assigned.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">Your teacher hasn&apos;t assigned any videos yet</p>
                <p className="mt-1 text-sm text-slate-500">Check back soon — until then, explore the library below.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {assigned.map((v) => (
                  <div key={v.id}>
                    <VideoCard title={v.title} url={v.url} badge="From your teacher" badgeStyle="bg-indigo-50 text-indigo-700" />
                    {v.note && <p className="mt-2 text-xs text-slate-500">&ldquo;{v.note}&rdquo; — {v.assignedByName}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-slate-900">Common videos for you</h2>
          <p className="mt-1 text-sm text-slate-500">A general library covering every topic — open to explore anytime.</p>

          <div className="mt-4">
            {common === null ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="aspect-video bg-slate-100" />
                    <div className="space-y-2 p-4">
                      <div className="h-3.5 w-4/5 rounded bg-slate-100" />
                      <div className="h-3 w-2/5 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : common.length === 0 ? (
              <p className="text-sm text-slate-500">The video library couldn&apos;t be loaded right now — try again later.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {common.map((v) => (
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
            )}
          </div>
        </section>
      </main>
    </StudentShell>
  );
}
