'use client';

import { toThumbnailUrl } from '../../lib/youtube';

type Props = {
  title: string;
  url: string;
  duration?: string;
  badge?: string;
  badgeStyle?: string;
};

export default function VideoCard({ title, url, duration, badge, badgeStyle = 'bg-slate-100 text-slate-600' }: Props) {
  const thumb = toThumbnailUrl(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-900">
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
      </div>
      <div className="p-4">
        {badge && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeStyle}`}>
            {badge}
          </span>
        )}
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{title}</p>
      </div>
    </a>
  );
}
