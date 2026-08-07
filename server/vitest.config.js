import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 10000,
    // These are integration tests sharing one real MongoDB test database
    // (see tests/setup.js) — running test files in parallel means one
    // file's afterEach cleanup can wipe data mid-test in another file.
    fileParallelism: false,
  },
})
