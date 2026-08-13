export interface Accent {
  key: 'nutrition' | 'math' | 'reading' | 'adaptive';
  kicker: string;
  headline: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  classes: {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    gradientText: string;
    bulletIcon: string;
    ctaBg: string;
    ctaHover: string;
    ctaShadow: string;
    ctaShadowHover: string;
  };
  bg: { from: string; to: string };
}

export const HERO_BG = { from: '#7dd3fc', to: '#818cf8' };
export const STATS_BG = { from: '#cbd5e1', to: '#94a3b8' };

export const ACCENTS: Record<Accent['key'], Accent> = {
  nutrition: {
    key: 'nutrition',
    kicker: 'Personalized Nutrition',
    headline: 'Healthier learning, powered by AI-personalized nutrition',
    description:
      "Delivering healthier learning through AI-powered nutrition tailored to every child's unique needs — because a well-nourished student learns better.",
    bullets: [
      'Individual dietary profiles per student',
      'Growth & wellbeing tracking over time',
      'Guidance teachers and parents can act on',
    ],
    ctaLabel: 'Explore Nutrition',
    ctaHref: '/auth',
    classes: {
      badgeBg: 'bg-lime-500/20',
      badgeBorder: 'border border-lime-600/20',
      badgeText: 'text-lime-800',
      gradientText: 'bg-gradient-to-r from-lime-500 to-green-600',
      bulletIcon: 'text-green-600',
      ctaBg: 'bg-gradient-to-r from-lime-600 to-green-700',
      ctaHover: 'hover:from-lime-700 hover:to-green-800',
      ctaShadow: 'shadow-[0_2px_8px_rgba(22,101,52,0.30),0_16px_36px_rgba(34,197,94,0.30)]',
      ctaShadowHover: 'hover:shadow-[0_4px_14px_rgba(22,101,52,0.40),0_24px_50px_rgba(34,197,94,0.40)]',
    },
    bg: { from: '#bef264', to: '#86efac' },
  },
  math: {
    key: 'math',
    kicker: 'Math Detection',
    headline: 'Discover learning gaps instantly with intelligent math analysis',
    description:
      'Discovering learning gaps instantly with intelligent mathematics performance analysis — so every weak topic is caught before it becomes a bigger problem.',
    bullets: [
      'Category-by-category performance breakdown',
      'Beyond right or wrong: multi-level scoring',
      'Instant weak-topic detection for teachers',
    ],
    ctaLabel: 'Explore Math Detection',
    ctaHref: '/auth',
    classes: {
      badgeBg: 'bg-blue-500/20',
      badgeBorder: 'border border-blue-600/20',
      badgeText: 'text-blue-800',
      gradientText: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      bulletIcon: 'text-indigo-600',
      ctaBg: 'bg-gradient-to-r from-blue-600 to-indigo-700',
      ctaHover: 'hover:from-blue-700 hover:to-indigo-800',
      ctaShadow: 'shadow-[0_2px_8px_rgba(55,48,163,0.30),0_16px_36px_rgba(59,130,246,0.30)]',
      ctaShadowHover: 'hover:shadow-[0_4px_14px_rgba(55,48,163,0.40),0_24px_50px_rgba(59,130,246,0.40)]',
    },
    bg: { from: '#93c5fd', to: '#818cf8' },
  },
  reading: {
    key: 'reading',
    kicker: 'Reading Assessment',
    headline: 'Transforming reading practice with AI-driven speech analysis',
    description:
      'Transforming reading practice with AI-driven speech analysis and adaptive learning paths — giving every student a reading journey suited to their pace.',
    bullets: [
      'Real-time speech & fluency analysis',
      'Adaptive reading paths per student',
      'Clear progress signals for teachers',
    ],
    ctaLabel: 'Explore Reading Assessment',
    ctaHref: '/auth',
    classes: {
      badgeBg: 'bg-orange-500/20',
      badgeBorder: 'border border-orange-600/20',
      badgeText: 'text-orange-800',
      gradientText: 'bg-gradient-to-r from-orange-500 to-amber-600',
      bulletIcon: 'text-amber-600',
      ctaBg: 'bg-gradient-to-r from-orange-600 to-amber-700',
      ctaHover: 'hover:from-orange-700 hover:to-amber-800',
      ctaShadow: 'shadow-[0_2px_8px_rgba(146,64,14,0.30),0_16px_36px_rgba(251,146,60,0.30)]',
      ctaShadowHover: 'hover:shadow-[0_4px_14px_rgba(146,64,14,0.40),0_24px_50px_rgba(251,146,60,0.40)]',
    },
    bg: { from: '#fdba74', to: '#fcd34d' },
  },
  adaptive: {
    key: 'adaptive',
    kicker: 'Adaptive Content Delivery',
    headline: 'The right content, at the right time, powered by AI',
    description:
      'Providing the right educational content at the right time through intelligent AI recommendations — keeping every student in their optimal learning zone.',
    bullets: [
      'Smart recommendations per student level',
      'Content that adapts as students progress',
      'Less guesswork for teachers planning lessons',
    ],
    ctaLabel: 'Explore Adaptive Content',
    ctaHref: '/auth',
    classes: {
      badgeBg: 'bg-violet-500/20',
      badgeBorder: 'border border-violet-600/20',
      badgeText: 'text-violet-800',
      gradientText: 'bg-gradient-to-r from-purple-500 to-violet-600',
      bulletIcon: 'text-violet-600',
      ctaBg: 'bg-gradient-to-r from-purple-600 to-violet-700',
      ctaHover: 'hover:from-purple-700 hover:to-violet-800',
      ctaShadow: 'shadow-[0_2px_8px_rgba(91,33,182,0.30),0_16px_36px_rgba(168,85,247,0.30)]',
      ctaShadowHover: 'hover:shadow-[0_4px_14px_rgba(91,33,182,0.40),0_24px_50px_rgba(168,85,247,0.40)]',
    },
    bg: { from: '#c4b5fd', to: '#f0abfc' },
  },
};
