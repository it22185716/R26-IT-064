'use client';

import { useRef, type RefObject } from 'react';
import ParallaxLayer from '../home/ParallaxLayer';
import { useParallax } from '../home/useParallax';

type Props = {
  scrollContainerRef: RefObject<HTMLElement>;
};

export default function DashboardBackground({ scrollContainerRef }: Props) {
  const blobARef = useRef<HTMLDivElement>(null);
  const blobBRef = useRef<HTMLDivElement>(null);
  const blobCRef = useRef<HTMLDivElement>(null);
  const blobDRef = useRef<HTMLDivElement>(null);

  useParallax({
    containerRef: scrollContainerRef,
    layers: [
      { ref: blobARef, speed: -50 },
      { ref: blobBRef, speed: 40 },
      { ref: blobCRef, speed: -80 },
      { ref: blobDRef, speed: 30 },
    ],
  });

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-sky-100 via-indigo-50 to-violet-100"
    >
      <ParallaxLayer ref={blobARef} className="absolute -top-32 -left-24">
        <div className="h-96 w-96 rounded-full bg-sky-300/40 blur-3xl animate-blob" />
      </ParallaxLayer>
      <ParallaxLayer ref={blobBRef} className="absolute top-1/3 -right-32">
        <div className="h-[28rem] w-[28rem] rounded-full bg-violet-300/40 blur-3xl animate-blob [animation-delay:2s]" />
      </ParallaxLayer>
      <ParallaxLayer ref={blobCRef} className="absolute bottom-0 left-1/4">
        <div className="h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl animate-blob [animation-delay:4s]" />
      </ParallaxLayer>
      <ParallaxLayer ref={blobDRef} className="absolute bottom-1/4 right-1/4">
        <div className="h-72 w-72 rounded-full bg-gold-300/25 blur-3xl animate-blob [animation-delay:6s]" />
      </ParallaxLayer>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 50%)',
        }}
      />
    </div>
  );
}
