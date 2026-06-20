/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#002337',
        'brand-blue': '#2563EB',
        'gray-light': '#F1F5F9',
        'text-dark': '#1E293B',
        'level-1': '#FECACA',
        'level-2': '#FED7AA',
        'level-3': '#BFDBFE',
        'level-4': '#A7F3D0',
        'level-5': '#6EE7B7',
      },
      fontFamily: {
        display: ['Georgia', "'Times New Roman'", 'serif'],
        body: ['Georgia', "'Times New Roman'", 'serif'],
      },
    },
  },
  plugins: [],
}
