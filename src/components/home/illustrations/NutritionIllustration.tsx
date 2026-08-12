'use client';

import type { RefObject } from 'react';
import Image from 'next/image';
import ParallaxLayer from '../ParallaxLayer';

interface IllustrationProps {
  bgRef: RefObject<HTMLDivElement>;
  midRef: RefObject<HTMLDivElement>;
  fgRef: RefObject<HTMLDivElement>;
}

export default function NutritionIllustration({ bgRef, midRef, fgRef }: IllustrationProps) {
  return (
    <div className="relative h-[26rem] w-full transition-transform duration-300 hover:[transform:perspective(1200px)_rotateX(1deg)_rotateY(-1deg)_scale(1.015)] sm:h-[30rem] lg:h-[34rem]">
      <ParallaxLayer ref={bgRef} className="absolute -inset-3 overflow-hidden rounded-[2rem] sm:-inset-4">
        <Image
          src="/meal.jpg"
          alt="Fresh ingredients for a balanced meal"
          fill
          sizes="(min-width: 640px) 28rem, 90vw"
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-lime-500/25 via-green-600/15 to-slate-950/35" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
      </ParallaxLayer>

      <ParallaxLayer
        ref={fgRef}
        className="absolute -right-4 -top-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-green-600 shadow-2xl shadow-green-500/40 ring-1 ring-inset ring-white/30 drop-shadow-xl sm:-right-8"
      >
        <svg viewBox="0 0 24 24" className="h-11 w-11 text-white" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4.5-2.2-8-6-8-11a6 6 0 0 1 10-4.5A6 6 0 0 1 20 10c0 5-3.5 8.8-8 11Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V9" />
        </svg>
      </ParallaxLayer>

      <div className="absolute -bottom-6 left-2 rounded-xl border border-white/50 bg-white/40 px-4 py-2 text-xs font-semibold text-green-800 shadow-[0_2px_6px_rgba(15,23,42,0.08),0_10px_24px_rgba(34,197,94,0.18)] ring-1 ring-inset ring-white/25 backdrop-blur-md">
        Growth on track · +12%
      </div>
    </div>
  );
}
