'use client';

import { forwardRef, type ReactNode } from 'react';
import Link from 'next/link';

type Props = {
  href: string;
  title: string;
  description: string;
  accent: string;
  icon: ReactNode;
};

const NavCard = forwardRef<HTMLAnchorElement, Props>(({ href, title, description, accent, icon }, ref) => (
  <Link
    ref={ref}
    href={href}
    className="group relative block overflow-hidden rounded-2xl border border-white/50 bg-white/50 p-6 opacity-0 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_20px_45px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/30 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/80 hover:bg-white/65 hover:shadow-[0_8px_20px_rgba(79,70,229,0.16),0_32px_64px_rgba(79,70,229,0.20)]"
  >
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"
    />
    <div className="relative">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-inner transition-transform duration-300 group-hover:scale-110 ${accent}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {icon}
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 transition-transform duration-200 group-hover:translate-x-1">
        Open
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </span>
    </div>
  </Link>
));

NavCard.displayName = 'NavCard';

export default NavCard;
