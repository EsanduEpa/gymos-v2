import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    include: ['test/sessions/**/*.integration.test.ts', 'test/session-requests/**/*.integration.test.ts',
      'test/session-lifecycle/**/*.integration.test.ts', 'test/session-reads/**/*.integration.test.ts',
      'test/notifications/**/*.integration.test.ts', 'test/finance/segment08.integration.test.ts'],
    fileParallelism: false, testTimeout: 60_000, hookTimeout: 120_000,
  },
});
