import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { colors, fonts } from './src/lib/theme';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      fontFamily: fonts,
      maxWidth: { page: '1440px' },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': Object.fromEntries(
          Object.entries(colors).map(([name, value]) => [`--${name}`, value]),
        ),
      });
    }),
  ],
} satisfies Config;
