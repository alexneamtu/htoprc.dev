/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      colors: {
        // htop color scheme colors will go here
        htop: {
          bg: '#0d0d0d',
          fg: '#cccccc',
          header: '#005577',
          selection: '#333333',
        },
      },
    },
  },
  plugins: [],
}
