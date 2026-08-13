'use client';

import { useRef, type ComponentType, type RefObject } from 'react';
import { useParallax } from './useParallax';
import type { Accent } from './content';

export interface IllustrationProps {
  bgRef: RefObject<HTMLDivElement>;
  midRef: RefObject<HTMLDivElement>;
  fgRef: RefObject<HTMLDivElement>;
}

interface FeatureSectionProps {
  id: string;
  index: number;
  align: 'left' | 'right';
  accent: Accent;
  Illustration: ComponentType<IllustrationProps>;
}

export default function FeatureSection({ id, index, align, accent, Illustration }: FeatureSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const illustrationRef = useRef<HTMLDivElement>(null);
  const bgLayerRef = useRef<HTMLDivElement>(null);
  const midLayerRef = useRef<HTMLDivElement>(null);
  const fgLayerRef = useRef<HTMLDivElement>(null);

  useParallax({
    containerRef: sectionRef,
    layers: [
      { ref: bgLayerRef, speed: -25 },
      { ref: midLayerRef, speed: -55 },
      { ref: fgLayerRef, speed: -95 },
    ],
    entranceRefs: [textRef, illustrationRef],
  });

  const textOrder = align === 'left' ? 'lg:order-1' : 'lg:order-2';
  const illustrationOrder = align === 'left' ? 'lg:order-2' : 'lg:order-1';

  return (
    <section
      id={id}
      ref={sectionRef}
      data-bg-section
      data-bg-from={accent.bg.from}
      data-bg-to={accent.bg.to}
      className="relative scroll-mt-24 py-24 sm:py-32"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20">
        <div ref={textRef} className={`opacity-0 ${textOrder}`}>
          <span
            className={`inline-flex items-center gap-2 rounded-full backdrop-blur-sm ${accent.classes.badgeBg} ${accent.classes.badgeBorder} ${accent.classes.badgeText} px-3 py-1 text-xs font-semibold shadow-sm`}
          >
            Module {String(index).padStart(2, '0')} · {accent.kicker}
          </span>

          <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className={`bg-clip-text text-transparent ${accent.classes.gradientText}`}>{accent.headline}</span>
          </h2>

          <p className="mt-5 text-lg leading-relaxed text-slate-700">{accent.description}</p>

          <ul className="mt-6 space-y-3">
            {accent.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-3 text-sm font-medium text-slate-700 transition-transform duration-200 hover:translate-x-1"
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
            href={accent.ctaHref}
            className={`mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${accent.classes.ctaBg} ${accent.classes.ctaHover} ${accent.classes.ctaShadow} ${accent.classes.ctaShadowHover}`}
          >
            {accent.ctaLabel}
          </a>
        </div>

        <div ref={illustrationRef} className={`opacity-0 ${illustrationOrder}`}>
          <Illustration bgRef={bgLayerRef} midRef={midLayerRef} fgRef={fgLayerRef} />
        </div>
      </div>
    </section>
  );
}
