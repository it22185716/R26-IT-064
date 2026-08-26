/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FDF8E7',
          100: '#FAF0C7',
          200: '#F3DE8A',
          300: '#EACB53',
          400: '#DBB233',
          500: '#C9A227',
          600: '#A9841C',
          700: '#856615',
          800: '#634B10',
          900: '#40300A',
        },
        maroon: {
          50: '#FBEAEC',
          100: '#F3C6CB',
          200: '#E4919B',
          300: '#CE5C6B',
          400: '#A93444',
          500: '#7A1F2B',
          600: '#651822',
          700: '#4F131A',
          800: '#3A0D13',
          900: '#26090C',
        },
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(20px, -30px) scale(1.1)' },
          '66%': { transform: 'translate(-15px, 15px) scale(0.95)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--pulse-glow-rgb) / 0.45)' },
          '50%': { boxShadow: '0 0 0 8px rgb(var(--pulse-glow-rgb) / 0)' },
        },
        'ken-burns': {
          // Never animates through scale(1) — at exactly container size,
          // sub-pixel layout rounding on a `fill` image can leave a hairline
          // gap at the rounded corners. Staying oversized the whole time
          // keeps the image safely beyond the clip edge at every frame.
          '0%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1.15)' },
        },
        'modal-pop': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'modal-pop-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        blob: 'blob 8s infinite ease-in-out',
        shake: 'shake 0.4s ease-in-out',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'ken-burns': 'ken-burns 20s ease-in-out infinite alternate',
        // Modal enter/exit — two distinct keyframes (not a single one
        // toggled via animation-direction) because swapping direction on an
        // already-finished CSS animation doesn't restart playback; changing
        // which named animation is applied does.
        'modal-pop': 'modal-pop 0.2s cubic-bezier(0.16,1,0.3,1) both',
        'modal-pop-out': 'modal-pop-out 0.18s cubic-bezier(0.4,0,1,1) both',
      },
    },
  },
  plugins: [],
};
