import { defineConfig } from 'vitest/config'

// Unit tests live in test/; the e2e specs under e2e/ are Playwright's and must not be picked up by
// Vitest's default *.spec.ts glob.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
})
