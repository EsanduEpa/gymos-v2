import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { globals: true, include: ['test/tenancy/**/*.test.ts'], fileParallelism: false, testTimeout: 30_000 },
});
