import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { globals: true, include: ['test/member-applications/**/*.integration.test.ts'], fileParallelism: false,
    testTimeout: 120_000, hookTimeout: 120_000 },
});
