/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#14233d",
        blue: {
          brand: "#2474e8",
          hover: "#1c62cb",
          soft: "#e9f2ff",
        },
        ink: "#172b4d",
        muted: "#7183a3",
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
