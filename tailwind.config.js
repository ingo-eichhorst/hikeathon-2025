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
        dark: {
          DEFAULT: '#1a1a1a',
          50: '#f5f5f5',
          100: '#e8e8e8',
          200: '#d1d1d1',
          300: '#bababa',
          400: '#a3a3a3',
          500: '#8c8c8c',
          600: '#757575',
          700: '#5e5e5e',
          800: '#474747',
          900: '#1a1a1a',
        }
      }
    },
  },
  plugins: [],
}