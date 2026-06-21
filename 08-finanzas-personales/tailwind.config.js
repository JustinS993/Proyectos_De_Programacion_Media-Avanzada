/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'card-bg': '#1e293b',
        'accent-green': '#22c55e',
        'accent-red': '#ef4444',
        'text-primary': '#f8fafc',
        'text-secondary': '#94a3b8',
      }
    },
  },
  plugins: [],
}
