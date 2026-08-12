'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useParallax } from './useParallax';
import { HERO_BG } from './content';

const QUICK_STATS: [string, string][] = [
  ['4', 'AI modules'],
  ['1', 'Unified dashboard'],
  ['Grade 7', 'Pilot cohort'],
];

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useParallax({
    containerRef: sectionRef,
    entranceRefs: [textRef, statsRef],
  });

  return (
    <section
      id="home"
      ref={sectionRef}
      data-bg-section
      data-bg-from={HERO_BG.from}
      data-bg-to={HERO_BG.to}
      className="sticky top-0 z-0 flex h-screen items-center overflow-hidden pt-24 pb-20 sm:pt-28"
    >
      <div className="absolute inset-0">
        <Image
          src="/bck.jpeg"
          alt="Students at Hayagiri International Buddhist College"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/50 to-slate-950/75" />

      <div className="relative mx-auto w-full max-w-6xl px-6 text-left">
        <div ref={textRef} className="opacity-0">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="block">
              One AI platform,{' '}
              <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                four ways
              </span>
            </span>
            <span className="block">to understand every student.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200">
            Built for Hayagiri International Buddhist College, this platform brings AI-powered nutrition guidance,
            math gap detection, reading assessment, and adaptive content delivery together — so teachers and parents
            always know exactly where to help next.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <a
              href="/auth"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.25),0_16px_36px_rgba(15,23,42,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-sky-600 hover:via-indigo-600 hover:to-violet-600 hover:text-white hover:shadow-[0_4px_14px_rgba(79,70,229,0.45),0_24px_50px_rgba(79,70,229,0.35)] active:translate-y-0 active:scale-95"
            >
              Get Started
            </a>
            <a
              href="#nutrition"
              className="group inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.20)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-sky-600 hover:via-indigo-600 hover:to-violet-600 hover:text-white hover:shadow-[0_4px_14px_rgba(79,70,229,0.40),0_24px_50px_rgba(79,70,229,0.30)] active:translate-y-0 active:scale-95"
            >
              Explore the modules
            </a>
          </div>
        </div>

        <div ref={statsRef} className="opacity-0">
          <dl className="mt-12 flex max-w-md flex-wrap gap-x-10 gap-y-6">
            {QUICK_STATS.map(([value, label], index) => (
              <div
                key={label}
                style={{ transitionDelay: `${index * 100}ms` }}
                className="cursor-default transition-transform duration-300 hover:-translate-y-1.5 hover:scale-110"
              >
                <dt className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-2xl font-bold text-transparent">
                  {value}
                </dt>
                <dd className="mt-1 text-xs font-medium text-slate-300">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
