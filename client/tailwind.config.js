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
        telegram: {
          blue: '#2AABEE',
          'blue-hover': '#229ED9',
          'blue-dark': '#1e88e5',
          primary: '#2481cc',
          // Dark theme colors (Telegram Desktop)
          dark: {
            sidebar: '#17212b',
            chat: '#0e1621',
            header: '#17212b',
            bubbleIn: '#182533',
            bubbleOut: '#2b5278',
            hover: '#202b36',
            active: '#2b5278',
            border: '#242f3d',
            text: '#f5f5f5',
            muted: '#7e8e9f'
          },
          // Light theme colors (Telegram Web)
          light: {
            sidebar: '#ffffff',
            chat: '#99ba92', // or pattern background
            bubbleIn: '#ffffff',
            bubbleOut: '#effedd',
            hover: '#f4f4f5',
            active: '#3390ec',
            border: '#e3e4e8',
            text: '#111827',
            muted: '#707579'
          }
        }
      },
      fontFamily: {
        uyghur: ['"Noto Naskh Arabic"', '"UKIJ Tuz"', '"UKIJ Ekran"', 'Tahoma', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
