/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}', '../src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), require('../tailwind.preset.ts')],
  darkMode: 'class',
  theme: { extend: {} },
}
