/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#7986cb',
          main: '#3f51b5',
          dark: '#303f9f',
          contrastText: '#fff',
        },
        secondary: {
          light: '#ff4081',
          main: '#f50057',
          dark: '#c51162',
          contrastText: '#fff',
        },
        accent: {
          light: '#4dd0e1',
          main: '#00bcd4',
          dark: '#0097a7',
          contrastText: '#fff',
        },
      },
    },
  },
  plugins: [],
  important: '#root',
  corePlugins: {
    preflight: false,
  },
};
