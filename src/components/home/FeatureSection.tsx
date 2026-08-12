'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useParallax } from './useParallax';
import { useAuthUser } from '../../hooks/useAuthUser';
import type { Accent } from './content';

interface FeatureSectionProps {
  id: string;
  index: number;
  align: 'left' | 'right';
  accent: Accent;
  /**
   * Whether this panel stays pinned while the next one slides up and covers it.
   * The last module in the stack still needs its z-index to cover the one
   * before it, but must not itself stay pinned — otherwise it blocks whatever
   * follows (stats/footer), which should just scroll in normally.
   */
  pinned?: boolean;
}

// Where a logged-in student lands for each feature, in place of accent.ctaHref
// ('/auth') once they're already authenticated. No per-feature teacher pages
// exist yet, so a logged-in teacher always goes to /dashboard/teacher.
const STUDENT_ROUTES: Record<Accent['key'], string> = {
  nutrition: '/dashboard/student/meal-plan',
  math: '/quiz',
  reading: '/dashboard/student/reading',
  adaptive: '/dashboard/student/video-recommendation',
};

export default function FeatureSection({ id, index, align, accent, pinned = true }: FeatureSectionProps) {
  const { user, profile, loading } = useAuthUser();
  const ctaHref =
    !loading && user ? (profile?.role === 'teacher' ? '/dashboard/teacher' : STUDENT_ROUTES[accent.key]) : accent.ctaHref;

  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useParallax({
    containerRef: sectionRef,
    slideRefs: [{ ref: textRef, fromX: align === 'left' ? -80 : 80 }],
  });

  const imageOrder = align === 'left' ? 'lg:order-2' : 'lg:order-1';
  const textOrder = align === 'left' ? 'lg:order-1' : 'lg:order-2';

  return (
    <section
      id={id}
      ref={sectionRef}
      data-bg-section
      data-bg-from={accent.bg.from}
      data-bg-to={accent.bg.to}
      style={{ zIndex: index }}
      className={`min-h-screen scroll-mt-24 overflow-hidden lg:h-screen ${pinned ? 'sticky top-0' : 'relative'}`}
    >
      <div className="grid h-full w-full lg:grid-cols-2">
        <div className={`relative h-64 w-full sm:h-80 lg:h-full ${imageOrder}`}>
          <Image src={accent.image.src} alt={accent.image.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-center" />
          <div aria-hidden className="absolute inset-0 bg-slate-950/20" />
        </div>

        <div className={`relative flex items-center bg-slate-950 px-6 py-14 sm:px-10 lg:h-full lg:px-16 ${textOrder}`}>
          <div ref={textRef} className="max-w-xl opacity-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              Module {String(index).padStart(2, '0')} · {accent.kicker}
            </span>

            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{accent.headline}</h2>

            <p className="mt-5 text-lg leading-relaxed text-white/85">{accent.description}</p>

            <ul className="mt-6 space-y-3">
              {accent.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-3 text-sm font-medium text-white transition-transform duration-200 hover:translate-x-1"
                >
                  <svg
                    className={`mt-0.5 h-5 w-5 flex-none ${accent.classes.bulletIcon}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {bullet}
                </li>
              ))}
            </ul>

            <a
              href={ctaHref}
              className={`mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${accent.classes.ctaBg} ${accent.classes.ctaHover} ${accent.classes.ctaShadow} ${accent.classes.ctaShadowHover}`}
            >
              {accent.ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
