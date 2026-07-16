/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        bg:       '#f5f7fa',
        surface:  '#ffffff',
        card:     '#ffffff',
        'card-hover': '#eef2f6',
        border:   '#dfe4ea',
        'border-hi': '#c1c9d2',
        text:     '#0a2540',
        't2':     '#4d5c6c',
        't3':     '#8493a1',
        mauritel: '#0f9d70',
        rimatel:  '#2f6fed',
        mattel:   '#e15a2e',
        accent:   '#1f8fc4',
        navy:     '#0a2540',
      },
    },
  },
  plugins: [],
}
