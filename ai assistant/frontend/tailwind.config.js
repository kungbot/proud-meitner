/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: '#020617', // slate-950
          card: 'rgba(15, 23, 42, 0.45)', // transparent slate-900
          border: 'rgba(51, 65, 85, 0.5)', // slate-700
          primary: '#00e1ff', // glowing cyan
          secondary: '#3b82f6', // soft blue
          accent: '#10b981', // green action completed
          warning: '#f59e0b', // orange thinking
          danger: '#ef4444' // red recording
        }
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'spin-reverse-slow': 'spin-reverse 15s linear infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite'
      },
      keyframes: {
        'spin-reverse': {
          to: { transform: 'rotate(-360deg)' }
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(0.96)' },
          '50%': { opacity: '0.95', transform: 'scale(1.04)' }
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 10px rgba(0, 225, 255, 0.2), inset 0 0 10px rgba(0, 225, 255, 0.1)'
          },
          '50%': {
            boxShadow: '0 0 25px rgba(0, 225, 255, 0.5), inset 0 0 15px rgba(0, 225, 255, 0.3)'
          }
        }
      }
    },
  },
  plugins: [],
};
