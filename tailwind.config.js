/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border:  'rgb(var(--color-border) / <alpha-value>)',
        accent:  'rgb(var(--color-accent) / <alpha-value>)',
        text:    'rgb(var(--color-text) / <alpha-value>)',
        muted:   'rgb(var(--color-muted) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warn:    'rgb(var(--color-warn) / <alpha-value>)',
        timer:   'rgb(var(--color-timer) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
