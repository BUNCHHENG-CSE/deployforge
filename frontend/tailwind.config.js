/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81'
        },
        azure: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0078d4',
          600: '#0062ad',
          700: '#004f8c',
        }
      }
    },
  },
  plugins: [],
}
