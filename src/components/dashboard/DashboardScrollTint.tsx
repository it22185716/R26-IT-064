'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../home/gsapClient';

/**
 * Rich radial color wash that cross-fades as the user scrolls through
 * `[data-dashboard-tint]` sections (tagged via `data-tint-color`, a full
 * rgba() string). Sits above DashboardBackground's blobs, below content.
 * Same onEnter/onEnterBack cross-fade technique as the homepage's
 * ScrollBackground — each transition is a smooth 1s eased tween (not an
 * abrupt swap), just triggered at discrete scroll points rather than
 * continuously scrubbed.
 */
export default function DashboardScrollTint() {
  const layerARef = useRef<HTMLDivElement>(null);
  const layerBRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let cancelled = false;
    let rafId: number | undefined;
    let ctx: ReturnType<typeof gsap.context> | undefined;

    const setup = () => {
      if (cancelled) return;

      if (!layerARef.current || !layerBRef.current) {
        rafId = requestAnimationFrame(setup);
        return;
      }

      const layerA = layerARef.current;
      const layerB = layerBRef.current;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let showingA = true;

      ctx = gsap.context(() => {
        const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-dashboard-tint]'));

        sections.forEach((section) => {
          const color = section.dataset.tintColor;

          const transition = () => {
            const incoming = showingA ? layerB : layerA;
            const outgoing = showingA ? layerA : layerB;
            // Wide, mostly-opaque core with a short falloff — reads as a
            // concentrated wash of color rather than a diffuse haze.
            incoming.style.background = color
              ? `radial-gradient(ellipse 120% 100% at 50% 30%, ${color} 0%, ${color} 45%, transparent 85%)`
              : 'transparent';

            if (reduceMotion) {
              gsap.set(incoming, { opacity: 1 });
              gsap.set(outgoing, { opacity: 0 });
            } else {
              gsap.to(incoming, { opacity: 1, duration: 1, ease: 'power2.out', overwrite: 'auto' });
              gsap.to(outgoing, { opacity: 0, duration: 1, ease: 'power2.out', overwrite: 'auto' });
            }

            showingA = !showingA;
          };

          ScrollTrigger.create({
            trigger: section,
            start: 'top center',
            end: 'bottom center',
            onEnter: transition,
            onEnterBack: transition,
          });
        });
      });
    };

    setup();

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      ctx?.revert();
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div ref={layerARef} className="absolute inset-0" style={{ opacity: 0 }} />
      <div ref={layerBRef} className="absolute inset-0" style={{ opacity: 0 }} />
    </div>
  );
}
