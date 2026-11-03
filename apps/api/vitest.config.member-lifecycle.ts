import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { globals: true, include: ['test/members/member-lifecycle.integration.test.ts'], fileParallelism: false, testTimeout: 120_000, hookTimeout: 120_000 },
});
