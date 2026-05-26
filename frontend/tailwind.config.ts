import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#455538',
        'on-primary': '#ffffff',
        'primary-container': '#5d6d4f',
        'on-primary-container': '#dceec9',
        'primary-fixed': '#d6e8c3',
        'primary-fixed-dim': '#bbcca9',
        'inverse-primary': '#bbcca9',
        'secondary': '#805533',
        'on-secondary': '#ffffff',
        'secondary-container': '#fdc39a',
        'surface': '#fbf9f8',
        'surface-dim': '#dcd9d9',
        'surface-bright': '#fbf9f8',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f6f3f2',
        'surface-container': '#f0eded',
        'surface-container-high': '#eae8e7',
        'surface-container-highest': '#e4e2e1',
        'surface-tint': '#536346',
        'surface-variant': '#e4e2e1',
        'on-surface': '#1b1c1c',
        'on-surface-variant': '#444840',
        'inverse-surface': '#303030',
        'inverse-on-surface': '#f3f0f0',
        'outline': '#75786f',
        'outline-variant': '#c5c8bd',
        'background': '#fbf9f8',
        'on-background': '#1b1c1c',
        'tertiary': '#52504c',
        'tertiary-container': '#6a6863',
        'on-tertiary-container': '#ece8e2',
        'error': '#ba1a1a'
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif']
      },
      fontSize: {
        'headline-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '500' }],
        'headline-lg-mobile': ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '500' }],
        'headline-md': ['32px', { lineHeight: '1.2', fontWeight: '500' }],
        'headline-sm': ['24px', { lineHeight: '1.3', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '1', letterSpacing: '0.1em', fontWeight: '700' }]
      },
      spacing: {
        'section-gap': '120px',
        'margin-desktop': '64px',
        'container-max': '1280px',
        'gutter': '24px',
        'base': '8px',
        'margin-mobile': '20px'
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px'
      },
      maxWidth: {
        'container-max': '1280px'
      }
    }
  },
  plugins: []
} satisfies Config;
