'use client';

import type { RefObject } from 'react';
import Image from 'next/image';
import ParallaxLayer from '../ParallaxLayer';

interface IllustrationProps {
  bgRef: RefObject<HTMLDivElement>;
  midRef: RefObject<HTMLDivElement>;
  fgRef: RefObject<HTMLDivElement>;
}

export default function MathIllustration({ bgRef, midRef, fgRef }: IllustrationProps) {
  return (
    <div className="relative mx-auto h-80 max-w-md transition-transform duration-300 hover:[transform:perspective(1200px)_rotateX(1.5deg)_rotateY(-1.5deg)_scale(1.02)] sm:h-96">
      <ParallaxLayer ref={bgRef} className="absolute -inset-6 overflow-hidden rounded-[3rem]">
        <Image
          src="/quizimg.jpeg"
          alt="Student working through a math problem"
          fill
          sizes="(min-width: 640px) 28rem, 90vw"
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-blue-500/25 via-indigo-600/15 to-slate-950/35" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
      </ParallaxLayer>

      <ParallaxLayer
        ref={fgRef}
        className="absolute -right-4 -top-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 shadow-2xl shadow-indigo-500/40 ring-1 ring-inset ring-white/30 drop-shadow-xl sm:-right-8"
      >
        <svg viewBox="0 0 24 24" className="h-11 w-11 text-white" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V9m6 8V5M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
        </svg>
      </ParallaxLayer>

      <div className="absolute -bottom-6 left-2 rounded-xl border border-white/50 bg-white/40 px-4 py-2 text-xs font-semibold text-indigo-800 shadow-[0_2px_6px_rgba(15,23,42,0.08),0_10px_24px_rgba(79,70,229,0.18)] ring-1 ring-inset ring-white/25 backdrop-blur-md">
        Weakest topic flagged: Fractions
      </div>
    </div>
  );
}
