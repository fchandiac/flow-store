const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'app/**/*.{js,ts,jsx,tsx,mdx}'),
    join(__dirname, 'baseComponents/**/*.{js,ts,jsx,tsx,mdx}'),
    join(__dirname, 'globalstate/**/*.{js,ts,jsx,tsx,mdx}'),
    join(__dirname, 'ui/**/*.{js,ts,jsx,tsx,mdx}'),
    join(__dirname, '../lib/**/*.{js,ts,jsx,tsx,mdx}'),
    join(__dirname, '../src/**/*.{js,ts,jsx,tsx,mdx}')
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          '20': 'rgba(212, 106, 47, 0.2)',
          '30': 'rgba(212, 106, 47, 0.3)',
        },
        muted: 'var(--color-muted)',
        success: 'var(--color-success)',
        info: 'var(--color-info)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        neutral: 'var(--color-neutral)',
      },
    },
  },
  plugins: [],
}


