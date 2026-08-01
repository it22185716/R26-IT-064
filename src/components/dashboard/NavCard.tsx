'use client';

import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';

type Props = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** Icon badge gradient, e.g. "bg-gradient-to-br from-blue-500 to-indigo-600". */
  accent: string;
  /** Soft colored shadow matching the accent hue, e.g. "shadow-lg shadow-blue-500/20". */
  glow: string;
  /** Marks the primary/featured action — gets a pulsing icon glow in the accent's own hue. */
  primary?: boolean;
  /** "r g b" triplet matching the accent color, used for the primary pulse glow. */
  pulseRgb?: string;
  /** Small corner pill, e.g. "3 taken" or "Healthy range" — omit for no badge. */
  badge?: string;
};

const NavCard = forwardRef<HTMLAnchorElement, Props>(
  ({ href, title, description, icon, accent, glow, primary, pulseRgb, badge }, ref) => (
    <Link
      ref={ref}
      href={href}
      className="group relative block overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-6 opacity-0 shadow-[0_8px_30px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:border-gold-300/60 hover:bg-white/90 hover:shadow-[0_10px_24px_rgba(122,31,43,0.16),0_32px_64px_rgba(201,162,39,0.20)] active:scale-[0.99]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"
      />
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-maroon-600/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
          {badge}
        </span>
      )}
      <div className="relative">
        <div
          style={primary && pulseRgb ? ({ '--pulse-glow-rgb': pulseRgb } as CSSProperties) : undefined}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${accent} ${glow} ${
            primary ? 'animate-pulse-glow' : ''
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {icon}
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-maroon-600 transition-transform duration-200 group-hover:translate-x-1">
          Open
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </span>
      </div>
    </Link>
  ),
);

NavCard.displayName = 'NavCard';

export default NavCard;
