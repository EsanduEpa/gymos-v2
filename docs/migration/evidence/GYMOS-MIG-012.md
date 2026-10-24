# GYMOS-MIG-012 — Accessible shared UI primitives

Status: **Completed.** Reusable controls now provide consistent buttons, fields, feedback, cards, status badges, empty/loading states, page statistics, tabs, tables with paging, confirmation dialogs, and chart framing.

- Implementation revision: `76db2ac` (`Build accessible shared UI primitives`), branch `codex/gymos-mig-001-010`.
- Dependency: GYMOS-MIG-011 is Completed with linked evidence.
- Changed surfaces: the sign-in, Super Admin, and gym workspace screens now consume the shared controls. Existing labels, messages, gym colors, role checks, and server actions remain unchanged.
- Dialog behavior: opening moves focus inside; Tab and Shift+Tab wrap within the dialog; native modal behavior makes the page behind it inert; Escape and backdrop dismiss only while idle; closing restores focus to the opener. A failed action leaves the dialog open and preserves the entered draft.
- Duplicate prevention: pending confirmation disables both dialog actions and the focused browser check records exactly one confirmation attempt after a forced second click. Backend idempotency remains authoritative for later mutation tasks.
- Responsive behavior: tabs scroll horizontally, tables have a dedicated horizontal scroll area, and pager/dialog controls stack at narrow widths. The 320px browser check reports no document-level horizontal overflow.
- Guarded test surface: `/test-ui` returns not found unless `GYMOS_UI_TEST_HARNESS=1` is present in the server environment. It contains synthetic data only and exists to exercise controls in Chromium.
- `pnpm --dir apps/web lint` — exit 0.
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — exit 0.
- `pnpm --dir apps/web build` — exit 0; Next.js 16.4.2 production build includes the dynamically rendered guarded test route.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated` — exit 0; 3 Playwright tests passed in bundled Chromium. The owned runner removed all six disposable databases, its labelled container, and its private manifest.
- Browser acceptance covered keyboard-only tab, table/pager and confirmation flows; disabled-tab skipping; error draft retention; pending duplicate prevention; Escape dismissal; opener focus restoration; 320×700 layout; existing two-gym isolation; and Classic visual checks.
- Evidence capture: [320px shared controls](GYMOS-MIG-012/mobile-320-shared-controls.png).
- `git diff --check` — exit 0 before the implementation commit.
- No Prisma, database, API, authorization, V1 source, or production configuration change was made. Database integration and API role-negative cases were not repeated because this presentation-only task changed neither boundary; the existing isolated two-gym browser/API case passed in the same run.
- `FormattedDate` and `TrainerPayChart` remain intentionally omitted because they are unused, as required by the task specification.

Task 012 is complete. Task 014 is now eligible by dependency; Task 013 still depends on Tasks 018 and 019.
