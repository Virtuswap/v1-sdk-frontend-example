import type { Config } from 'tailwindcss';
import { nextui } from '@nextui-org/react';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        text: {
          DEFAULT: '#ffffff',
          secondary: '#808191',
        },
        card: {
          background: '#1d2027',
          border: '#33343b',
        },
        accent: '#f15223',
      },
      borderRadius: {
        main: '12px',
      },
    },
  },
  darkMode: 'class',
  plugins: [nextui()],
};
export default config;
