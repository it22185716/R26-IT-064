'use client';

import { forwardRef, type HTMLAttributes } from 'react';

type ParallaxLayerProps = HTMLAttributes<HTMLDivElement>;

const ParallaxLayer = forwardRef<HTMLDivElement, ParallaxLayerProps>(({ className = '', ...rest }, ref) => (
  <div ref={ref} className={`will-change-transform ${className}`} {...rest} />
));

ParallaxLayer.displayName = 'ParallaxLayer';

export default ParallaxLayer;
