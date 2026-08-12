'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from './gsapClient';

export interface ParallaxLayerConfig {
  ref: RefObject<HTMLElement>;
  /** Pixels the layer travels across the section's full scroll range. Larger (more negative) = faster/foreground. */
  speed: number;
}

export interface SlideEntranceConfig {
  ref: RefObject<HTMLElement>;
  /** Horizontal pixels the element travels in from (negative = from the left, positive = from the right). */
  fromX: number;
}

interface UseParallaxOptions {
  containerRef: RefObject<HTMLElement>;
  layers?: ParallaxLayerConfig[];
  entranceRefs?: RefObject<HTMLElement>[];
  /** Like entranceRefs, but slides in horizontally (triggered off containerRef so paired elements converge together). */
  slideRefs?: SlideEntranceConfig[];
}

// Last-resort guarantee: if ScrollTrigger never fires for some reason (an
// unexpected runtime error, an edge case we didn't anticipate, etc.),
// entrance-gated content still becomes visible on its own rather than staying
// hidden forever. Animation should enhance visibility, never gate it.
const SAFETY_TIMEOUT_MS = 4000;

export function useParallax({ containerRef, layers = [], entranceRefs = [], slideRefs = [] }: UseParallaxOptions) {
  useLayoutEffect(() => {
    let cancelled = false;
    let rafId: number | undefined;
    let safetyTimer: number | undefined;
    let ctx: ReturnType<typeof gsap.context> | undefined;

    const revealAll = () => {
      entranceRefs.forEach((ref) => {
        if (ref.current) gsap.set(ref.current, { opacity: 1, y: 0 });
      });
      slideRefs.forEach(({ ref }) => {
        if (ref.current) gsap.set(ref.current, { opacity: 1, x: 0 });
      });
    };

    const setup = () => {
      if (cancelled) return;

      // The container is often behind a conditional render (e.g. an auth/
      // loading gate) that hasn't mounted it yet on this pass. Since a stable
      // ref object never changes identity, this effect won't naturally
      // re-run once the DOM node shows up later — so poll a few frames until
      // it actually exists instead of silently giving up.
      if (!containerRef.current) {
        rafId = requestAnimationFrame(setup);
        return;
      }

      safetyTimer = window.setTimeout(revealAll, SAFETY_TIMEOUT_MS);

      try {
        ctx = gsap.context(() => {
          const mm = gsap.matchMedia();

          mm.add(
            {
              reduceMotion: '(prefers-reduced-motion: reduce)',
              isDesktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
            },
            (context) => {
              const conditions = (context as unknown as { conditions: { reduceMotion: boolean; isDesktop: boolean } })
                .conditions;

              entranceRefs.forEach((ref) => {
                if (!ref.current) return;
                if (conditions.reduceMotion) {
                  gsap.set(ref.current, { opacity: 1, y: 0 });
                } else {
                  gsap.fromTo(
                    ref.current,
                    { opacity: 0, y: 32 },
                    {
                      opacity: 1,
                      y: 0,
                      duration: 0.35,
                      ease: 'power2.out',
                      scrollTrigger: {
                        trigger: ref.current,
                        start: 'top 85%',
                        toggleActions: 'play none none reverse',
                      },
                    },
                  );
                }
              });

              slideRefs.forEach(({ ref, fromX }) => {
                if (!ref.current) return;
                if (conditions.reduceMotion) {
                  gsap.set(ref.current, { opacity: 1, x: 0 });
                } else {
                  gsap.fromTo(
                    ref.current,
                    { opacity: 0, x: fromX },
                    {
                      opacity: 1,
                      x: 0,
                      duration: 0.7,
                      ease: 'power3.out',
                      scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top 75%',
                        toggleActions: 'play none none reverse',
                      },
                    },
                  );
                }
              });

              if (conditions.isDesktop) {
                layers.forEach(({ ref, speed }) => {
                  if (!ref.current) return;
                  gsap.to(ref.current, {
                    y: speed,
                    ease: 'none',
                    scrollTrigger: {
                      trigger: containerRef.current,
                      start: 'top bottom',
                      end: 'bottom top',
                      scrub: true,
                    },
                  });
                });
              }
            },
          );
        }, containerRef);
      } catch (err) {
        console.error('useParallax: GSAP setup failed, showing content without animation.', err);
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
  }, [containerRef]);
}
