"use client";

import React, { useRef } from 'react';
import DashboardBackground from './dashboard/DashboardBackground';
import DashboardHeader from './dashboard/DashboardHeader';
import { UserRole } from '../lib/types';

type Props = {
  role: UserRole;
  title: string;
  subtitle?: string;
  userName?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
};

export default function DashboardShell({ role, title, subtitle, userName, action, backHref, backLabel, children }: Props) {
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="relative min-h-screen">
      <DashboardBackground scrollContainerRef={mainRef} />

      <div className="relative flex min-h-screen flex-col">
        <DashboardHeader role={role} title={title} userName={userName || ''} />

        <main ref={mainRef} className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 md:px-10 md:py-10">
            {backHref && (
              <a
                href={backHref}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {backLabel || 'Back'}
              </a>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/50 bg-white/50 px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.05),0_16px_36px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-white/30 backdrop-blur-xl sm:px-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
              </div>
              {action}
            </div>

            <div className="mt-6 space-y-6 md:mt-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
