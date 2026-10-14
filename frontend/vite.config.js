import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configuration used only by Vitest (npm test).
  test: {
    // jsdom simulates a browser (document, window) inside Node, so React
    // components can be rendered without opening a real browser.
    environment: 'jsdom',
    // Adds matchers like toBeInTheDocument() to every test file.
    setupFiles: './src/test/setup.js',
  },
})
