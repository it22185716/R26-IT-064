'use client';

import React, { forwardRef } from 'react';
import { useCountUp } from './useCountUp';

type Props = {
  label: string;
  value: string;
  /** Tailwind gradient classes for the card background, e.g. "from-blue-500 to-indigo-600". */
  gradient: string;
  icon: React.ReactNode;
};

/**
 * Admin-overview variant of StatCard with a glassmorphic treatment layered on
 * top of the same gradient backgrounds. Kept as a separate component (rather
 * than a prop on StatCard) so the teacher/student/auth pages — which share
 * StatCard — are unaffected.
 */
const AdminStatCard = forwardRef<HTMLDivElement, Props>(({ label, value, gradient, icon }, ref) => {
  const valueRef = useCountUp(value);

  return (
    <div
      ref={ref}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-[0_2px_8px_rgba(15,23,42,0.10),0_12px_28px_rgba(15,23,42,0.14)] ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(15,23,42,0.14),0_20px_40px_rgba(15,23,42,0.18)] hover:ring-white/30 ${gradient}`}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-white/10 backdrop-blur-sm" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-opacity duration-300 group-hover:opacity-150"
      />
      <span
        aria-hidden
        style={{ animationIterationCount: 1 }}
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.65)_50%,transparent_60%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:animate-shimmer motion-reduce:hidden"
      />

      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-inset ring-white/25 transition-transform duration-200 group-hover:scale-105">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {icon}
        </svg>
      </div>
      <p ref={valueRef} className="relative mt-4 text-[1.75rem] font-bold leading-none tracking-tight">
        {value}
      </p>
      <p className="relative mt-1.5 text-sm font-medium text-white/75">{label}</p>
    </div>
  );
});

AdminStatCard.displayName = 'AdminStatCard';

export default AdminStatCard;
