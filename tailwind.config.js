/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['"Source Sans Pro"', 'sans-serif'],
      heading: ['"Source Sans Pro"', 'sans-serif'],
    },
    extend: {
      colors: {
        primary: {
          50: '#fffef0',
          100: '#fffce1',
          200: '#fffa99',
          300: '#fff851',
          400: '#f0f50a',
          500: '#dcff18',
          600: '#d4e812',
          700: '#b8c00d',
          800: '#9ca008',
          900: '#6e7006',
        },
        dark: '#1a1a1a',
      }
    },
  },
  plugins: [],
}