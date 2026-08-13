'use client';

import { forwardRef, type HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & { hover?: boolean };

const GlassCard = forwardRef<HTMLDivElement, Props>(
  ({ className = '', hover = true, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] transition-all duration-200 ${
        hover
          ? 'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_2px_6px_rgba(15,23,42,0.06),0_16px_32px_rgba(15,23,42,0.08)]'
          : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  ),
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
