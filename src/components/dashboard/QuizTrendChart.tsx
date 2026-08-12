'use client';

import { useId } from 'react';
import { QuizAttempt } from '../../lib/types';

type Props = {
  attempts: QuizAttempt[];
};

const WIDTH = 480;
const HEIGHT = 200;
const PAD_X = 28;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

export default function QuizTrendChart({ attempts }: Props) {
  const gradientId = useId();

  if (attempts.length === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center text-center">
        <p className="text-sm text-slate-500">No quiz attempts yet</p>
        <a href="/quiz" className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Take your first quiz →
        </a>
      </div>
    );
  }

  const points = attempts
    .slice()
    .sort((a, b) => a.completedAt - b.completedAt)
    .slice(-8)
    .map((a) => ({
      pct: a.maxScore > 0 ? Math.round((a.totalScore / a.maxScore) * 100) : 0,
      date: a.completedAt,
    }));

  if (points.length === 1) {
    const pct = points[0].pct;
    return (
      <div className="flex h-[200px] flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Overall score</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{pct}%</p>
        <p className="mt-1 text-sm text-slate-500">Your only attempt so far</p>
        <p className="mt-3 text-xs text-slate-400">Take another quiz to see your trend</p>
      </div>
    );
  }

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xFor = (i: number) => PAD_X + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yFor = (pct: number) => PAD_TOP + innerH - (pct / 100) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.pct)}`).join(' ');
  const areaPath = `${linePath} L ${xFor(points.length - 1)} ${PAD_TOP + innerH} L ${xFor(0)} ${PAD_TOP + innerH} Z`;

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[200px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLines.map((g) => (
        <g key={g}>
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={yFor(g)}
            y2={yFor(g)}
            stroke="#E2E8F0"
            strokeWidth={1}
            strokeDasharray={g === 0 ? undefined : '3 3'}
          />
          <text x={0} y={yFor(g) + 3} fontSize={9} fill="#94A3B8">
            {g}
          </text>
        </g>
      ))}

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke="#6366F1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xFor(i)} cy={yFor(p.pct)} r={3.5} fill="#4F46E5" stroke="white" strokeWidth={1.5} />
          <text x={xFor(i)} y={HEIGHT - 8} fontSize={9} fill="#94A3B8" textAnchor="middle">
            {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
          <title>
            {new Date(p.date).toLocaleDateString()} · {p.pct}%
          </title>
        </g>
      ))}
    </svg>
  );
}
