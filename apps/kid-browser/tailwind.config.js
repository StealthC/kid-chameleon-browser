/** @type {import('tailwindcss').Config} */
import primeui from 'tailwindcss-primeui'
import typography from '@tailwindcss/typography'
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
    },
  },
  plugins: [primeui, typography]
}

