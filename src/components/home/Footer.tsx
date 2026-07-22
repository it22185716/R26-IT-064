export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-900 py-16 text-slate-300">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      >
        <div className="h-96 w-96 rounded-full bg-gradient-to-br from-sky-500/35 via-indigo-500/35 to-violet-500/35 blur-3xl" />
      </div>
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-500/20 to-lime-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/5 to-violet-500/10 p-10 text-center shadow-[0_8px_24px_rgba(0,0,0,0.35),0_32px_64px_rgba(79,70,229,0.18)] ring-1 ring-inset ring-white/10 backdrop-blur-2xl sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
          />
          <h2 className="text-3xl font-bold text-white">Ready to see the full picture of every student?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Sign in to explore nutrition guidance, math diagnostics, reading assessment, and adaptive content in one
            dashboard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/auth"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.15),0_12px_28px_rgba(0,0,0,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-[0_4px_14px_rgba(0,0,0,0.20),0_20px_40px_rgba(0,0,0,0.28)] active:translate-y-0 active:scale-95"
            >
              Get Started
            </a>
            <a
              href="/auth"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-lg hover:shadow-white/10 active:translate-y-0 active:scale-95"
            >
              Sign In
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-sm text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Hayagiri AI Learning Platform</span>
          <span>Built for Hayagiri International Buddhist College, Kandy</span>
        </div>
      </div>
    </footer>
  );
}
