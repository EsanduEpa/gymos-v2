# GYMOS-MIG-007 — Verification evidence

Date: 24 October 2026, Asia/Colombo. Branch: `codex/gymos-mig-001-010`. Task 007 adds a maintained, disposable two-gym database and real-browser test harness for behavior implemented by tasks 003–006.

## What the harness does

- Creates a new local PostgreSQL 17 container per run, bound only to loopback on a random port. It requires the local Docker Unix-socket context and uses `--pull=never`.
- Records a private run manifest under a mode-0700 temporary directory and writes it with mode 0600. The manifest contains the random run ID, container/image IDs, loopback port and exact created database names, but no database URL or password.
- Rechecks run ID, container ID, image ID, image, ownership label, Docker context, port, database allowlist and per-database random ownership marker before database mutation or cleanup. Cleanup verifies all owned database markers before removing that run's container; it never drops a name-matched external database.
- Creates a fresh Master, Alpha and Beta tenant database through real Prisma migration histories. Tenant fixtures pass the Task 005 verifier/registry observation boundary before the API uses them.
- Seeds test-only identities for Super Admin, two owners, a multi-gym owner, linked trainer/member actors, pending/revoked/forced-password-change and mismatched records, plus 125 Alpha people and 12 Beta people. The fixed test time is 24 October 2026 06:00 UTC; browser locale/time zone are pinned to UTC. The schema has no currency field yet, so no currency fixture is claimed.
- Starts API and web on loopback with a small explicit environment. The runner strips inherited database URLs and signing keys, never loads `.env`, and generates the test JWT key in memory. Playwright uses the installed Google Chrome, a fresh browser context, and keeps screenshots/traces only for failures.
- Replaces the old `verify:milestone` behavior, which loaded `.env` and could delete databases based on a name pattern. The supported command accepts no target arguments and runs only the owned harness.

## Verification results

| Check | Result |
|---|---|
| Run ownership, wrong host/name/port/marker refusal, concurrent runs, failed-run cleanup and rerun | 3/3 disposable PostgreSQL integration tests passed. Two concurrent environments had distinct container IDs, ports and databases; cleaning one left the other queryable. |
| Real browser and HTTP flow | 1/1 Playwright test passed in Google Chrome. It checked pure GET effects, owner login, gym selection, theme, member creation, denied cross-gym access, current trainer denial, and Super Admin gym listing. |
| Physical database results | Alpha started with 127 members (125 bulk people plus linked/test actors) and ended with 128 after one browser-created member. Beta remained at 12. The two `GymConfiguration.masterGymId` values point to their separate Master gym IDs. |
| Cleanup | Browser run removed all six owned databases by removing its labelled disposable container and removed its private manifest. The ownership suite also removed its parallel-test containers. A local Docker inventory showed no remaining `gymos.test.run` containers. |
| API/web TypeScript checks and lint | Passed. |
| API build and web production build | Passed; web build used `next build --webpack`. |

Commands:

```sh
pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false
pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false
pnpm --dir apps/api lint
pnpm --dir apps/web lint
pnpm --dir apps/api build
pnpm --dir apps/web exec next build --webpack
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.environment-integration.ts --disableConsoleIntercept
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated
```

All database tests used newly created, labelled local containers after explicit local Docker approval. No V1, shared development or production database was accessed.

## Coverage limits

This harness proves only current V2 routes and schema behavior. It does not claim working member/trainer portal pages, forced-password-change screens, full enrollment, sessions, currency, payment, mobile behavior, or production backup and restore. Those belong to later migration tasks. Failure traces/screenshots are ignored under `apps/web/test-results/`; the successful browser run produced no retained screenshot or trace.

Task 007 is Completed. Task 008 can now add these separate database and browser jobs to CI using the explicit `GYMOS_TEST_ALLOW_DOCKER=1` boundary.
