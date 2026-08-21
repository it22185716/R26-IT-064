"use client";

import React, { useEffect, useRef } from 'react';
import AuthForm from '../../components/AuthForm';
import RadialGauge from '../../components/dashboard/RadialGauge';
import { gsap } from '../../components/home/gsapClient';

const CHART_DATA = [
  { day: 'Mon', val: 42 },
  { day: 'Tue', val: 68 },
  { day: 'Wed', val: 52 },
  { day: 'Thu', val: 88 },
  { day: 'Fri', val: 64 },
  { day: 'Sat', val: 96 },
  { day: 'Sun', val: 78 },
];

export default function AuthPage() {
  const mockupRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!mockupRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(mockupRef.current, {
        y: -12,
        duration: 3.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      if (chipRef.current) {
        gsap.to(chipRef.current, {
          y: 8,
          rotate: 6,
          duration: 4.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.2,
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-900/5 flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans selection:bg-sky-500 selection:text-white">
      {/* Dynamic Background Ambient Blobs & Mesh Grid */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-sky-300/30 blur-[130px] animate-blob" />
        <div className="absolute top-1/2 -right-32 h-[34rem] w-[34rem] rounded-full bg-indigo-400/25 blur-[140px] animate-blob [animation-delay:3s]" />
        <div className="absolute -bottom-32 left-1/3 h-[28rem] w-[28rem] rounded-full bg-violet-300/25 blur-[120px] animate-blob [animation-delay:6s]" />
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />
      </div>

      {/* Header back to home glass pill */}
      <a
        href="/"
        className="absolute top-5 left-5 sm:top-8 sm:left-8 z-30 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md hover:bg-white hover:text-slate-900 hover:shadow-md hover:scale-[1.02] transition-all duration-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </a>

      {/* Main split grid container */}
      <div className="max-w-5xl w-full grid lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto pt-14 lg:pt-0">
        
        {/* Left Column: Tilted 3D Student Dashboard Showcase Card */}
        <div className="hidden lg:flex lg:col-span-6 lg:items-center lg:justify-center">
          <div className="relative w-full max-w-md animate-fade-in-up py-6">
            
            {/* Ambient glow directly behind the product card */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 animate-blob rounded-[4rem] bg-gradient-to-br from-sky-400/40 via-indigo-400/40 to-violet-400/40 opacity-70 blur-3xl [animation-delay:1s]"
            />

            {/* AI Engine Floating Highlight Tag */}
            <div className="absolute -top-3 left-6 z-20 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1 text-xs font-bold text-indigo-900 shadow-sm backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              ✨ AI Adaptive Learning Engine
            </div>

            {/* 3D Glass Card Container */}
            <div
              ref={mockupRef}
              className="relative rounded-[2.25rem] border border-white/80 bg-white/75 p-6 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12),0_15px_30px_-10px_rgba(99,102,241,0.2)] ring-1 ring-inset ring-white/60 backdrop-blur-2xl [transform:perspective(1400px)_rotateY(-9deg)_rotateX(4deg)] transition-transform duration-500 hover:rotate-0"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[2.25rem] bg-gradient-to-br from-white/60 via-transparent to-transparent"
              />

              <div className="relative space-y-4">
                {/* Window header */}
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-400 shadow-sm" />
                    <span className="h-3 w-3 rounded-full bg-amber-400 shadow-sm" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-sm" />
                    <span className="ml-2.5 text-xs font-bold text-slate-700 tracking-wide">Student Dashboard</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Live Demo
                  </span>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-white/80 shadow-sm ring-1 ring-slate-900/5">
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 text-white shadow-md shadow-sky-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">+4.2%</span>
                    </div>
                    <p className="mt-2.5 text-xl font-extrabold tracking-tight text-slate-900">92%</p>
                    <p className="text-[11px] font-medium text-slate-500">Overall Accuracy</p>
                  </div>

                  <div className="rounded-2xl bg-white/80 p-3.5 border border-white/80 shadow-sm ring-1 ring-slate-900/5">
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">🔥 Streak</span>
                    </div>
                    <p className="mt-2.5 text-xl font-extrabold tracking-tight text-slate-900">14d</p>
                    <p className="text-[11px] font-medium text-slate-500">Active Learning</p>
                  </div>
                </div>

                {/* Weekly Bar Chart Widget */}
                <div className="rounded-2xl bg-white/70 p-4 border border-white/80 shadow-sm ring-1 ring-slate-900/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Activity Overview</span>
                    <span className="text-[10px] text-slate-400 font-medium">This week</span>
                  </div>
                  <div className="flex h-16 items-end gap-2 pt-2">
                    {CHART_DATA.map((item, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 via-indigo-400 to-sky-400 transition-all duration-300 group-hover:brightness-110"
                          style={{ height: `${item.val}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] font-semibold text-slate-400 px-0.5">
                    {CHART_DATA.map((item, i) => (
                      <span key={i}>{item.day}</span>
                    ))}
                  </div>
                </div>

                {/* Radial Gauge progress preview */}
                <div className="flex items-center gap-4 rounded-2xl bg-white/70 p-3.5 border border-white/80 shadow-sm ring-1 ring-slate-900/5">
                  <div className="scale-[0.62] origin-left -my-4 -ml-2">
                    <RadialGauge percent={76} centerLabel="76%" label="" colorFrom="#38BDF8" colorTo="#6366F1" />
                  </div>
                  <div className="-ml-6">
                    <p className="text-xs font-bold text-slate-800">Weekly Mastery Goal</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Trending up across all 4 core AI modules</p>
                    <div className="mt-2 flex gap-1.5">
                      <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Math Gap • 88%</span>
                      <span className="text-[9px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">Reading AI • 94%</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Floating 3D Accent Badge */}
            <div
              ref={chipRef}
              className="absolute -right-3 -top-3 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-600 to-sky-500 text-white shadow-[0_12px_28px_rgba(99,102,241,0.45)] ring-2 ring-white/80 transition-transform hover:scale-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-300 drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: AuthForm Container */}
        <div className="lg:col-span-6 flex flex-col items-center w-full max-w-md mx-auto animate-fade-in-up [animation-delay:100ms]">
          <AuthForm />
          
          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 font-medium bg-white/60 border border-slate-200/70 py-2.5 px-4 rounded-2xl backdrop-blur-md shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span>Don&apos;t have an account? Contact your school admin to get one created.</span>
          </div>
        </div>

      </div>
    </main>
  );
}

