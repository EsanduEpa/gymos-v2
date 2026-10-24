# GYMOS-MIG-005 Evidence

## Scope

Tenant template registry, exact schema manifest, verifier attestation, and the Master-side tenant readiness gate are implemented. The isolated test harness now supports run-owned `gymos_<32-hex>` databases for provisioning-shaped fixtures.

## Verification

- API TypeScript check: passed.
- Existing isolated operations integration suite: 10 tests passed.
- Test command: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.operations.ts --no-file-parallelism`
- The suite ran against a fresh local Docker PostgreSQL container and completed with cleanup.

## Controlled artifacts

- Tenant manifest: `apps/api/src/tenancy/tenant-template-manifest.ts`
- Schema verifier: `apps/api/src/tenancy/tenant-schema-verifier.ts`
- Readiness gate: `apps/api/src/tenancy/tenant-schema-gate.service.ts`
- Registry CAS transition: `apps/api/src/tenancy/tenant-registry.service.ts`
- Tenant schema migration checksum: `17aff169a09479b9657a7387a49fcff73263ea8f21abcc3301d07ae153687a39`

## Final integration verification — 24 October 2026

Task 005 is complete. The dedicated disposable-PostgreSQL suite passed **19/19 tests** in 11.05 seconds and its ownership-checked teardown removed all six run databases and the labelled container. It covered:

- two distinct physical tenant bindings and a successful verified member write;
- immutable binding and swapped-target rejection;
- missing `GymConfiguration` and `SchemaState` independently;
- APPLYING, FAILED and REPAIR_REQUIRED denial;
- tenant version and Master expectation/operation mismatch denial;
- changed, unfinished and extra migration history;
- missing/changed table, column, enum, index, constraint and trigger postconditions;
- unsupported API compatibility;
- zero domain callbacks for every failed gate;
- unavailable tenant selection and unavailable Master access as sanitized 503 responses;
- registry `Gym.version` CAS, atomic `mv1` audit, injected-audit rollback and lost-observation recovery from actual tenant evidence;
- member list/create behavior, cross-tenant row isolation, safe duplicate-email 409 and preservation of post-gate domain errors.

The isolated identity and operations regression suites also passed 8/8 and 10/10 against the full additive migration chain. The tenant source-manifest test passed 1/1. API unit tests passed 16/16 before the final Master-outage test was added; that added test passed 1/1 independently. API typecheck, lint and build passed. Shared contracts and API-client builds/typechecks passed with 17/17 and 12/12 tests. Web typecheck/lint passed; the normal Turbopack build was environment-blocked first by the external font fetch and then by its restricted local helper port, while `next build --webpack` completed successfully with all routes generated.

Commands included:

```sh
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.operations.ts
pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts
pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false
pnpm --dir apps/api lint
pnpm --dir apps/api build
pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false
pnpm --dir apps/web lint
pnpm --dir apps/web exec next build --webpack
```

V1 remained clean at HEAD `058aa8532741c4cb84289589fd2cf89282882988`. No existing/shared/V1 database was accessed. The public legacy provisioning flow still does not produce the durable operation/verification observation required by this gate; it therefore fails closed for member traffic. Tasks 021–023 own that full lifecycle. Task 007 verified fixtures must use the internal operation/verifier path and may not fabricate readiness.

Final source hashes:

- Master registry migration: `0ff42b72716b38b8f478c7bfd0eb281d89ed4650ce5d3a304f059feeee5ebde7`
- Tenant registry migration: `17aff169a09479b9657a7387a49fcff73263ea8f21abcc3301d07ae153687a39`
- Manifest: `a70e08b1d711a0cf490ac65dc57e3fac4b0a4711b81ec5d831094b7c26a1b24b`
- Verifier: `b581f22ac3d56112493f71778b2b70c77c38efccd91c0ea964a4c7e4af8148dd`
- Gate: `33552c2459367de93e311e5ff7d68061bbe6a0b94086ea8cfb7e264ef116da4b`
- Registry: `a3bb9a3b870e6fa70b5932f1028316cc33fb4cd4fbc672516d6ce284e533a1ad`
- Integration suite: `8db7536d7b630911bd42704daa5a0d3bd6081c8fa5dbf2b6b250d091ed86c74a`

## Checkpoint review — 24 October 2026

Task 005 is in progress and this checkpoint does not claim it complete. DEC-04 and DEC-05 are already owner-approved, so no further product decision or credential is required for the remaining isolated implementation/testing.

- API no-emit TypeScript check and lint passed.
- API unit suite: 16 tests passed.
- Tenant migration source checksum test: 1 test passed.
- Shared contracts/API client suites: 17 and 12 tests passed respectively.
- Current tracked and nonignored source scan: 164 text files, zero matches for the remote PostgreSQL credential URL, private key, GitHub token and AWS access-key patterns checked. This limited scan is not evidence of external credential revocation.
- V1 worktree was clean at HEAD `058aa8532741c4cb84289589fd2cf89282882988`.
- Task 004 completion evidence was reviewed and its four status views synchronized; task 005 is explicitly recorded as in progress.
