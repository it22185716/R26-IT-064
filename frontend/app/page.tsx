import React from 'react';

const steps = [
  {
    title: 'Take the quiz',
    description: 'Students answer a Grade 7 mathematics quiz covering categories like Arithmetic and Fractions.',
  },
  {
    title: 'Weighted scoring',
    description: 'Every answer is scored as correct, near-correct, or incorrect — not just right or wrong.',
  },
  {
    title: 'Weak area detected',
    description: 'The system compares category scores and flags the student’s weakest topic automatically.',
  },
];

const features = [
  {
    title: 'Category-wise analysis',
    description: 'Performance is broken down by mathematical category, not just an overall score.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V9m6 8V5M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
    ),
  },
  {
    title: 'Beyond right or wrong',
    description: 'A multi-level scoring model captures partial understanding instead of binary grading.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    title: 'Teacher & student dashboards',
    description: 'Track progress, quiz history, and detected weak areas in one clear view.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 4 4 5-6" />
    ),
  },
  {
    title: 'Secure sign-in',
    description: 'Student and teacher accounts are protected with secure authentication.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />
    ),
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
              M
            </div>
            <span className="text-lg font-semibold">Adaptive Math Diagnostics</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="/auth" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Login
            </a>
            <a
              href="/auth"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold bg-sky-600 text-white rounded-lg shadow-sm hover:bg-sky-700 transition-colors"
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 via-white to-white" />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid gap-14 lg:grid-cols-2 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1">
              AI-based weak student detection
            </span>

            <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Find every Grade 7 student’s weakest math topic — automatically.
            </h1>

            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              A quiz-based diagnostic that scores every answer beyond right or wrong, then
              pinpoints the mathematical category a student needs to work on most —
              so teachers can target support where it matters.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/auth"
                className="inline-flex items-center justify-center px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow hover:bg-sky-700 transition-colors"
              >
                Get Started
              </a>
              <a
                href="/auth"
                className="inline-flex items-center justify-center px-6 py-3 border border-slate-200 rounded-lg font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Student Login
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Category breakdown
                </h3>
                <span className="text-xs font-medium text-slate-400">Sample result</span>
              </div>

              <div className="mt-5 space-y-4">
                {[
                  { label: 'Arithmetic', score: 82 },
                  { label: 'Fractions', score: 46 },
                  { label: 'Geometry', score: 68 },
                  { label: 'Algebra basics', score: 74 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{row.label}</span>
                      <span className="text-slate-500">{row.score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.score < 50 ? 'bg-rose-500' : 'bg-sky-500'}`}
                        style={{ width: `${row.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700 font-medium">
                Weakest category detected: Fractions
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 text-slate-600">
            Three steps from quiz to a clear, actionable diagnosis.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative rounded-xl border border-slate-100 bg-slate-50/60 p-6">
              <div className="h-9 w-9 rounded-full bg-sky-600 text-white flex items-center justify-center font-semibold text-sm">
                {i + 1}
              </div>
              <h3 className="mt-4 font-semibold text-lg">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight">Platform highlights</h2>
            <p className="mt-3 text-slate-600">
              Built to give teachers and students a clearer picture of where support is needed.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl bg-white border border-slate-100 p-6 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="rounded-2xl bg-sky-600 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to see where your students stand?</h2>
          <p className="mt-3 text-sky-100 max-w-xl mx-auto">
            Get started in minutes — students take the quiz, teachers get the diagnosis.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/auth"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-sky-700 font-semibold rounded-lg shadow hover:bg-sky-50 transition-colors"
            >
              Get Started
            </a>
            <a
              href="/auth"
              className="inline-flex items-center justify-center px-6 py-3 border border-sky-400 text-white font-semibold rounded-lg hover:bg-sky-500 transition-colors"
            >
              Student Login
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Adaptive Math Diagnostics</span>
          <span>Part of the EduAI+ school management system</span>
        </div>
      </footer>
    </main>
  );
}
