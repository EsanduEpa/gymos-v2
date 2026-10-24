import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['test/pools/**/*.test.mjs'],
    fileParallelism: false,
  },
});
