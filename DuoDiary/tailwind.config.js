/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        handwritten: ['"Caveat"', '"Dancing Script"', 'cursive'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        diary: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#e8ddce',
          300: '#d7c4ad',
          400: '#bf9f7e',
          500: '#ab825c',
          600: '#956b48',
          700: '#7a5439',
          800: '#644431',
          900: '#52382a',
          950: '#2c1c14',
        },
        ink: {
          light: '#3d342d',
          dark: '#161311',
          gold: '#cba052',
          ruby: '#9b2c2c',
          navy: '#1e293b',
        }
      },
      boxShadow: {
        'page': '0 10px 30px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        'book': '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 35px -5px rgba(0, 0, 0, 0.15)',
        'glow-gold': '0 0 25px rgba(203, 160, 82, 0.4)',
        'glow-blue': '0 0 25px rgba(96, 165, 250, 0.35)',
        'glow-emerald': '0 0 25px rgba(52, 211, 153, 0.35)',
        'glow-violet': '0 0 25px rgba(167, 139, 250, 0.35)',
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite',
        'page-turn': 'pageTurn 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pageTurn: {
          '0%': { transform: 'rotateY(0deg)', opacity: '0.9' },
          '100%': { transform: 'rotateY(-180deg)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
