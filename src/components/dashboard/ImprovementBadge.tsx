'use client';

import React from 'react';

// Shared emerald/improved vs amber/not-yet convention for post-test results —
// used by both the roster's compact indicator and the student detail page's
// full history table, so the two views read consistently. Amber (not
// emerald-vs-rose) is deliberate: this is progress tracking, not a grade.
export default function ImprovementBadge({ improved, children }: { improved: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        improved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {improved && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
        </svg>
      )}
      {children}
    </span>
  );
}
