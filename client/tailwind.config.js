/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          base: '#080a0d',
          panel: '#0d1117',
          card: '#131920',
          hover: '#182030',
          border: '#1e2a3a',
        },
        green: {
          400: '#22c55e',
          500: '#16a34a',
          glow: '#22c55e33',
        },
        red: {
          400: '#ef4444',
          500: '#dc2626',
          glow: '#ef444433',
        },
        amber: {
          400: '#f59e0b',
          500: '#d97706',
          glow: '#f59e0b33',
        },
        cyan: {
          400: '#22d3ee',
          glow: '#22d3ee33',
        },
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-down': 'slideDown 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
