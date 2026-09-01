"use client";

import React from 'react';
import GlassCard from './GlassCard';
import { MealPlan } from '../../lib/types';

const TREND_ICON = (
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
);

const CHART_W = 320;
const CHART_H = 120;
const CHART_PAD_X = 12;
const CHART_PAD_Y = 18;

// Same status→color mapping as STATUS_META in
// src/app/dashboard/teacher/meal-plan/page.tsx (and TeacherGrowthHistoryView) —
// kept identical so a status reads the same color everywhere in the app.
const NUTRITIONAL_STATUS_COLORS: Record<string, string> = {
  Normal: '#10B981', // emerald-500
  Overweight: '#F59E0B', // amber-500
  Obesity: '#EF4444', // red-500
  'Severe Thinness': '#EF4444', // red-500
  Thinness: '#F59E0B', // amber-500
};
const DEFAULT_STATUS_COLOR = '#94A3B8'; // slate-400, for an unrecognized status string

// General WHO adult BMI reference bands — a visual backdrop only. Each point's
// own marker color (NUTRITIONAL_STATUS_COLORS) is the accurate per-plan signal;
// these bands are approximate and don't account for pediatric BMI-for-age norms.
const WHO_BMI_BANDS: { min: number; max: number; color: string; label: string }[] = [
  { min: -Infinity, max: 18.5, color: '#0EA5E9', label: 'Underweight' }, // sky-500
  { min: 18.5, max: 25, color: '#10B981', label: 'Normal' }, // emerald-500
  { min: 25, max: 30, color: '#F59E0B', label: 'Overweight' }, // amber-500
  { min: 30, max: Infinity, color: '#F43F5E', label: 'Obese' }, // rose-500
];

type MetricConfig = {
  title: string;
  color: string;
  accentText: string;
  unit: string;
  format: (v: number) => string;
  changeLabel: (delta: number) => string;
  bands?: boolean;
};

function weightLabel(delta: number): string {
  if (delta > 0) return 'Gained weight';
  if (delta < 0) return 'Weight changed';
  return 'Weight steady';
}

function bmiLabel(delta: number): string {
  if (delta > 0) return 'BMI increased';
  if (delta < 0) return 'BMI decreased';
  return 'BMI steady';
}

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

type ChartScale = { paddedMin: number; paddedMax: number; span: number };

function computeChartScale(values: number[]): ChartScale {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const paddedMin = min - range * 0.2;
  const paddedMax = max + range * 0.2;
  const span = paddedMax - paddedMin || 1;
  return { paddedMin, paddedMax, span };
}

function valueToY(v: number, scale: ChartScale): number {
  return CHART_H - CHART_PAD_Y - ((v - scale.paddedMin) / scale.span) * (CHART_H - CHART_PAD_Y * 2);
}

function buildChartPoints(values: number[], scale: ChartScale): { x: number; y: number }[] {
  return values.map((v, i) => {
    const x = values.length === 1 ? CHART_W / 2 : CHART_PAD_X + (i / (values.length - 1)) * (CHART_W - CHART_PAD_X * 2);
    const y = valueToY(v, scale);
    return { x, y };
  });
}

// Clips each WHO band to the chart's own (padded) y-axis range so bands never
// force the axis wider than the data already made it — a band with no overlap
// in the current range is simply skipped.
function visibleBands(scale: ChartScale) {
  return WHO_BMI_BANDS.map((band) => {
    const lo = Math.max(band.min, scale.paddedMin);
    const hi = Math.min(band.max, scale.paddedMax);
    if (lo >= hi) return null;
    const yTop = valueToY(hi, scale);
    const height = valueToY(lo, scale) - yTop;
    return { ...band, yTop, height };
  }).filter((b): b is NonNullable<typeof b> => b !== null);
}

