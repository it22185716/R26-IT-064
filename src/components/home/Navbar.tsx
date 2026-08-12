'use client';

import { useEffect, useState } from 'react';
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
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, loading } = useAuthUser();
  const isLoggedIn = !loading && Boolean(user);
  const dashboardHref = profile?.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-40 w-full transition-all duration-500 ease-out ${
        scrolled ? 'px-3 pt-3 sm:px-4' : 'px-0 pt-0'
      }`}
    >
      <header
        className={`mx-auto w-full overflow-hidden border transition-all duration-500 ease-out ${
          scrolled
            ? 'max-w-6xl rounded-3xl border-white/20 bg-white/25 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-inset ring-white/10 backdrop-blur-xl'
            : 'max-w-full rounded-none border-transparent bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_20px_rgba(15,23,42,0.08)] ring-0'
        }`}
      >
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 sm:px-5">
        <a href="#home" className="group flex min-w-0 items-center gap-2.5 justify-self-start transition-opacity duration-200 hover:opacity-80">
          <Image
            src="/logo.png"
            alt="Hayagiri International Buddhist College crest"
            width={48}
            height={48}
            priority
            className="h-11 w-11 shrink-0 rounded-full shadow-sm transition-transform duration-300 group-hover:scale-105"
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 bg-clip-text text-sm font-extrabold tracking-tight text-transparent sm:text-lg">
              Hayagiri AI Learning Platform
            </span>
            <span className="hidden truncate text-[10px] font-medium text-slate-500 sm:block">
              Hayagiri International Buddhist College, Kandy
            </span>
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
            {loading ? (
              <span
                aria-hidden
                className="h-9 w-28 animate-pulse rounded-lg bg-white/30 ring-1 ring-inset ring-white/40"
              />
            ) : isLoggedIn ? (
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
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 shadow-[0_1px_3px_rgba(79,70,229,0.35),0_8px_20px_rgba(79,70,229,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(79,70,229,0.45),0_16px_36px_rgba(79,70,229,0.38)] active:translate-y-0 active:scale-95"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[400ms] ease-out group-hover:translate-x-full"
                  />
                  Sign In
                </a>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white/60 text-slate-700 backdrop-blur-md transition-colors hover:border-slate-300 hover:bg-white xl:hidden"
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
              {loading ? (
                <span
                  aria-hidden
                  className="h-10 w-full animate-pulse rounded-lg bg-white/30 ring-1 ring-inset ring-white/40"
                />
              ) : isLoggedIn ? (
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
                    className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 shadow-[0_1px_3px_rgba(79,70,229,0.35),0_8px_20px_rgba(79,70,229,0.28)] transition-all duration-200 hover:shadow-[0_2px_6px_rgba(79,70,229,0.45),0_16px_36px_rgba(79,70,229,0.38)] active:scale-95"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[400ms] ease-out group-hover:translate-x-full"
                    />
                    Sign In
                  </a>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
      </header>
    </div>
  );
}
