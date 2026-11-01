import { defineConfig } from 'vitest/config';
export default defineConfig({ resolve: { tsconfigPaths: true }, test: {
  globals: true, include: ['test/platform/**/*.integration.test.ts'], fileParallelism: false,
  testTimeout: 30_000, hookTimeout: 120_000,
} });
