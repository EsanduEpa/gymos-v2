# Isolated GymOS V2 test environment

This runner creates its own temporary PostgreSQL container and databases for local integration and browser tests. It never reads the repository `.env` file and does not accept an existing database URL.

## Requirements

- Node.js 24 and pnpm 9.15.0
- A local Docker context that uses a Unix socket
- The `postgres:17` image already available locally (`--pull=never` is used)
- Google Chrome installed for the browser test
- API and web production builds (`pnpm --dir apps/api build` and `pnpm --dir apps/web exec next build --webpack`)

## Run the checks

```sh
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.environment-integration.ts
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated
```

The first command checks run ownership, wrong-target refusal, concurrent isolation, and cleanup after a failed run. The second creates real Master and tenant databases, applies the reviewed Prisma migrations, seeds synthetic accounts and people, starts API and web servers on loopback, then runs the Chrome test. The test-only database permission is required explicitly for both commands.

## Resource safety

Each run receives a random ID, a newly created container with that run label, a recorded container/image ID, and a random loopback port. The ownership manifest is written outside the repository with private directory and file permissions. It records exact run-owned database names; passwords and URLs are not written to it.

Every database mutation first checks the local Docker context, container ID, image, label, loopback port, allowed database name, and per-database ownership marker. Cleanup disconnects application clients, verifies each owned database marker, and removes only that run's container. A mismatch stops cleanup and leaves the manifest for inspection. Parallel runs use different containers and cannot share rows.

The runner starts API and web with a small explicit environment. It removes inherited Master, tenant, provisioning and JWT values, creates a test-only signing key in memory, and never loads `.env`. Build and ordinary unit-test commands do not start this runner.

## Fixture and coverage limits

Fixtures are made only after real migrations and task005 schema verification. They include separate Alpha and Beta gyms, owners, a Super Admin, a multi-gym owner, linked trainer/member records, pending, revoked, forced-password-change, and mismatched identity cases, 125 Alpha people plus linked actors, and 12 Beta people. The fixed test clock is 24 October 2026 06:00 UTC; browser locale and time zone are pinned to UTC. Currency fields are not seeded because the implemented schema does not yet define them.

The browser test covers login, Super Admin gym listing, owner access, gym theme, member creation, forbidden cross-gym access, trainer denial under the current API, physical tenant separation, persisted row counts, and GET requests that do not change stored effects. Member and trainer portal screens, forced-password-change UI, full enrollment behavior, production provisioning/recovery, mobile screens, and currency behavior belong to later tasks and are not claimed as implemented here.

Playwright stores failure screenshots and traces under the ignored `apps/web/test-results/` directory. Successful runs keep no screenshots or traces.
