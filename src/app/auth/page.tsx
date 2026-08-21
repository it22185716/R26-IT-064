"use client";

import React, { useEffect, useRef } from 'react';
import AuthForm from '../../components/AuthForm';
import RadialGauge from '../../components/dashboard/RadialGauge';
import { gsap } from '../../components/home/gsapClient';

const CHART_BARS = [38, 62, 45, 80, 58, 94, 70];

export default function AuthPage() {
  const mockupRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  // Continuous ambient float on the mockup card + a slower, offset drift on
  // the floating chip — purely decorative, so skipped entirely under
  // prefers-reduced-motion rather than jumping straight to a resting frame.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!mockupRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(mockupRef.current, {
        y: -14,
        duration: 3.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      if (chipRef.current) {
        gsap.to(chipRef.current, {
          y: 10,
          rotate: 4,
          duration: 4.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.3,
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 flex items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl animate-blob [animation-delay:2s]" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-rose-100/60 blur-3xl animate-blob [animation-delay:4s]" />
      </div>

      <a
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </a>

      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:flex md:items-center md:justify-center">
          <div className="relative w-full max-w-sm animate-fade-in-up py-10">
            {/* Ambient glow behind the mockup — same sky/indigo/violet family as
                the page's own background blobs. */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 animate-blob rounded-[4rem] bg-gradient-to-br from-sky-300 via-indigo-300 to-violet-300 opacity-50 blur-3xl [animation-delay:1s]"
            />

            {/* Tilted glass "product screenshot" card */}
            <div
              ref={mockupRef}
              className="relative rounded-[2rem] border border-white/50 bg-white/70 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.12),0_40px_80px_rgba(79,70,229,0.28)] ring-1 ring-inset ring-white/30 backdrop-blur-2xl [transform:perspective(1400px)_rotateY(-10deg)_rotateX(5deg)]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/50 via-transparent to-transparent"
              />

              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="ml-2 text-[11px] font-medium text-slate-400">Student Dashboard</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/70 p-3 ring-1 ring-inset ring-white/50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">92%</p>
                    <p className="text-[11px] text-slate-500">Accuracy</p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-3 ring-1 ring-inset ring-white/50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">14d</p>
                    <p className="text-[11px] text-slate-500">Plan active</p>
                  </div>
                </div>

                <div className="mt-4 flex h-16 items-end gap-1.5 rounded-xl bg-white/50 p-3 ring-1 ring-inset ring-white/40">
                  {CHART_BARS.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-4 rounded-xl bg-white/50 p-3 ring-1 ring-inset ring-white/40">
                  <div className="scale-[0.6] origin-left">
                    <RadialGauge percent={76} centerLabel="76%" label="" colorFrom="#38BDF8" colorTo="#6366F1" />
                  </div>
                  <div className="-ml-6">
                    <p className="text-xs font-semibold text-slate-700">Weekly progress</p>
                    <p className="text-[11px] text-slate-500">Trending up across all modules</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Single floating accent chip, echoing the same badge language
                used on GlassCard-based dashboard widgets. */}
            <div
              ref={chipRef}
              className="absolute -right-4 -top-4 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.45)] ring-1 ring-inset ring-white/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.2 4.8 5.3.6-4 3.6 1.1 5.2L12 14.8 7.4 17.2l1.1-5.2-4-3.6 5.3-.6Z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center animate-fade-in-up [animation-delay:100ms]">
          <div className="w-full max-w-md">
            <AuthForm />
            <p className="mt-4 text-center text-sm text-slate-500">
              Don&apos;t have an account? Contact your school admin to get one created.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
