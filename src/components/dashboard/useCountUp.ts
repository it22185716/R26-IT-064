'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '../home/gsapClient';

/**
 * Animates a stat value's numeric lead-in (e.g. "12" or "72%") counting up from 0.
 * Falls back to a plain fade for values that aren't a single clean number (dates,
 * fractions like "3/12", category labels, "—") so nothing renders half-animated.
 */
export function useCountUp(value: string) {
  const ref = useRef<HTMLParagraphElement>(null);
  const prevValue = useRef<string>('');

  useEffect(() => {
    const el = ref.current;
    if (!el || value === prevValue.current) return;
    prevValue.current = value;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = value;
      return;
    }

    const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
    const hasMoreDigits = match ? /\d/.test(match[2]) : true;

    if (!match || hasMoreDigits) {
      el.textContent = value;
      gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      return;
    }

    const target = parseFloat(match[1]);
    const suffix = match[2];
    const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;
    const counter = { val: 0 };

    gsap.fromTo(
      counter,
      { val: 0 },
      {
        val: target,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = `${counter.val.toFixed(decimals)}${suffix}`;
        },
      },
    );
  }, [value]);

  return ref;
}
