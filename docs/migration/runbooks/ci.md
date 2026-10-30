# GYMOS V2 CI and local checks

The pull-request workflow is `.github/workflows/ci.yml`. It pins Node.js 24.22.0 and pnpm 9.15.0, installs with the committed lockfile, and caches pnpm data using `pnpm-lock.yaml` as its cache key. Build, lint, type-check, unit-test, secret-scan and dependency-review jobs are separate from the disposable PostgreSQL and browser jobs.

Build and code-check jobs receive no database URLs, passwords or JWT secret. The integration and browser jobs receive only `GYMOS_TEST_ALLOW_DOCKER=1`; Task 7 creates random database passwords and JWT material inside its owned local Docker run. No CI database service credentials are stored in GitHub secrets. The test runner refuses database mutation unless the explicit opt-in is present.

## Local commands

Run these commands from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm check:workspace
pnpm prepare:checks
pnpm build:workspace
pnpm lint:workspace
pnpm typecheck:workspace
pnpm test:unit
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:database:owned
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated
```

The browser command requires the pinned Playwright Chromium build. Install it with `pnpm --dir apps/web exec playwright install chromium`; hosted CI installs Chromium and its system dependencies in the browser job. Database and browser commands start disposable PostgreSQL containers and clean up only containers they own.

## Environment names

The API uses `MASTER_DATABASE_URL`, `TENANT_DATABASE_URL`, and `PROVISION_DATABASE_URL` when it connects to the three database roles. Authentication uses `JWT_SECRET` (at least 32 bytes). Local development may provide these through a private ignored environment file. Never commit values. Ordinary CI jobs need none of these names. The isolated test runner generates disposable connection URLs and a test-only JWT secret at runtime. `GYMOS_TEST_ALLOW_DOCKER=1` is a test-mutation opt-in, not a database credential.

An unset required API setting fails with a sanitized configuration error when the relevant API service starts. Do not print connection URLs, passwords, JWT values, key material, raw Playwright traces or failure contexts into shared logs. Keep CI artifacts to the generated status summary; it contains only the job result and revision and is retained for seven days. Browser traces and screenshots remain in the job workspace and are not uploaded.

## Workspace packages

`pnpm check:workspace` verifies unique workspace package names, declared `workspace:` dependencies and package export targets/build scripts. `@gymos/contracts` and `@gymos/api-client` are real workspace packages and build before dependent packages through pnpm's dependency order. Database schema directories are Prisma inputs referenced by root configuration, not JavaScript packages. The theme-token directory has no imports and remains empty rather than exporting a dummy package.

## Hosted verification

The workflow runs on pull requests. A local run proves the same checked-in commands and disposable suites but does not replace a hosted pull-request run. Record the actual revision and CI run URL in `docs/migration/evidence/GYMOS-MIG-008.md` after the repository is connected to a Git remote and the workflow has run. A skipped or unavailable hosted job is not a passing result.

## Clean-runner prerequisites

Every code-consuming hosted job runs `pnpm prepare:checks` to generate both Prisma clients from schemas without database URLs and build shared package exports. Generated clients and package dist files are ignored outputs and are absent from a fresh checkout. Database/browser/recovery jobs explicitly pull `postgres:17` before the ownership-safe harness invokes `docker run --pull=never`. Browser jobs build both applications before starting production servers.

`.gitleaksignore` lists only exact reviewed historical fingerprints for preservation-file SHA digests, policy prose, and the upstream Nest README demonstration badge token. It does not exclude files, disable rules or allow future credentials. The placeholder badge token was removed from the current README.
