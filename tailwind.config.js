/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Muted teal, matched to the reference screenshots
        brand: {
          50: '#EEF7F5',
          100: '#D6EEE8',
          200: '#AEDCD1',
          500: '#3A9A87',
          600: '#2E8B7A',
          700: '#257262',
          800: '#1E5B4F',
        },
        canvas: '#FAFAF8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28, 25, 23, 0.04)',
        pop: '0 8px 30px rgba(28, 25, 23, 0.12)',
      },
    },
  },
  plugins: [],
};
