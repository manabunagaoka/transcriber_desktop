import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        gray: {
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        blue: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        red: {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      animation: {
        'sound-wave': 'soundWave 0.5s infinite alternate',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-blue-500',
    'bg-blue-600',
    'bg-blue-700',
    'bg-red-500',
    'bg-red-600',
    'bg-red-700',
    'bg-gray-700',
    'bg-gray-800',
    'bg-gray-900',
    'animate-sound-wave',
    'animate-pulse',
  ]
}

export default config