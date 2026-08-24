"use client";

import React from 'react';
import { MealPlan } from '../../lib/types';

// Teacher-side visual layer for meal plan growth history. Deliberately
// forked from GrowthHistoryView (used by the student-facing history page)
// rather than sharing it — the teacher page wraps this in its own GlassCard
// and header, and needs the indigo/sky/emerald teacher palette plus a
// summary-stat row that the student view doesn't have. Chart math and delta
// calculations are copied as-is, not altered.

const CHART_W = 320;
const CHART_H = 120;
const CHART_PAD_X = 12;
const CHART_PAD_Y = 18;

type Tone = 'sky' | 'indigo' | 'emerald' | 'amber';

// Static class strings (not template-built) so Tailwind's compiler can see
// and keep every one of these — a `bg-${tone}-50` string wouldn't survive purge.
const TONE_STYLES: Record<
  Tone,
  {
    chipBg: string;
    chipRing: string;
    chipLabel: string;
    cardBg: string;
    cardBorder: string;
    cardGlow: string;
    line: string;
    grid: string;
    accentText: string;
  }
> = {
  sky: {
    chipBg: 'bg-sky-100',
    chipRing: 'ring-sky-300/60',
    chipLabel: 'text-sky-700',
    cardBg: 'bg-sky-100/50',
    cardBorder: 'border-sky-200',
    cardGlow: 'shadow-md shadow-sky-500/15',
    line: '#0284C7',
    grid: '#BAE6FD',
    accentText: 'text-sky-700',
  },
  indigo: {
    chipBg: 'bg-indigo-100',
    chipRing: 'ring-indigo-300/60',
    chipLabel: 'text-indigo-700',
    cardBg: 'bg-indigo-100/50',
    cardBorder: 'border-indigo-200',
    cardGlow: 'shadow-md shadow-indigo-500/15',
    line: '#4F46E5',
    grid: '#C7D2FE',
    accentText: 'text-indigo-700',
  },
  emerald: {
    chipBg: 'bg-emerald-100',
    chipRing: 'ring-emerald-300/60',
    chipLabel: 'text-emerald-700',
    cardBg: 'bg-emerald-100/50',
    cardBorder: 'border-emerald-200',
    cardGlow: 'shadow-md shadow-emerald-500/15',
    line: '#059669',
    grid: '#A7F3D0',
    accentText: 'text-emerald-700',
  },
  amber: {
    chipBg: 'bg-amber-100',
    chipRing: 'ring-amber-300/60',
    chipLabel: 'text-amber-700',
    cardBg: 'bg-amber-100/50',
    cardBorder: 'border-amber-200',
    cardGlow: 'shadow-md shadow-amber-500/15',
    line: '#D97706',
    grid: '#FDE68A',
    accentText: 'text-amber-700',
  },
};

