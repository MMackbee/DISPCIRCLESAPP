/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Apple-inspired golf palette
        black: '#0a0a0a', // true black
        // Secondary: Golf Green
        green: {
          50: '#e6f9e6',
          100: '#b2e6b2',
          200: '#7fdc7f',
          300: '#4ade80', // main secondary accent
          400: '#22c55e',
          500: '#16a34a',
        },
        // Tertiary: Yellow
        yellow: {
          50: '#fffbe6',
          100: '#fff7b2',
          200: '#ffe96e',
          300: '#ffd600', // main tertiary accent
          400: '#ffb800',
          500: '#ff9900',
        },
        blue: {
          50: '#e6f6ff',
          100: '#b3e6ff',
          200: '#7fd4ff',
          300: '#4fc3f7',
          400: '#29b6f6',
          500: '#039be5',
        },
        white: '#fff',
        gray: {
          900: '#18181b',
          800: '#23232b',
          700: '#2d2d36',
          600: '#3a3a44',
          500: '#52525b',
          400: '#a1a1aa',
          300: '#d4d4d8',
          200: '#e4e4e7',
          100: '#f4f4f5',
        },
        // For glassmorphism overlays
        glass: 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'SF Pro Display',
          'Segoe UI',
          'Tahoma',
          'Geneva',
          'Verdana',
          'sans-serif',
        ],
      },
      boxShadow: {
        'golf': '0 4px 16px 0 rgba(76, 220, 128, 0.10), 0 1.5px 4px 0 rgba(0,0,0,0.10)',
        'glass': '0 8px 32px 0 rgba(0,0,0,0.25), 0 1.5px 4px 0 rgba(255,255,255,0.10)',
        'tactile': '0 2px 8px 0 rgba(76, 220, 128, 0.10), 0 1.5px 4px 0 rgba(0,0,0,0.10)',
      },
      borderRadius: {
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      transitionProperty: {
        'tactile': 'box-shadow, transform, background, color',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'tactile-press': 'tactilePress 0.15s cubic-bezier(0.4,0,0.2,1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        tactilePress: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.97)' },
        },
      },
    },
  },
  plugins: [],
} 