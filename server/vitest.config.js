import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.js'],
    // Each file boots its own in-memory MongoDB + full seed; running them in
    // parallel overloads constrained hosts and times out teardown. Run files
    // one at a time with a generous hook timeout for reliability.
    fileParallelism: false,
    hookTimeout: 120000,
    testTimeout: 30000,
    // Secrets so JWT signing works; NODE_ENV=test disables rate limiters/logging.
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-access-secret-key-0123456789',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key-0123456789',
      JWT_ACCESS_EXPIRES: '15m',
      JWT_REFRESH_EXPIRES: '7d',
    },
  },
});
