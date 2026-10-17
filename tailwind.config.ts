import type { Config } from 'tailwindcss';

/**
 * IEEE Master Brand + Computer Society + Computational Intelligence palette.
 * Rule of thumb: "bright" colors belong on dark navy, "dark" colors on white.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ieee: {
          blue: '#00629B',
          cyan: '#00B5E2',
          'cyan-deep': '#0092BC',
          teal: '#00A8B5',
          navy: '#002855',
          'navy-deep': '#003B5C',
          orange: '#FFA300',
          'orange-dark': '#E87722',
          gold: '#FFC72C',
          yellow: '#FFCD00',
          green: '#00A94F',
          'green-dark': '#658D1B',
          'green-bright': '#84BD00',
          red: '#DA291C',
          'red-dark': '#9D2235',
          purple: '#5E2786',
          'purple-light': '#B148D4',
          gray: '#7C8891',
          black: '#000000',
          white: '#FFFFFF',
        },
        surface: '#F5F7FA',
        hairline: '#E3E8EE',
      },
      fontFamily: {
        sans: ['var(--font-source-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
