import { defineConfig } from 'vitest/config';
export default defineConfig({ resolve: { tsconfigPaths: true }, test: { globals: true, include: ['test/support/visible-walkthrough.fixture.ts'],
  fileParallelism: false, testTimeout: 3_600_000, hookTimeout: 120_000 } });
