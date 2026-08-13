'use client';

import { forwardRef, type ReactNode } from 'react';
import Link from 'next/link';

type Accent = 'indigo' | 'emerald' | 'amber' | 'violet' | 'slate';

const ACCENT_TILE: Record<Accent, string> = {
  indigo: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-indigo-500/30',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30',
  violet: 'bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-fuchsia-500/30',
  slate: 'bg-slate-100 text-slate-600 shadow-none',
};

// Soft tinted card background per accent — the whole tile carries color now,
// not just the icon chip, so "Quick actions" reads as four distinct colorful
// tiles rather than four identical white cards.
const ACCENT_CARD: Record<Accent, string> = {
  indigo: 'border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white hover:border-indigo-200',
  emerald: 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white hover:border-emerald-200',
  amber: 'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white hover:border-amber-200',
  violet: 'border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-white to-white hover:border-fuchsia-200',
  slate: 'border-slate-200/70 bg-white hover:border-slate-300',
};

const ACCENT_GLOW: Record<Accent, string> = {
  indigo: 'from-indigo-500/15',
  emerald: 'from-emerald-500/15',
  amber: 'from-amber-500/15',
  violet: 'from-fuchsia-500/15',
  slate: 'from-transparent',
};

// The featured action gets a fully-saturated gradient card instead of a tint.
const PRIMARY_CARD: Record<Accent, string> = {
  indigo: 'border-transparent bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600',
  emerald: 'border-transparent bg-gradient-to-br from-emerald-600 to-teal-600',
  amber: 'border-transparent bg-gradient-to-br from-amber-600 to-orange-600',
  violet: 'border-transparent bg-gradient-to-br from-purple-600 to-fuchsia-600',
  slate: 'border-transparent bg-slate-900',
};

// Badge pill colors tied to the same accent family, rather than one flat
// neutral gray for every card — the pill should read as part of the card.
const ACCENT_BADGE: Record<Accent, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
  violet: 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-100',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
};

type Props = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** Marks the featured action — gets a bold full-color card instead of a tint. */
  primary?: boolean;
  /** Small status pill in the top-right corner, e.g. "3 taken" — omit for no badge. */
  badge?: string;
  /** Card tint + icon tile + hover-glow color. Defaults to a neutral slate tile. */
  accent?: Accent;
  /** Extra classes on the root — e.g. a grid col-span for bento-style layouts. */
  className?: string;
};

const NavCard = forwardRef<HTMLAnchorElement, Props>(
  ({ href, title, description, icon, primary, badge, accent = 'slate', className = '' }, ref) => (
    <Link
      ref={ref}
      href={href}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border p-5 opacity-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(15,23,42,0.10),0_24px_48px_rgba(15,23,42,0.14)] ${
        primary ? PRIMARY_CARD[accent] : ACCENT_CARD[accent]
      } ${className}`}
    >
      {!primary && (
        <span
          aria-hidden
          className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${ACCENT_GLOW[accent]} to-transparent opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100`}
        />
      )}
      {primary && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-[600ms] ease-out group-hover:translate-x-full"
        />
      )}

      {badge && (
        <span
          className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            primary ? 'bg-white/15 text-white' : ACCENT_BADGE[accent]
          }`}
        >
          {badge}
        </span>
      )}

      <div
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl shadow-lg ring-1 ring-inset ring-white/25 transition-transform duration-200 group-hover:scale-105 ${
          primary ? 'bg-white/15 text-white shadow-none' : `text-white ${ACCENT_TILE[accent]}`
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          {icon}
        </svg>
      </div>

      <h3 className={`relative mt-4 text-sm font-semibold ${primary ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
      <p className={`relative mt-1 flex-1 text-sm leading-relaxed ${primary ? 'text-white/75' : 'text-slate-500'}`}>
        {description}
      </p>

      <span
        className={`relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${
          primary ? 'text-white' : 'text-slate-900'
        }`}
      >
        {primary ? 'Start now' : 'Open'}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </span>
    </Link>
  ),
);

NavCard.displayName = 'NavCard';

export default NavCard;
