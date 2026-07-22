'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from './gsapClient';

export interface ParallaxLayerConfig {
  ref: RefObject<HTMLElement>;
  /** Pixels the layer travels across the section's full scroll range. Larger (more negative) = faster/foreground. */
  speed: number;
}

interface UseParallaxOptions {
  containerRef: RefObject<HTMLElement>;
  layers?: ParallaxLayerConfig[];
  entranceRefs?: RefObject<HTMLElement>[];
}

export function useParallax({ containerRef, layers = [], entranceRefs = [] }: UseParallaxOptions) {
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
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

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);
}
