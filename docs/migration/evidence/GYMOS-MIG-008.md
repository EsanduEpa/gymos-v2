# GYMOS-MIG-008 evidence

Date: 25 October 2026
Latest local revision tested: `06b8207`
Status: CI implementation and local checks complete; hosted pull-request run pending because this checkout has no Git remote.

## Implemented

- Added `.github/workflows/ci.yml` with separate workspace install, build, lint, type-check, unit, owned database, browser, secret scan, pull-request dependency review and lockfile audit jobs.
- Pinned Node.js to `24.22.0`, pnpm to `9.15.0`, and configured the pnpm cache against `pnpm-lock.yaml`.
- Build and code-check jobs have no database URLs or JWT secret. Only disposable database/browser jobs set `GYMOS_TEST_ALLOW_DOCKER=1`; the Task 7 runner creates its own random service credentials.
- Added workspace package graph validation. Contracts, API client and theme-token packages have manifests, exports and build targets; schema directories remain Prisma inputs.
- Added names-only environment guidance at `docs/migration/runbooks/ci.md`.
- Pinned Playwright to its bundled Chromium for consistent local and CI browser execution.
- Registry audit initially identified vulnerable transitive versions of `undici`, `tmp`, `body-parser` and `multer`. Exact pnpm overrides now resolve to patched releases, and the updated lockfile audit reports no known vulnerabilities at the configured high threshold.
- CI retains only a safe status/revision summary for seven days. It does not upload browser traces, screenshots, raw output or credentials.

## Local verification

All commands ran from the repository root with Node `v24.22.0` and pnpm `9.15.0`.

| Command | Result |
| --- | --- |
| `CI=1 pnpm install --frozen-lockfile` | Passed; lockfile current, clean install completed |
| `pnpm check:workspace` | Passed; 5 workspace packages validated |
| `pnpm build:workspace` | Passed; API, web, contracts, API client and theme tokens built |
| `pnpm lint:workspace` | Passed |
| `pnpm typecheck:workspace` | Passed |
| `pnpm test:unit` | Passed after repairing the pool-test configuration; contracts 17, API client 12, theme tokens 5, API source 17 and pool lifecycle 23 tests |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:database:owned` | Passed; 3/3 ownership/cleanup tests |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated` | Passed; 2/2 real-browser tests covering isolation plus Classic responsive/contrast/fallback behavior; 6 owned databases and container cleaned |
| `pnpm audit --audit-level high` | Passed; no known vulnerabilities at high severity |

The first Webpack-free build attempt hit the local sandbox's blocked helper port. The normal build script now uses Webpack; the workspace production build then passed. The first browser attempt reported that the pinned browser was not installed locally; after installing Chromium, the real browser test passed. These were setup/environment corrections, not passing test results.

## Hosted checks not run

`git remote` returns no configured remote. No pull request or hosted workflow run exists, so GitHub secret scanning and its dependency-review action have not executed on this revision. The workflow is committed for the first pull request. Do not treat its hosted jobs as passed until that run succeeds. V1 credential revocation, reuse investigation and external access review remain Task 10 evidence and are not inferred from this local dependency audit.
