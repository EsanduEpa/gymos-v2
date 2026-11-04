import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'owner-session-booking.e2e.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: 'test-results/owner-session-booking',
  use: { browserName: 'chromium', headless: false, locale: 'en-US', timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' },
});
