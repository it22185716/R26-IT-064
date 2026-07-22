'use client';

import { useRef } from 'react';
import { useParallax } from './useParallax';
import { STATS_BG } from './content';

const STATS = [
  {
    value: '4',
    label: 'AI-powered modules',
    description: 'Nutrition, math, reading and content — one platform.',
    accent: 'from-lime-500 to-green-600',
  },
  {
    value: '360°',
    label: 'Whole-child view',
    description: 'Academic and wellbeing signals in a single dashboard.',
    accent: 'from-blue-500 to-indigo-600',
  },
  {
    value: 'Real-time',
    label: 'Gap detection',
    description: 'Weak areas surface as soon as data comes in.',
    accent: 'from-orange-500 to-amber-600',
  },
  {
    value: 'Grade 7',
    label: 'Pilot cohort',
    description: 'Built and tested with Hayagiri students first.',
    accent: 'from-purple-500 to-violet-600',
  },
];

export default function StatsStrip() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useParallax({ containerRef: sectionRef, entranceRefs: [gridRef] });

  return (
    <section
      ref={sectionRef}
      data-bg-section
      data-bg-from={STATS_BG.from}
      data-bg-to={STATS_BG.to}
      className="relative py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Why it matters
          </h2>
          <p className="mt-3 text-slate-700">Four modules, one goal: catch what a student needs before it becomes a gap.</p>
        </div>

        <div ref={gridRef} className="mt-12 grid gap-6 opacity-0 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/30 p-6 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_20px_45px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/20 backdrop-blur-xl transition-all duration-300 hover:[transform:perspective(800px)_rotateX(2deg)_translateY(-6px)] hover:border-white/70 hover:bg-white/45 hover:shadow-[0_4px_14px_rgba(15,23,42,0.10),0_28px_56px_rgba(15,23,42,0.16)]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent"
              />
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accent}`} />
              <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">{stat.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
