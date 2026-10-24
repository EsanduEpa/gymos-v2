# GYMOS-MIG-011 — V1 Classic semantic tokens

Status: **Completed.** V1 Classic tokens, safe branding fallback, readable custom-color foregrounds, visible focus and responsive two-gym browser checks are implemented and verified.

- Initial implementation revision: `ff612cf`; completion revision: `06b8207` (`Complete Classic theme verification`), branch `codex/gymos-mig-001-010`.
- Decision prerequisite: DEC-10 approved as written by Esandu, project owner/Product, 25 October 2026; see [DEC-10](../decisions/DEC-10.md) and [Task 086 evidence](GYMOS-MIG-086.md).
- Changed files: theme-token package and tests; web global styles, layout, gym page and browser test; public theme fallback literal; root unit-test command; workspace package/lock declarations; synthetic visual evidence below.
- Environment: local V2 workspace, Node 24.22.0, pnpm 9.15.0; no database connection or V1 source/runtime changes.
- `pnpm test:unit` — exit 0; contracts 17, API client 12, theme tokens 5, API source 17 and pool lifecycle 23 tests passed. The prior root command incorrectly invoked a `.mjs` file through the default `.spec.ts` Vitest include; it now uses the dedicated pools configuration and includes the theme-token tests.
- `pnpm lint:workspace` and `pnpm typecheck:workspace` — exit 0.
- `pnpm build:workspace` — exit 0; all five built packages/applications completed, including the Next.js production build.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated` — exit 0; 2 Playwright tests passed in bundled Chromium. The owned runner removed all six databases, its labelled container and private manifest.
- `git diff --check` — exit 0.
- Browser acceptance used two distinct fixture accents (`#0F766E` and `#7C3AED`) at 1440×1000, 768×1024, 390×844 and 320×700. It asserted identical banner geometry, no horizontal overflow, visible keyboard focus, and at least 4.5:1 foreground/background contrast for the gym banner and active status. Missing and malformed brand values both resolved to Classic `#007A35`.
- Evidence captures: [desktop Alpha](GYMOS-MIG-011/desktop-1440-alpha.png), [desktop Beta](GYMOS-MIG-011/desktop-1440-beta.png), [tablet Alpha](GYMOS-MIG-011/tablet-768-alpha.png), [tablet Beta](GYMOS-MIG-011/tablet-768-beta.png), [mobile Alpha](GYMOS-MIG-011/mobile-390-alpha.png), [mobile Beta](GYMOS-MIG-011/mobile-390-beta.png), [320 Alpha](GYMOS-MIG-011/stress-320-alpha.png), [320 Beta](GYMOS-MIG-011/stress-320-beta.png), and [safe fallback](GYMOS-MIG-011/mobile-390-safe-fallback.png).
- The public theme response shape is unchanged; its missing-theme default changed from the old blue scaffold to approved Classic green. No DB/schema changes, V1 source edits, production deployment, or hosted V2 configuration inspection.

Task 012 may proceed. Task 065 still owns whole-product visual/accessibility acceptance after the remaining screens exist; it does not reopen this completed token baseline.
