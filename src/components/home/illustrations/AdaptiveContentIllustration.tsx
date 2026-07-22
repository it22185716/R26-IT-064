'use client';

import type { RefObject } from 'react';
import Image from 'next/image';
import ParallaxLayer from '../ParallaxLayer';

interface IllustrationProps {
  bgRef: RefObject<HTMLDivElement>;
  midRef: RefObject<HTMLDivElement>;
  fgRef: RefObject<HTMLDivElement>;
}

export default function AdaptiveContentIllustration({ bgRef, midRef, fgRef }: IllustrationProps) {
  return (
    <div className="relative mx-auto h-80 max-w-md transition-transform duration-300 hover:[transform:perspective(1200px)_rotateX(1.5deg)_rotateY(-1.5deg)_scale(1.02)] sm:h-96">
      <ParallaxLayer ref={bgRef} className="absolute -inset-6 overflow-hidden rounded-[3rem]">
        <Image
          src="/videocontent.jpeg"
          alt="Adaptive video content delivered to a student"
          fill
          sizes="(min-width: 640px) 28rem, 90vw"
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-purple-500/25 via-violet-600/15 to-slate-950/35" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
      </ParallaxLayer>

      <ParallaxLayer
        ref={fgRef}
        className="absolute -right-4 -top-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 shadow-2xl shadow-violet-500/40 ring-1 ring-inset ring-white/30 drop-shadow-xl sm:-right-8"
      >
        <svg viewBox="0 0 24 24" className="h-11 w-11 text-white" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.2 4.8 5.3.6-4 3.6 1.1 5.2L12 14.8 7.4 17.2l1.1-5.2-4-3.6 5.3-.6Z" />
        </svg>
      </ParallaxLayer>

      <div className="absolute -bottom-6 left-2 rounded-xl border border-white/50 bg-white/40 px-4 py-2 text-xs font-semibold text-violet-800 shadow-[0_2px_6px_rgba(15,23,42,0.08),0_10px_24px_rgba(139,92,246,0.18)] ring-1 ring-inset ring-white/25 backdrop-blur-md">
        Matched to student level
      </div>
    </div>
  );
}
