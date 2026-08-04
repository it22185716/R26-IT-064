'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuthUser } from '../../hooks/useAuthUser';

const LINKS = [
  { href: '#nutrition', label: 'Meal and Nutrition' },
  { href: '#math', label: 'Math Weak Detection' },
  { href: '#reading', label: 'Reading Assessment' },
  { href: '#adaptive', label: 'Adaptive Content Delivery' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, profile, loading } = useAuthUser();
  const isLoggedIn = !loading && Boolean(user);
  const dashboardHref = profile?.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';

  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-white/25 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-inset ring-white/10 backdrop-blur-xl">
      <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 sm:px-6">
        <a href="#home" className="group flex items-center gap-3 justify-self-start transition-opacity duration-200 hover:opacity-80">
          <Image
            src="/logo.png"
            alt="Hayagiri International Buddhist College crest"
            width={80}
            height={80}
            priority
            className="h-20 w-20 shrink-0 rounded-full shadow-sm transition-transform duration-300 group-hover:scale-105"
          />
          <span className="flex flex-col leading-tight">
            <span className="bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
              Hayagiri AI Learning Platform
            </span>
            <span className="text-[11px] font-medium text-slate-500">Hayagiri International Buddhist College, Kandy</span>
          </span>
        </a>

        <nav className="hidden items-center justify-center gap-3 xl:flex 2xl:gap-5">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative whitespace-nowrap px-1 py-1.5 text-[13px] font-bold tracking-tight text-slate-700 transition-colors duration-200 hover:text-indigo-700 2xl:text-sm"
            >
              {link.label}
              <span className="pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-self-end gap-3">
          <div className="hidden items-center gap-3 xl:flex">
            {isLoggedIn ? (
              <a
                href={dashboardHref}
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 shadow-[0_1px_3px_rgba(79,70,229,0.35),0_8px_20px_rgba(79,70,229,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(79,70,229,0.45),0_16px_36px_rgba(79,70,229,0.38)] active:translate-y-0 active:scale-95"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[400ms] ease-out group-hover:translate-x-full"
                />
                Dashboard
              </a>
            ) : (
              <>
                <a
                  href="/auth"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300/60 bg-white/40 px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-white/40 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400/70 hover:bg-white/60 hover:text-slate-900 hover:shadow-md active:translate-y-0 active:scale-95"
                >
                  Sign In
                </a>
                <a
                  href="/auth"
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 shadow-[0_1px_3px_rgba(79,70,229,0.35),0_8px_20px_rgba(79,70,229,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(79,70,229,0.45),0_16px_36px_rgba(79,70,229,0.38)] active:translate-y-0 active:scale-95"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[400ms] ease-out group-hover:translate-x-full"
                  />
                  Login
                </a>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/40 bg-white/30 text-slate-700 backdrop-blur-md transition-colors hover:border-white/60 hover:bg-white/50 xl:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/30 bg-white/50 px-4 py-4 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 xl:hidden">
          <nav className="flex flex-col gap-4">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="group relative -mx-2 flex items-center rounded-lg px-2 py-1.5 text-sm font-bold tracking-tight text-slate-700 transition-all duration-200 hover:translate-x-1 hover:bg-slate-900/5 hover:text-indigo-700"
              >
                <span className="mr-2 h-1.5 w-1.5 shrink-0 scale-0 rounded-full bg-gradient-to-r from-sky-600 to-violet-600 transition-transform duration-300 group-hover:scale-100" />
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-white/30 pt-4">
              {isLoggedIn ? (
                <a
                  href={dashboardHref}
                  onClick={() => setOpen(false)}
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 shadow-[0_1px_3px_rgba(79,70,229,0.35),0_8px_20px_rgba(79,70,229,0.28)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(79,70,229,0.45),0_16px_36px_rgba(79,70,229,0.38)] active:scale-95"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[400ms] ease-out group-hover:translate-x-full"
                  />
                  Dashboard
                </a>
              ) : (
                <>
                  <a
                    href="/auth"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300/60 bg-white/40 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-white/40 backdrop-blur-md transition-all duration-200 hover:border-slate-400/70 hover:bg-white/60 hover:text-slate-900 hover:shadow-md active:scale-95"
                  >
                    Sign In
                  </a>
                  <a
                    href="/auth"
                    onClick={() => setOpen(false)}
                    className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 shadow-[0_1px_3px_rgba(79,70,229,0.35),0_8px_20px_rgba(79,70,229,0.28)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(79,70,229,0.45),0_16px_36px_rgba(79,70,229,0.38)] active:scale-95"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[400ms] ease-out group-hover:translate-x-full"
                    />
                    Login
                  </a>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
