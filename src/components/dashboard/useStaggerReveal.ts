'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from '../home/gsapClient';

// See useParallax's SAFETY_TIMEOUT_MS: guarantees items are never left
// permanently invisible if ScrollTrigger never fires for some reason.
const SAFETY_TIMEOUT_MS = 4000;

/**
 * Same fade/slide-up entrance as useParallax's entranceRefs, but animates a
 * set of items as one staggered sequence instead of independently.
 */
export function useStaggerReveal(
  containerRef: RefObject<HTMLElement>,
  itemRefs: RefObject<HTMLElement>[],
  options?: { start?: string; deps?: unknown[] },
) {
  const start = options?.start ?? 'top 85%';
  // Extra values that should force a re-run — e.g. an id that changes when a
  // conditionally-rendered set of items (re)mounts after the initial pass,
  // so they get collected and staggered in too. Must stay a fixed length
  // across renders (React requirement for effect dependency arrays).
  const extraDeps = options?.deps ?? [];
  useLayoutEffect(() => {
    let cancelled = false;
    let rafId: number | undefined;
    let safetyTimer: number | undefined;
    let ctx: ReturnType<typeof gsap.context> | undefined;

    const revealAll = () => {
      const els = itemRefs.map((ref) => ref.current).filter((el): el is HTMLElement => Boolean(el));
      if (els.length) gsap.set(els, { opacity: 1, y: 0 });
    };

    const setup = () => {
      if (cancelled) return;

      // Same reasoning as useParallax: the container may be behind a
      // conditional render that hasn't mounted it yet on this pass, and a
      // stable ref object never triggers a re-run on its own — so poll until
      // the DOM node actually exists.
      if (!containerRef.current) {
        rafId = requestAnimationFrame(setup);
        return;
      }

      safetyTimer = window.setTimeout(revealAll, SAFETY_TIMEOUT_MS);

      try {
        ctx = gsap.context(() => {
          const mm = gsap.matchMedia();

          mm.add(
            { reduceMotion: '(prefers-reduced-motion: reduce)', noPreference: '(prefers-reduced-motion: no-preference)' },
            (context) => {
              const conditions = (context as unknown as { conditions: { reduceMotion: boolean } }).conditions;
              const els = itemRefs.map((ref) => ref.current).filter((el): el is HTMLElement => Boolean(el));
              if (!els.length) return;

              if (conditions.reduceMotion) {
                gsap.set(els, { opacity: 1, y: 0 });
                return;
              }

              gsap.fromTo(
                els,
                { opacity: 0, y: 32 },
                {
                  opacity: 1,
                  y: 0,
                  duration: 0.5,
                  ease: 'power2.out',
                  stagger: 0.12,
                  scrollTrigger: {
                    trigger: containerRef.current,
                    start,
                    toggleActions: 'play none none reverse',
                  },
                },
              );
            },
          );
        }, containerRef);
      } catch (err) {
        console.error('useStaggerReveal: GSAP setup failed, showing content without animation.', err);
        revealAll();
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, ...extraDeps]);
}
