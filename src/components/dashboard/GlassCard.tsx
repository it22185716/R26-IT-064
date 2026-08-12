'use client';

import { forwardRef, type HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & { hover?: boolean };

const GlassCard = forwardRef<HTMLDivElement, Props>(
  ({ className = '', hover = true, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 ${
        hover ? 'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  ),
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
