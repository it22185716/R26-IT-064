'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { toThumbnailUrl } from '../../lib/youtube';
import { assignVideo, fetchAssignedVideos, removeAssignedVideo } from '../../lib/assignedVideos';
import { AssignedVideo } from '../../lib/types';

type CandidateVideo = { title: string; url: string; duration: string; difficulty: string };

const badgeStyle: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700',
  Intermediate: 'bg-amber-50 text-amber-700',
  Advanced: 'bg-rose-50 text-rose-700',
};

type Props = {
  studentId: string;
  /** The student's weakest quiz category, if any — used to fetch topic-matched suggestions. */
  weakArea?: string;
  teacherName: string;
};

export default function AssignVideosPanel({ studentId, weakArea, teacherName }: Props) {
  const [assigned, setAssigned] = useState<AssignedVideo[] | null>(null);
  const [candidates, setCandidates] = useState<CandidateVideo[] | null>(null);
  const [candidateLabel, setCandidateLabel] = useState('Suggested videos');
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  function reloadAssigned() {
    fetchAssignedVideos(studentId)
      .then(setAssigned)
      .catch(() => setAssigned([]));
  }

  useEffect(() => {
    reloadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    setCandidates(null);

    async function load() {
      if (weakArea) {
        try {
          const res = await fetch('/api/video-recommendation/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weak_area: weakArea }),
          });
          const json = await res.json();
          if (json.success && json.recommendations?.length) {
            setCandidateLabel(`Suggested for ${weakArea}`);
            setCandidates(
              json.recommendations.map((r: { title: string; url: string; video_duration: string; difficulty: string }) => ({
                title: r.title,
                url: r.url,
                duration: r.video_duration,
                difficulty: r.difficulty,
              })),
            );
            return;
          }
        } catch {
          // fall through to the general catalog below
        }
      }

      // No weak area yet, or the topic-matched service didn't return anything —
      // fall back to the general catalog so the teacher always has something to pick from.
      try {
        const res = await fetch('/api/video-recommendation/common');
        const json = await res.json();
        setCandidateLabel('General library');
        setCandidates(json.success ? json.videos : []);
      } catch {
        setCandidates([]);
      }
    }

    load();
  }, [weakArea]);

  async function handleAssign(video: CandidateVideo) {
    setPendingUrl(video.url);
    try {
      await assignVideo({ studentId, title: video.title, url: video.url, assignedByName: teacherName });
      reloadAssigned();
    } finally {
      setPendingUrl(null);
    }
  }

  async function handleRemove(id: string) {
    setPendingUrl(id);
    try {
      await removeAssignedVideo(id);
      reloadAssigned();
    } finally {
      setPendingUrl(null);
    }
  }

  const assignedUrls = new Set((assigned || []).map((v) => v.url));

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-slate-900">Assigned videos</h3>
        <p className="mt-1 text-sm text-slate-500">Videos this student sees under &quot;Your recommendations&quot;.</p>

        {assigned === null ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : assigned.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nothing assigned yet — pick something below.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assigned.map((v) => (
              <VideoTile
                key={v.id}
                title={v.title}
                url={v.url}
                footer={
                  <button
                    type="button"
                    onClick={() => handleRemove(v.id)}
                    disabled={pendingUrl === v.id}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    {pendingUrl === v.id ? 'Removing…' : 'Remove'}
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900">{candidateLabel}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {weakArea ? `Picked based on this student's weakest category.` : `This student hasn't taken a quiz yet — showing the general library.`}
        </p>

        {candidates === null ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        ) : candidates.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No videos available right now.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((v) => {
              const alreadyAssigned = assignedUrls.has(v.url);
              return (
                <VideoTile
                  key={v.url}
                  title={v.title}
                  url={v.url}
                  duration={v.duration}
                  badge={v.difficulty}
                  badgeStyle={badgeStyle[v.difficulty] || 'bg-slate-100 text-slate-600'}
                  footer={
                    <button
                      type="button"
                      onClick={() => handleAssign(v)}
                      disabled={alreadyAssigned || pendingUrl === v.url}
                      className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                    >
                      {alreadyAssigned ? 'Already assigned' : pendingUrl === v.url ? 'Assigning…' : 'Assign to student'}
                    </button>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoTile({
  title,
  url,
  duration,
  badge,
  badgeStyle: badgeCls = 'bg-slate-100 text-slate-600',
  footer,
}: {
  title: string;
  url: string;
  duration?: string;
  badge?: string;
  badgeStyle?: string;
  footer: ReactNode;
}) {
  const thumb = toThumbnailUrl(url);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <a href={url} target="_blank" rel="noopener noreferrer" className="relative block aspect-video overflow-hidden bg-slate-900">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover opacity-90" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {duration && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {duration}
          </span>
        )}
      </a>
      <div className="p-4">
        {badge && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeCls}`}>{badge}</span>
        )}
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{title}</p>
        <div className="mt-3">{footer}</div>
      </div>
    </div>
  );
}
