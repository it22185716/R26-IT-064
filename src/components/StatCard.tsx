import React from 'react';

type Props = {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
};

export default function StatCard({ label, value, accent, icon }: Props) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {icon}
        </svg>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
