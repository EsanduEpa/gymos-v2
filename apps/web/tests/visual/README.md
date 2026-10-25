# Disposable V1 visual baseline (GYMOS-MIG-014)

This capture harness runs the original V1 presentation with synthetic data, outside the original checkout. It does not start V2 product servers or use repository `.env` files. Its spec is excluded from the ordinary `*.e2e.spec.ts` suite and runs only with its dedicated configuration.

Requirements: Node 24, pnpm, locally installed Playwright Chromium, local Docker Unix-socket context with `postgres:17` already available, and the clean sibling `../gymos` checkout at `058aa8532741c4cb84289589fd2cf89282882988` with its installed dependencies. No package/image download occurs. A changed or dirty V1 revision fails before copying source. Each run replaces this task's generated image directory; use Git to retain previous captures.

From the V2 root:

```sh
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.v1-visual.ts
node apps/web/tests/visual/verify-v1-evidence.mjs
pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false
pnpm --dir apps/web lint
```

The first command creates a labelled, loopback-only PostgreSQL container using the Task 007 ownership helper and a temporary copy of tracked V1 source. It generates a fresh V1 Prisma client only in that copy, seeds synthetic rows, starts Next there and captures original components. No caller-supplied database URL is accepted. The V1 source/global generated client and existing `.next` metadata must match before and after. Owned databases, server, copy and private ownership manifest are cleaned up after the browser run.

The verifier checks all 26 baseline screens at 1440/768/390/320, required conditional states on desktop/mobile, evidence hashes, scenario assertions and cleanup. It generates `verification.json` and a self-contained local `gallery.html`. A missing state/image, stale harness hash, failed scenario, source change or incomplete cleanup fails verification.

`v1-fixture.ts` is the reproducible synthetic fixture definition; `synthetic-records.json` is the portable data projection for later V2 fixture adapters. Fixture IDs express local relationships and are not imported V1 customer IDs. No passwords/hashes are exported. Original V1 business defects and deferred billing controls remain reference observations, not V2 requirements. See the task's evidence report for exact capture adaptations, source limitations and intentionally unavailable states.

If a worker is forcibly interrupted, keep its private ownership manifest and verify the exact container ID, image, run label, local Docker context and loopback binding before cleanup. Never remove a container or database merely because its name looks similar. Resume with a fresh run after verified cleanup; incomplete captures cannot pass the verifier.
