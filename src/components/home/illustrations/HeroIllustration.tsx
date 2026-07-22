'use client';

import type { RefObject } from 'react';
import ParallaxLayer from '../ParallaxLayer';

interface HeroIllustrationProps {
  bgRef: RefObject<HTMLDivElement>;
  midRef: RefObject<HTMLDivElement>;
  fgRef: RefObject<HTMLDivElement>;
}

const MODULES = [
  ['bg-gradient-to-br from-lime-400 to-green-600', 'Nutrition'],
  ['bg-gradient-to-br from-blue-400 to-indigo-600', 'Math'],
  ['bg-gradient-to-br from-orange-400 to-amber-600', 'Reading'],
  ['bg-gradient-to-br from-purple-400 to-violet-600', 'Adaptive'],
];

export default function HeroIllustration({ bgRef, midRef, fgRef }: HeroIllustrationProps) {
  return (
    <div className="relative mx-auto h-96 max-w-lg transition-transform duration-300 hover:[transform:perspective(1200px)_rotateX(1.5deg)_rotateY(-1.5deg)_scale(1.02)] sm:h-[26rem]">
      <ParallaxLayer ref={bgRef} className="absolute -inset-10">
        <div className="h-full w-full animate-blob rounded-[3rem] bg-gradient-to-br from-sky-300 via-violet-300 to-orange-200 opacity-60 blur-3xl saturate-[1.35]" />
      </ParallaxLayer>

      <ParallaxLayer
        ref={midRef}
        className="absolute inset-6 overflow-hidden rounded-[2rem] border border-white/50 bg-gradient-to-br from-white/55 to-indigo-100/35 p-6 shadow-[0_2px_10px_rgba(15,23,42,0.10),0_24px_48px_rgba(99,102,241,0.20)] ring-1 ring-inset ring-white/25 backdrop-blur-xl"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student overview</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {MODULES.map(([classes, label]) => (
            <div key={label} className="rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-sm">
              <div className={`h-8 w-8 rounded-lg ${classes}`} />
              <p className="mt-2 text-xs font-semibold text-slate-600">{label}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full w-3/4 rounded-full ${classes}`} />
              </div>
            </div>
          ))}
        </div>
      </ParallaxLayer>

      <ParallaxLayer
        ref={fgRef}
        className="absolute -left-6 -top-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl ring-1 ring-inset ring-white/40 drop-shadow-lg"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2 3 7l9 5 9-5-9-5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9 5 9-5M3 17l9 5 9-5" />
        </svg>
      </ParallaxLayer>

      <div className="absolute -bottom-5 right-2 rounded-xl border border-white/50 bg-white/40 px-4 py-2 text-xs font-semibold text-slate-700 shadow-[0_2px_6px_rgba(15,23,42,0.08),0_10px_24px_rgba(99,102,241,0.18)] ring-1 ring-inset ring-white/25 backdrop-blur-md">
        Insights updated live
      </div>
    </div>
  );
}
