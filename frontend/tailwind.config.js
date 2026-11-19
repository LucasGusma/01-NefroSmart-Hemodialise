/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'azul-claro': '#B3D4FC',
        'azul-medio': '#3A7CA5',
        'azul-escuro': '#1F3A60',
        'cinza-claro': '#E6E6E6',
      },
    },
  },
  plugins: [],
}