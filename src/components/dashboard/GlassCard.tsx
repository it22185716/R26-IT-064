'use client';

import { forwardRef, type HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & { hover?: boolean };

const GlassCard = forwardRef<HTMLDivElement, Props>(
  ({ className = '', hover = true, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={`group relative overflow-hidden rounded-2xl border border-white/50 bg-white/50 shadow-[0_2px_8px_rgba(15,23,42,0.06),0_20px_45px_rgba(15,23,42,0.10)] ring-1 ring-inset ring-white/30 backdrop-blur-xl transition-all duration-300 ${
        hover
          ? 'hover:-translate-y-1 hover:border-white/80 hover:bg-white/65 hover:shadow-[0_4px_14px_rgba(15,23,42,0.10),0_28px_56px_rgba(15,23,42,0.18)]'
          : ''
      } ${className}`}
      {...rest}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent"
      />
      <div className="relative">{children}</div>
    </div>
  ),
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
