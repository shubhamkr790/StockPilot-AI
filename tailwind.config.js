/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
      colors: {
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#0c5c2d',
          900: '#0a4220',
          950: '#052914',
        },
        emerald: {
          base: '#0F392B',
          dark: '#0A251C',
          deep: '#061913',
          vibrant: '#059669',
          light: '#10B981',
          accent: '#34D399',
        },
        canvas: {
          bg: '#F9FAF9',
          card: '#FFFFFF',
          border: '#D8DDD8',
          text: '#111814',
          muted: '#637069',
        },
        terminal: {
          bg: '#0A0E0C',
          card: '#121815',
          border: '#232D28',
          text: '#EDF2EE',
          muted: '#8A9990',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
