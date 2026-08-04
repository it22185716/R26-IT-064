'use client';

import { useId, useLayoutEffect, useRef } from 'react';
import { gsap } from '../home/gsapClient';

type Props = {
  /** 0–100 fill percentage. */
  percent: number;
  /** Text shown in the center — pass a formatted value, not necessarily "percent". */
  centerLabel: string;
  label: string;
  colorFrom: string;
  colorTo: string;
};

export default function RadialGauge({ percent, centerLabel, label, colorFrom, colorTo }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const gradientId = useId();
  const circleRef = useRef<SVGCircleElement>(null);

  // Draw-in from empty on mount/whenever the target value changes, rather
  // than appearing already filled. useLayoutEffect (not useEffect) so GSAP's
  // "from" state is applied before the browser paints — otherwise the ring
  // would flash at its final value for a frame before resetting to empty.
  useLayoutEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { strokeDashoffset: offset });
      return;
    }
    gsap.fromTo(el, { strokeDashoffset: circumference }, { strokeDashoffset: offset, duration: 0.8, ease: 'power2.out' });
  }, [offset, circumference]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="9" />
          <circle
            ref={circleRef}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-slate-900">{centerLabel}</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{label}</p>
    </div>
  );
}