// Same status→color mapping as the teacher meal-plan overview table
// (src/app/dashboard/teacher/meal-plan/page.tsx) — kept identical for consistency.
function statusBadgeClasses(status: string): string {
  switch (status) {
    case 'Normal':
      return 'bg-emerald-50 text-emerald-700';
    case 'Overweight':
      return 'bg-amber-50 text-amber-700';
    case 'Obesity':
    case 'Severe Thinness':
      return 'bg-red-50 text-red-700';
    case 'Thinness':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

// BMI's tone is descriptive, not a judgment call — Normal reads as emerald,
// anything else reads as amber ("worth a look"), same spirit as statusBadgeClasses
// but collapsed to the two tones this app's teacher palette uses for charts/chips.
function bmiTone(status: string | undefined): Tone {
  return status === 'Normal' ? 'emerald' : 'amber';
}

type ChartConfig = {
  title: string;
  tone: Tone;
  unit: string;
  format: (v: number) => string;
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function deltaColorClass(n: number): string {
  if (n > 0) return 'text-emerald-600';
  if (n < 0) return 'text-rose-600';
  return 'text-slate-400';
}

function trendArrow(n: number): string {
  if (n > 0) return '▲';
  if (n < 0) return '▼';
  return '–';
}

function buildChartPoints(values: number[]): { x: number; y: number }[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const paddedMin = min - range * 0.2;
  const paddedMax = max + range * 0.2;
  const span = paddedMax - paddedMin || 1;

  return values.map((v, i) => {
    const x = values.length === 1 ? CHART_W / 2 : CHART_PAD_X + (i / (values.length - 1)) * (CHART_W - CHART_PAD_X * 2);
    const y = CHART_H - CHART_PAD_Y - ((v - paddedMin) / span) * (CHART_H - CHART_PAD_Y * 2);
    return { x, y };
  });
}

function TrendChart({ values, tone, label }: { values: number[]; tone: Tone; label: string }) {
  const points = buildChartPoints(values);
  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const gridYs = [0.25, 0.5, 0.75].map((f) => CHART_PAD_Y + f * (CHART_H - CHART_PAD_Y * 2));
  const { line, grid } = TONE_STYLES[tone];

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-24 w-full" preserveAspectRatio="none" role="img" aria-label={`${label} trend chart`}>
      {gridYs.map((y, i) => (
        <line key={i} x1={CHART_PAD_X} y1={y} x2={CHART_W - CHART_PAD_X} y2={y} stroke={grid} strokeWidth={1} />
      ))}
      <polyline points={pointsAttr} fill="none" stroke={line} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={line} stroke="white" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

function SummaryStat({ label, value, delta, unit, tone }: { label: string; value: string; delta: number; unit: string; tone: Tone }) {
  const { chipBg, chipRing, chipLabel } = TONE_STYLES[tone];
  return (
    <div className={`rounded-2xl ${chipBg} p-4 text-center ring-1 ring-inset ${chipRing}`}>
      <p className="text-2xl font-bold tracking-tight text-slate-800">{value}</p>
      <p className={`mt-1 text-xs font-semibold ${deltaColorClass(delta)}`}>
        {trendArrow(delta)} {signed(delta)}
        {unit} since first record
      </p>
      <p className={`mt-1 text-[11px] font-medium uppercase tracking-wide ${chipLabel}`}>{label}</p>
    </div>
  );
}

function ChartCard({ config, values }: { config: ChartConfig; values: number[] }) {
  const first = values[0];
  const current = values[values.length - 1];
  const delta = round1(current - first);
  const { cardBg, cardBorder, cardGlow, accentText } = TONE_STYLES[config.tone];

  return (
    <div className={`rounded-xl border ${cardBorder} ${cardBg} ${cardGlow} p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${accentText}`}>{config.title}</p>
      <div className="mt-3">
        <TrendChart values={values} tone={config.tone} label={config.title} />
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">
        {config.format(current)}{' '}
        <span className={`text-xs font-semibold ${deltaColorClass(delta)}`}>
          {trendArrow(delta)} {signed(delta)}
          {config.unit}
        </span>
      </p>
    </div>
  );
}

function SimpleStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const { cardBg, cardBorder, accentText } = TONE_STYLES[tone];
  return (
    <div className={`rounded-xl border ${cardBorder} ${cardBg} p-4 text-center`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${accentText}`}>{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

export default function TeacherGrowthHistoryView({ plans }: { plans: MealPlan[] }) {
  // plans is newest-first (matches fetchMealPlanHistoryForStudent); charts read chronologically.
  const chronological = [...plans].reverse();
  const first = chronological[0];
  const latest = chronological[chronological.length - 1];
  const hasTrend = chronological.length > 1;

  const bmiToneValue = bmiTone(latest.nutritionalStatus);

  const charts: { config: ChartConfig; values: number[] }[] = [
    {
      config: { title: 'Height', tone: 'sky', unit: 'cm', format: (v) => `${v}cm` },
      values: chronological.map((p) => p.profile.height_cm),
    },
    {
      config: { title: 'Weight', tone: 'indigo', unit: 'kg', format: (v) => `${v}kg` },
      values: chronological.map((p) => p.profile.weight_kg),
    },
    {
      config: { title: 'BMI', tone: bmiToneValue, unit: '', format: (v) => `${v}` },
      values: chronological.map((p) => p.profile.bmi),
    },
  ];

  return (
    <div>
      <p className="mt-1 text-sm text-slate-500">Height, weight, and BMI over time</p>

      {hasTrend && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryStat
            label="Height"
            value={`${latest.profile.height_cm}cm`}
            delta={round1(latest.profile.height_cm - first.profile.height_cm)}
            unit="cm"
            tone="sky"
          />
          <SummaryStat
            label="Weight"
            value={`${latest.profile.weight_kg}kg`}
            delta={round1(latest.profile.weight_kg - first.profile.weight_kg)}
            unit="kg"
            tone="indigo"
          />
          <SummaryStat
            label="BMI"
            value={`${latest.profile.bmi}`}
            delta={round1(latest.profile.bmi - first.profile.bmi)}
            unit=""
            tone={bmiToneValue}
          />
        </div>
      )}

      {hasTrend ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {charts.map((c) => (
            <ChartCard key={c.config.title} config={c.config} values={c.values} />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SimpleStat label="Height" value={`${latest.profile.height_cm}cm`} tone="sky" />
          <SimpleStat label="Weight" value={`${latest.profile.weight_kg}kg`} tone="indigo" />
          <SimpleStat label="BMI" value={`${latest.profile.bmi}`} tone={bmiToneValue} />
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Height</th>
              <th className="py-2 font-medium">Weight</th>
              <th className="py-2 font-medium">BMI</th>
              <th className="py-2 font-medium">Nutritional status</th>
              <th className="py-2 font-medium">Meal goal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((p, idx) => {
              const progress = p.progressSinceLastPlan;
              return (
                <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="py-3 text-slate-600 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                  <td className="py-3 text-slate-600 whitespace-nowrap">
                    {p.profile.height_cm}cm
                    {progress && progress.heightChangeCm !== null && (
                      <span className={`ml-1.5 text-xs font-semibold ${deltaColorClass(progress.heightChangeCm)}`}>
                        ({signed(progress.heightChangeCm)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-slate-600 whitespace-nowrap">
                    {p.profile.weight_kg}kg
                    {progress && progress.weightChangeKg !== null && (
                      <span className={`ml-1.5 text-xs font-semibold ${deltaColorClass(progress.weightChangeKg)}`}>
                        ({signed(progress.weightChangeKg)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-slate-600 whitespace-nowrap">
                    {p.profile.bmi}
                    {progress && progress.bmiChange !== null && (
                      <span className={`ml-1.5 text-xs font-semibold ${deltaColorClass(progress.bmiChange)}`}>
                        ({signed(progress.bmiChange)})
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${statusBadgeClasses(
                        p.nutritionalStatus
                      )}`}
                    >
                      {p.nutritionalStatus}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{p.mealGoal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
