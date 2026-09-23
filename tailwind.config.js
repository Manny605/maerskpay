/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        // Tokens backed by CSS variables (see index.css) so they flip with the
        // .dark class — components keep using bg-bg / text-t2 / etc unchanged.
        bg:           'rgb(var(--color-bg) / <alpha-value>)',
        surface:      'rgb(var(--color-surface) / <alpha-value>)',
        card:         'rgb(var(--color-card) / <alpha-value>)',
        'card-hover': 'rgb(var(--color-card-hover) / <alpha-value>)',
        border:       'rgb(var(--color-border) / <alpha-value>)',
        'border-hi':  'rgb(var(--color-border-hi) / <alpha-value>)',
        text:         'rgb(var(--color-text) / <alpha-value>)',
        't2':         'rgb(var(--color-t2) / <alpha-value>)',
        't3':         'rgb(var(--color-t3) / <alpha-value>)',
        heading:      'rgb(var(--color-heading) / <alpha-value>)',
        // Cyan du logo, assombri en clair / éclairci en sombre pour rester lisible en texte
        accent:       'rgb(var(--color-accent) / <alpha-value>)',
        // Brand colors stay constant across themes.
        mauritel: '#0f9d70',
        rimatel:  '#2f6fed',
        mattel:   '#e15a2e',
        brand:    '#1eaec8', // cyan exact du logo — pour les aplats (boutons, sélection)
        navy:     '#00243d', // texte posé sur brand
      },
    },
  },
  plugins: [],
}
