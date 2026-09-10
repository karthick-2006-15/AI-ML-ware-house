/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        tech: ['"Rajdhani"', '"Space Grotesk"', 'sans-serif'],
        display: ['"Space Grotesk"', '"Rajdhani"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        warehouse: {
          950: '#06101F',
          900: '#08182A',
          850: '#0B1728',
          800: '#0D1B2E',
          750: '#102238',
          700: '#14253D',
          600: '#1A2D4A',
          500: '#1E3A5F',
        },
      },
    },
  },
  plugins: [],
}