function TrendChart({
  values,
  color,
  label,
  pointColors,
  bands,
}: {
  values: number[];
  color: string;
  label: string;
  pointColors?: string[];
  bands?: boolean;
}) {
  const scale = computeChartScale(values);
  const points = buildChartPoints(values, scale);
  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const gridYs = [0.25, 0.5, 0.75].map((f) => CHART_PAD_Y + f * (CHART_H - CHART_PAD_Y * 2));
  const bandRects = bands ? visibleBands(scale) : [];

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-28 w-full" preserveAspectRatio="none" role="img" aria-label={`${label} trend chart`}>
      {bandRects.map((b) => (
        <rect key={b.label} x={CHART_PAD_X} y={b.yTop} width={CHART_W - CHART_PAD_X * 2} height={b.height} fill={b.color} fillOpacity={0.12} />
      ))}
      {gridYs.map((y, i) => (
        <line key={i} x1={CHART_PAD_X} y1={y} x2={CHART_W - CHART_PAD_X} y2={y} stroke="#E2E8F0" strokeWidth={1} />
      ))}
      {bandRects
        .filter((b) => b.height >= 9)
        .map((b) => (
          <text
            key={`label-${b.label}`}
            x={CHART_W - CHART_PAD_X - 2}
            y={b.yTop + b.height / 2}
            dy="0.3em"
            textAnchor="end"
            fontSize={7}
            fill={b.color}
            fillOpacity={0.8}
          >
            {b.label}
          </text>
        ))}
      <polyline
        points={pointsAttr}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={pointColors?.[i] ?? color} stroke="white" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

function MetricPanel({ config, values, statuses }: { config: MetricConfig; values: number[]; statuses?: string[] }) {
  const first = values[0];
  const current = values[values.length - 1];
  const delta = round1(current - first);
  const hasTrend = values.length > 1;
  const pointColors = statuses?.map((s) => NUTRITIONAL_STATUS_COLORS[s] ?? DEFAULT_STATUS_COLOR);

  return (
    <div className="rounded-xl bg-slate-50/70 p-4 ring-1 ring-inset ring-slate-200/60">
      <p className={`text-xs font-semibold uppercase tracking-wide ${config.accentText}`}>{config.title}</p>

      {hasTrend ? (
        <>
          <div className="mt-3">
            <TrendChart values={values} color={config.color} label={config.title} pointColors={pointColors} bands={config.bands} />
          </div>
          {config.bands && (
            <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
              Reference ranges shown are general guidelines; each point&apos;s color reflects your plan&apos;s recorded status at that time.
            </p>
          )}
          <p className="mt-2 text-sm text-slate-600">
            {config.format(first)} → <span className="font-semibold text-slate-800">{config.format(current)}</span>
          </p>
          <p className={`mt-0.5 text-xs font-semibold ${deltaColorClass(delta)}`}>
            {signed(delta)}
            {config.unit} since your first plan · {config.changeLabel(delta)}
          </p>
        </>
      ) : (
        <p className="mt-3 text-2xl font-bold text-slate-800">{config.format(current)}</p>
      )}
    </div>
  );
}

// Growth-trend charts + history table, driven purely by `plans`. Shared
// between the student's own history page and the teacher's read-only view
// of a student's history — loading/empty states stay with each caller since
// their copy and layout differ.
export default function GrowthHistoryView({ plans }: { plans: MealPlan[] }) {
  // plans is newest-first (matches fetchMealPlanHistory); charts read chronologically.
  const chronological = [...plans].reverse();

  const metrics: { config: MetricConfig; values: number[]; statuses?: string[] }[] = [
    {
      config: {
        title: 'Weight',
        color: '#4F46E5',
        accentText: 'text-indigo-700',
        unit: 'kg',
        format: (v) => `${v}kg`,
        changeLabel: weightLabel,
      },
      values: chronological.map((p) => p.profile.weight_kg),
    },
    {
      config: {
        title: 'BMI',
        color: '#D97706',
        accentText: 'text-amber-700',
        unit: '',
        format: (v) => `${v}`,
        changeLabel: bmiLabel,
        bands: true,
      },
      values: chronological.map((p) => p.profile.bmi),
      statuses: chronological.map((p) => p.nutritionalStatus),
    },
  ];

  return (
    <div className="space-y-5">
      {/* ---- Growth Trends ---- */}
      <GlassCard hover={false} className="overflow-hidden p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/60 via-transparent to-transparent"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {TREND_ICON}
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Growth Trends</p>
              <h3 className="text-lg font-bold text-slate-900">
                {chronological.length > 1
                  ? `Across ${chronological.length} plans`
                  : 'Your first recorded plan'}
              </h3>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {metrics.map((m) => (
              <MetricPanel key={m.config.title} config={m.config} values={m.values} statuses={m.statuses} />
            ))}
          </div>
        </div>
      </GlassCard>

      {/* ---- History Table ---- */}
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gold-100 border-b-2 border-slate-300">
              <th className="py-3 pr-4 font-bold text-slate-800">Date</th>
              <th className="py-3 pr-4 font-bold text-slate-800">Height</th>
              <th className="py-3 pr-4 font-bold text-slate-800">Weight</th>
              <th className="py-3 pr-4 font-bold text-slate-800">BMI</th>
              <th className="py-3 pr-4 font-bold text-slate-800">Nutritional Status</th>
              <th className="py-3 pr-4 font-bold text-slate-800">Meal Goal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((p, idx) => {
              const progress = p.progressSinceLastPlan;
              return (
                <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-100' : 'bg-white'}>
                  <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                  <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                    {p.profile.height_cm}cm
                    {progress && progress.heightChangeCm !== null && (
                      <span className={`ml-1.5 text-xs font-semibold ${deltaColorClass(progress.heightChangeCm)}`}>
                        ({signed(progress.heightChangeCm)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                    {p.profile.weight_kg}kg
                    {progress && progress.weightChangeKg !== null && (
                      <span className={`ml-1.5 text-xs font-semibold ${deltaColorClass(progress.weightChangeKg)}`}>
                        ({signed(progress.weightChangeKg)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                    {p.profile.bmi}
                    {progress && progress.bmiChange !== null && (
                      <span className={`ml-1.5 text-xs font-semibold ${deltaColorClass(progress.bmiChange)}`}>
                        ({signed(progress.bmiChange)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{p.nutritionalStatus}</td>
                  <td className="py-3 pr-4 text-slate-600">{p.mealGoal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
