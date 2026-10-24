import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    include: ['test/pools/**/*.integration.test.ts'],
    fileParallelism: false,
    testTimeout: 90_000,
    hookTimeout: 120_000,
  },
});
