import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Removes whatever the previous test rendered, so each test starts clean.
afterEach(() => {
  cleanup()
})
