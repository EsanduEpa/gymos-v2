import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { globals: true, include: ['test/session-lifecycle/**/*.integration.test.ts'], fileParallelism: false, testTimeout: 60_000, hookTimeout: 120_000 },
});
