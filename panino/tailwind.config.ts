import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Panino — extraída del sistema de diseño
        panino: {
          orange: '#f97316',       // Identidad principal
          'orange-light': '#fff7ed',
          'orange-dark': '#c2410c',
        },
        // Badges del sistema de libretos (del archivo HTML subido)
        hook: {
          bg: '#EEEDFE',
          text: '#3C3489',
        },
        detras: {
          bg: '#E1F5EE',
          text: '#085041',
        },
        social: {
          bg: '#FAEEDA',
          text: '#633806',
        },
        producto: {
          bg: '#FAECE7',
          text: '#712B13',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}

export default config
