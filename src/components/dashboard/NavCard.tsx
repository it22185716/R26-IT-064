'use client';

import { forwardRef, type ReactNode } from 'react';
import Link from 'next/link';

type Props = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** Marks the featured action — gets the solid accent icon tile instead of the neutral one. */
  primary?: boolean;
  /** Small status pill in the top-right corner, e.g. "3 taken" — omit for no badge. */
  badge?: string;
};

const NavCard = forwardRef<HTMLAnchorElement, Props>(
  ({ href, title, description, icon, primary, badge }, ref) => (
    <Link
      ref={ref}
      href={href}
      className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 opacity-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {badge}
        </span>
      )}

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200 ${
          primary ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          {icon}
        </svg>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{description}</p>

      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600">
        Open
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
