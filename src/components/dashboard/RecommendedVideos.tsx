'use client';

import { useEffect, useState } from 'react';
import VideoCard from './VideoCard';
import { fetchAssignedVideos } from '../../lib/assignedVideos';
import { AssignedVideo } from '../../lib/types';

type CommonVideo = { title: string; url: string; duration: string; difficulty: string };

const badgeStyle: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700',
  Intermediate: 'bg-amber-50 text-amber-700',
  Advanced: 'bg-rose-50 text-rose-700',
};

type Props = {
  studentId: string;
};

// Prefers whatever the student's teacher has assigned; falls back to the
// general catalog so the tile never sits empty while waiting on a teacher.
export default function RecommendedVideos({ studentId }: Props) {
  const [assigned, setAssigned] = useState<AssignedVideo[] | null>(null);
  const [common, setCommon] = useState<CommonVideo[] | null>(null);

  useEffect(() => {
    fetchAssignedVideos(studentId)
      .then(setAssigned)
      .catch(() => setAssigned([]));
  }, [studentId]);

  useEffect(() => {
    if (!assigned || assigned.length > 0) return;
    fetch('/api/video-recommendation/common')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json: { success: boolean; videos: CommonVideo[] }) => {
        setCommon(json.success ? json.videos.slice(0, 3) : []);
      })
      .catch(() => setCommon([]));
  }, [assigned]);

  if (assigned === null || (assigned.length === 0 && common === null)) {
    return (
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
    );
  }

  if (assigned.length > 0) {
    return (
      <div>
        <p className="mb-3 text-xs text-slate-500">Picked for you by your teacher.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {assigned.slice(0, 3).map((v) => (
            <VideoCard key={v.id} title={v.title} url={v.url} badge="From your teacher" badgeStyle="bg-indigo-50 text-indigo-700" />
          ))}
        </div>
      </div>
    );
  }

  if (!common || common.length === 0) {
    return (
      <a
        href="/dashboard/student/video-recommendation"
        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm transition-colors hover:border-slate-300"
      >
        <span className="text-slate-600">Browse the video library for curated picks.</span>
        <span className="font-medium text-indigo-600">Open →</span>
      </a>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Your teacher hasn&apos;t assigned any videos yet — here are some general picks in the meantime.
      </p>
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
    </div>
  );
}
