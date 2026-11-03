import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { globals: true, root: './', include: ['test/sessions/session-booking.integration.test.ts'] },
});
