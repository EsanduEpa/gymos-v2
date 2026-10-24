# GYMOS-MIG-011 — V1 Classic semantic tokens

Status: **In Progress — implementation committed; responsive browser evidence remains.**

- Implementation revision: `ff612cf` (`Add V1 Classic semantic theme tokens`), branch `codex/gymos-mig-001-010`.
- Decision prerequisite: DEC-10 approved as written by Esandu, project owner/Product, 25 October 2026; see [DEC-10](../decisions/DEC-10.md) and [Task 086 evidence](GYMOS-MIG-086.md).
- Changed files: `packages/theme-tokens/{package.json,tsconfig.json,src/classic.ts,test/classic.test.mjs}`, `apps/web/package.json`, `apps/web/src/app/{globals.css,layout.tsx,gyms/[slug]/page.tsx}`, and workspace `pnpm-lock.yaml`.
- Environment: local V2 workspace, Node 24.22.0, pnpm 9.15.0; no database connection or V1 source/runtime changes.
- `pnpm --dir packages/theme-tokens test` — exit 0; 4 tests passed (separate brand/status colors, safe invalid-color fallback, distinct fixture gym accents sharing Classic surface/border values, and WCAG AA 4.5:1 status text contrast).
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — exit 0.
- `pnpm --dir apps/web lint` — exit 0.
- `pnpm --dir apps/web build` — exit 0; Next.js production build completed.
- `git diff --check` — exit 0.
- The global stylesheet retains its existing layout rules and responsive breakpoints; gym branding changes only `--gym-color`, and invalid values resolve to the Classic green. No actual browser screenshots were captured at 1440, 768, 390 or 320 pixels, so rendered two-gym geometry and responsive visual acceptance remain unverified and are not claimed complete.
- No DB/schema/API changes. No V1 source edits, production deployment, or hosted V2 configuration inspection.

Next: include these token values in the visual capture/review at the DEC-10 widths under Task 065. Keep Task 011 In Progress until the required rendered visual evidence is attached or the acceptance criteria are formally changed.
