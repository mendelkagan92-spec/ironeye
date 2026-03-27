/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0f0f0f',
        surface: '#1a1a1a',
        'surface-2': '#242424',
        'surface-3': '#2a2a2a',
        'input-bg': '#1e1e1e',
        primary: '#fc4c02',
        'primary-hover': '#ff6b35',
        success: '#00d4aa',
        text: {
          primary: '#ffffff',
          secondary: '#8a8a8a',
          muted: '#4a4a4a',
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        barlow: ['Barlow', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.15s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        skeleton: 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
