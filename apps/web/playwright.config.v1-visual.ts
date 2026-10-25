import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  testMatch: 'v1-baseline.spec.ts',
  workers: 1,
  timeout: 2_700_000,
  reporter: [['list']],
  expect: { timeout: 20_000 },
  outputDir: 'test-results/v1-baseline',
  use: { browserName: 'chromium', headless: true, locale: 'en-US', timezoneId: 'UTC', deviceScaleFactor: 1 },
});
