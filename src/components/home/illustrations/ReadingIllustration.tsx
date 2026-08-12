'use client';

import type { RefObject } from 'react';
import Image from 'next/image';
import ParallaxLayer from '../ParallaxLayer';

interface IllustrationProps {
  bgRef: RefObject<HTMLDivElement>;
  midRef: RefObject<HTMLDivElement>;
  fgRef: RefObject<HTMLDivElement>;
}

export default function ReadingIllustration({ bgRef, midRef, fgRef }: IllustrationProps) {
  return (
    <div className="relative h-[26rem] w-full transition-transform duration-300 hover:[transform:perspective(1200px)_rotateX(1deg)_rotateY(-1deg)_scale(1.015)] sm:h-[30rem] lg:h-[34rem]">
      <ParallaxLayer ref={bgRef} className="absolute -inset-3 overflow-hidden rounded-[2rem] sm:-inset-4">
        <Image
          src="/Reading.jpeg"
          alt="Student engaged in a reading session"
          fill
          sizes="(min-width: 640px) 28rem, 90vw"
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-orange-500/25 via-amber-600/15 to-slate-950/35" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
      </ParallaxLayer>

      <ParallaxLayer
        ref={fgRef}
        className="absolute -right-4 -top-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 shadow-2xl shadow-amber-500/40 ring-1 ring-inset ring-white/30 drop-shadow-xl sm:-right-8"
      >
        <svg viewBox="0 0 24 24" className="h-11 w-11 text-white" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0v-2a4 4 0 0 1 4-4Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12a6 6 0 0 0 12 0M12 18v3" />
        </svg>
      </ParallaxLayer>

      <div className="absolute -bottom-6 left-2 rounded-xl border border-white/50 bg-white/40 px-4 py-2 text-xs font-semibold text-amber-800 shadow-[0_2px_6px_rgba(15,23,42,0.08),0_10px_24px_rgba(245,158,11,0.18)] ring-1 ring-inset ring-white/25 backdrop-blur-md">
        Fluency up 18% this term
      </div>
    </div>
  );
}
