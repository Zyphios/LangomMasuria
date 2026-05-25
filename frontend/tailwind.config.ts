import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pine: '#1F3B2C',
        sand: '#F4EFE6',
        lake: '#6FA8BF'
      }
    }
  },
  plugins: []
} satisfies Config;
