/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  '#ebf9f1',
          100: '#d1f2e1',
          200: '#a8e4c2',
          300: '#7dd4a1',
          400: '#56c285',
          500: '#3daa6e',
          600: '#2e7d52',
          700: '#246341',
          800: '#1e5c3a',
          900: '#174d30',
          950: '#0e3220',
        },
        gold: {
          50:  '#fdf9ee',
          100: '#f9f0d0',
          200: '#f2de9d',
          300: '#e9c764',
          400: '#D4A853',
          500: '#c48d2e',
          600: '#a97021',
          700: '#865320',
          800: '#6e4220',
          900: '#5c371e',
        },
        surface: '#F5F5F7',
      },
      fontFamily: {
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:        '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover':'0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10)',
        glow:        '0 0 0 3px rgba(61,170,110,0.18)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      animation: {
        'count-up': 'countUp 0.6s ease-out',
        'fade-in':  'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        countUp:  { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
