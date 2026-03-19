import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "gov-blue": {
          100: "var(--gov-blue-100)",
          200: "var(--gov-blue-200)",
          700: "var(--gov-blue-700)",
          800: "var(--gov-blue-800)",
          900: "var(--gov-blue-900)",
        },
        "gov-aqua": {
          50: "var(--gov-aqua-100)",
          100: "var(--gov-aqua-100)",
          200: "var(--gov-aqua-200)",
          700: "var(--gov-aqua-700)",
        },
        "gov-neutral": {
          50: "var(--gov-neutral-50)",
        },
      },
      fontSize: {
        'hero-title': ['3rem', { lineHeight: '1.05', fontWeight: '800' }],
        'section-title': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
        subheading: ['0.875rem', { lineHeight: '1.5', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.75' }],
        'button-text': ['0.875rem', { lineHeight: '1.25', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
export default config;
