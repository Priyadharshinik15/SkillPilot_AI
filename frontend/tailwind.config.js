/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        surface: {
          900: '#0d0f14',
          800: '#13161e',
          700: '#1a1d27',
          600: '#20242f',
          500: '#272b38',
        },
        accent: {
          green:  '#22d3a4',
          yellow: '#fbbf24',
          red:    '#f87171',
          blue:   '#60a5fa',
          purple: '#a78bfa',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'glow-brand': 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glow':  '0 0 20px rgba(99,102,241,0.3)',
      }
    },
  },
  plugins: [],
}
