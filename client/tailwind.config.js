/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void:    '#080B10',
        surface: '#0F1420',
        border:  '#1C2333',
        signal:  '#00D4AA',
        warn:    '#F59E0B',
        loss:    '#EF4444',
        'text-primary': '#E8EDF5',
        'text-muted':   '#5A6580',
      },
      fontFamily: {
        mono:  ['"JetBrains Mono"', 'monospace'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '6px',   // capped at 6px — no larger allowed
        '2xl': '6px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
