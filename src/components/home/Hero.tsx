'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useParallax } from './useParallax';
import HeroIllustration from './illustrations/HeroIllustration';
import { HERO_BG } from './content';

const QUICK_STATS: [string, string][] = [
  ['4', 'AI modules'],
  ['1', 'Unified dashboard'],
  ['Grade 7', 'Pilot cohort'],
];

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const illustrationRef = useRef<HTMLDivElement>(null);
  const bgLayerRef = useRef<HTMLDivElement>(null);
  const midLayerRef = useRef<HTMLDivElement>(null);
  const fgLayerRef = useRef<HTMLDivElement>(null);

  useParallax({
    containerRef: sectionRef,
    layers: [
      { ref: bgLayerRef, speed: -30 },
      { ref: midLayerRef, speed: -60 },
      { ref: fgLayerRef, speed: -100 },
    ],
    entranceRefs: [textRef, illustrationRef],
  });

  return (
    <section
      id="home"
      ref={sectionRef}
      data-bg-section
      data-bg-from={HERO_BG.from}
      data-bg-to={HERO_BG.to}
      className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32"
    >
      <Image
        src="/bck.jpeg"
        alt="Students at Hayagiri International Buddhist College"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/65 to-slate-950/35"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20">
        <div ref={textRef} className="opacity-0">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            One AI platform,{' '}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              four ways
            </span>{' '}
            to understand every student.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200">
            Built for Hayagiri International Buddhist College, this platform brings AI-powered nutrition guidance,
            math gap detection, reading assessment, and adaptive content delivery together — so teachers and parents
            always know exactly where to help next.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <a
              href="/auth"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/10 shadow-[0_2px_6px_rgba(15,23,42,0.35),0_16px_36px_rgba(15,23,42,0.30)] transition-all duration-200 hover:-translate-y-0.5 hover:from-slate-950 hover:to-slate-800 hover:shadow-[0_4px_14px_rgba(15,23,42,0.45),0_24px_50px_rgba(15,23,42,0.40)] active:translate-y-0 active:scale-95"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-[400ms] ease-out group-hover:translate-x-full"
              />
              Get Started
            </a>
            <a
              href="#nutrition"
              className="inline-flex items-center justify-center rounded-xl border border-white/50 bg-white/40 px-6 py-3 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-white/30 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/60 hover:shadow-lg hover:shadow-slate-900/10 active:translate-y-0 active:scale-95"
            >
              Explore the modules
            </a>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
            {QUICK_STATS.map(([value, label]) => (
              <div key={label}>
                <dt className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-2xl font-bold text-transparent">
                  {value}
                </dt>
                <dd className="mt-1 text-xs font-medium text-slate-300">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div ref={illustrationRef} className="opacity-0">
          <HeroIllustration bgRef={bgLayerRef} midRef={midLayerRef} fgRef={fgLayerRef} />
        </div>
      </div>
    </section>
  );
}
