import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { globals: true, include: ['test/tenancy/tenant-template-manifest.test.ts', 'test/tenancy/master-template-manifest.test.ts'], fileParallelism: false, testTimeout: 30_000 },
});
