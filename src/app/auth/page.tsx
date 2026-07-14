"use client";

import React, { useState } from 'react';
import AuthForm from '../../components/AuthForm';

const highlights = [
  'Weighted, category-wise scoring',
  'Automatic weak-area detection',
  'Teacher & student dashboards',
];

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

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
        <div className="hidden md:block p-8 animate-fade-in-up">
          <div className="h-10 w-10 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
            M
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Join Adaptive Math Diagnostics</h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Secure, fast, and built for teachers and students to find weak areas early.
          </p>

          <ul className="mt-8 space-y-4">
            {highlights.map((item, i) => (
              <li
                key={item}
                className="flex items-center gap-3 text-slate-700 animate-fade-in-up"
                style={{ animationDelay: `${150 + i * 100}ms` }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center animate-fade-in-up [animation-delay:100ms]">
          <div className="w-full max-w-md">
            <div className="relative flex mb-6 rounded-xl bg-slate-100 p-1">
              <div
                className="absolute inset-y-1 w-1/2 rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: mode === 'login' ? 'translateX(0%)' : 'translateX(100%)' }}
              />
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`relative z-10 w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  mode === 'login' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`relative z-10 w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  mode === 'signup' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Register
              </button>
            </div>

            <AuthForm mode={mode} />
          </div>
        </div>
      </div>
    </main>
  );
}
