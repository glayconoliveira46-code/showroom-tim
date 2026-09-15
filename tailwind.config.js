/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tim: {
          blue: '#002B7F',
          lightBlue: '#0054A6',
          cyan: '#00B5E2',
          red: '#ED1C24',
          dark: '#0A0F1D'
        }
      }
    },
  },
  plugins: [],
}
