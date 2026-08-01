'use client';

import React, { forwardRef } from 'react';
import GlassCard from './dashboard/GlassCard';
import { useCountUp } from './dashboard/useCountUp';

type Props = {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
};

const StatCard = forwardRef<HTMLDivElement, Props>(({ label, value, accent, icon }, ref) => {
  const valueRef = useCountUp(value);

  return (
    <GlassCard ref={ref} className="p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ${accent}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {icon}
        </svg>
      </div>
      <p ref={valueRef} className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </GlassCard>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
