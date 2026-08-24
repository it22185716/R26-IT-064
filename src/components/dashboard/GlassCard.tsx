'use client';

import { forwardRef, type HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & { hover?: boolean };

const GlassCard = forwardRef<HTMLDivElement, Props>(
  ({ className = '', hover = true, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={`group relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 ${hover
          ? 'hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/75 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06),0_20px_40px_rgba(15,23,42,0.12)]'
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
