/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecf8f4',
          100: '#d1f0e6',
          200: '#a3e0cd',
          300: '#6bcbb0',
          400: '#3aaf91',
          500: '#0d8a6d',
          600: '#0a6f57',
          700: '#075442',
          800: '#04382d',
          900: '#021f19',
        },
        accent: { 500: '#f59e0b', 600: '#d97706' },
        danger: { 500: '#ef4444', 600: '#dc2626' },
      },
    },
  },
  plugins: [],
};
