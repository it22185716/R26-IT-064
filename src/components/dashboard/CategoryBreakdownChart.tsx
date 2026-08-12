'use client';

import { formatCategory } from '../../lib/format';

type Props = {
  categoryScores: Record<string, number>;
  weakestCategory?: string;
};

export default function CategoryBreakdownChart({ categoryScores, weakestCategory }: Props) {
  const entries = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center text-center">
        <p className="text-sm text-slate-500">No quiz attempts yet</p>
        <a href="/quiz" className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Take your first quiz →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map(([category, score]) => {
        const isWeakest = category === weakestCategory;
        return (
          <div key={category}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${isWeakest ? 'text-rose-600' : 'text-slate-600'}`}>
                {formatCategory(category)}
              </span>
              <span className={`font-semibold ${isWeakest ? 'text-rose-600' : 'text-slate-500'}`}>{score}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${isWeakest ? 'bg-rose-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
