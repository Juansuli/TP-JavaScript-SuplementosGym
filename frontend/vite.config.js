import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

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
    // e2e/ holds the Playwright tests (npm run test:e2e), which need a real
    // browser and the backend running, so Vitest must not pick them up.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
