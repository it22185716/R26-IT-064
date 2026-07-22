'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from './gsapClient';
import { HERO_BG } from './content';

export default function ScrollBackground() {
  const layerARef = useRef<HTMLDivElement>(null);
  const layerBRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const layerA = layerARef.current;
    const layerB = layerBRef.current;
    if (!layerA || !layerB) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let showingA = true;

    const ctx = gsap.context(() => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-bg-section]'));

      sections.forEach((section) => {
        const from = section.dataset.bgFrom;
        const to = section.dataset.bgTo;
        if (!from || !to) return;

        const transition = () => {
          const incoming = showingA ? layerB : layerA;
          const outgoing = showingA ? layerA : layerB;
          incoming.style.background = `linear-gradient(135deg, ${from}, ${to})`;

          if (reduceMotion) {
            gsap.set(incoming, { opacity: 1 });
            gsap.set(outgoing, { opacity: 0 });
          } else {
            gsap.to(incoming, { opacity: 1, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
            gsap.to(outgoing, { opacity: 0, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
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

    return () => ctx.revert();
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-50 overflow-hidden">
      <div
        ref={layerARef}
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${HERO_BG.from}, ${HERO_BG.to})`, opacity: 1 }}
      />
      <div ref={layerBRef} className="absolute inset-0" style={{ opacity: 0 }} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 45%), radial-gradient(ellipse 80% 60% at 50% 100%, rgba(15,23,42,0.30) 0%, rgba(15,23,42,0) 60%)',
        }}
      />
    </div>
  );
}
