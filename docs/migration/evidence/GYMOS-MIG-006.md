# GYMOS-MIG-006 — Verification evidence

Date: 24 October 2026, Asia/Colombo. Branch: `codex/gymos-mig-001-010`. The task snapshot is based on checkpoint `4105398`; the completion revision is the Git commit containing this evidence file.

## Implemented

- Replaced the unbounded tenant Prisma-client map with reference-counted callback leases: eight resident tenant clients, two PostgreSQL connections per tenant pool, 64 queued admissions, a three-second admission deadline, five-second statement timeout, 60-second idle eviction and ten-second drain reporting.
- Kept database selection server-side and validated database identifiers and connection URL options before pool allocation. Availability, timeout and saturation failures become a fixed retryable 503 without database names, URLs or driver messages; domain errors remain unchanged.
- Added independent Master and provisioning pools capped at four and one connections. Provisioning work is serialized by a process-wide admission queue.
- Enabled Nest closing-request 503 behavior and SIGTERM/SIGINT shutdown hooks. Tenant shutdown stops admission, rejects queued work, preserves active callbacks until release and closes idle/drained resources; Master and provisioning pools close during application shutdown.

## Verification

| Check | Result |
|---|---|
| Lease, pool-config and provisioning-admission unit suite | 22/22 passed across three files. |
| Disposable PostgreSQL pool integration suite | 5/5 passed in 74.13 seconds. It covered ninth-tenant saturation, actual pool caps, a real five-second statement timeout, protected active work during shutdown and a real 60-second idle eviction. |
| Focused actual-capacity test after query correction | 1/1 passed; Master max 4, tenant max 2 and provisioning max 1 were read from the actual configured pools while concurrent queries were active. |
| Measured tenant connections | Eight active tenant keys produced 8 `pg_stat_activity` rows tagged `gymos-api-tenant`, within the maximum of 16. The ninth key returned a sanitized retryable 503 without allocating an overflow client. |
| Cleanup | The focused measured run dropped all 13 owned databases and removed its labelled disposable PostgreSQL container. The passing full suite also completed its ownership-checked teardown. |
| Task 005 regression | 19/19 disposable PostgreSQL tenant gate tests passed through the bounded lease API in 10.08 seconds. |
| API static checks | No-emit TypeScript check, type-aware lint and production build passed. |

Commands:

```sh
pnpm --dir apps/api exec vitest run --config vitest.config.pools.ts
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.pools-integration.ts
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.pools-integration.ts -t 'admits eight active' --disableConsoleIntercept
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts
pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false
pnpm --dir apps/api lint
pnpm --dir apps/api build
```

The first sandboxed Docker attempt was refused by the local Docker socket and produced no database result. All claimed database results came from approved, labelled, disposable local containers. No V1 or shared database was accessed.

## Acceptance

- The ninth busy tenant cannot overflow the eight-client cache.
- Active work survives eviction and shutdown drain; new and queued admission fails safely once draining begins.
- Idle and drained clients close, and failed closes remain counted/quarantined instead of allowing capacity overflow.
- Statement/admission failures are retryable sanitized 503 responses.
- The task 005 verifier and domain callback share one protected lease, and verifier rejection still executes zero domain work.

Task 006 is Completed. Task 007 can reuse these limits and lifecycle rules in its maintained multi-gym browser/database harness.
