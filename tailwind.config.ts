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
      /**
       * Gradients combine only brand colors, so the palette stays IEEE / CS /
       * CIS-correct. Dark-surfaced gradients are for navy sections and for
       * anything carrying white text; the white-surface gradient backs light
       * cards, keeping "bright on navy, dark on white".
       */
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #002855 0%, #003B5C 55%, #00629B 135%)',
        'gradient-navy-soft': 'linear-gradient(135deg, #003B5C 0%, #002855 100%)',
        /** The hall display: deep navy ground with brand light from two corners. */
        'gradient-tv':
          'radial-gradient(1100px 560px at 100% -8%, rgba(0, 181, 226, 0.20), transparent 62%), radial-gradient(900px 520px at -12% 108%, rgba(0, 98, 155, 0.38), transparent 60%), linear-gradient(135deg, #003B5C 0%, #002855 100%)',
        'gradient-blue': 'linear-gradient(135deg, #00629B 0%, #003B5C 120%)',
        'gradient-cyan': 'linear-gradient(135deg, #0092BC 0%, #00A8B5 100%)',
        'gradient-orange': 'linear-gradient(135deg, #E87722 0%, #FFA300 100%)',
        'gradient-gold': 'linear-gradient(135deg, #E87722 0%, #FFC72C 100%)',
        'gradient-green': 'linear-gradient(135deg, #658D1B 0%, #00A94F 100%)',
        'gradient-red': 'linear-gradient(135deg, #9D2235 0%, #DA291C 100%)',
        'gradient-surface': 'linear-gradient(160deg, #FFFFFF 0%, #F5F7FA 100%)',
      },
      boxShadow: {
        /** Resting card elevation — a top highlight plus a navy-tinted drop. */
        card: 'inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 1px 2px rgba(0, 40, 85, 0.06), 0 1px 3px rgba(0, 40, 85, 0.04)',
        /** Hover/emphasis for interactive cards. */
        raised: '0 6px 16px rgba(0, 40, 85, 0.10)',
        /** Floating elements: dialogs, dropdowns. */
        pop: '0 12px 32px rgba(0, 40, 85, 0.16)',
        /** Brand glows, tuned to the gradient each one sits under. */
        'glow-blue': '0 10px 26px -8px rgba(0, 98, 155, 0.60)',
        'glow-orange': '0 10px 26px -8px rgba(232, 119, 34, 0.60)',
        'glow-green': '0 10px 26px -8px rgba(0, 169, 79, 0.55)',
        'glow-red': '0 10px 26px -8px rgba(157, 34, 53, 0.55)',
        /** A hairline of light along the top edge of a dark gradient. */
        'inset-sheen': 'inset 0 1px 0 rgba(255, 255, 255, 0.22)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
