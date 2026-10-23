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

## Remaining validation

The dedicated verifier/gate integration cases and task 006 bounded-pool integration remain to be added before marking this task fully complete.

## Checkpoint review — 24 October 2026

Task 005 is in progress and this checkpoint does not claim it complete. DEC-04 and DEC-05 are already owner-approved, so no further product decision or credential is required for the remaining isolated implementation/testing.

- API no-emit TypeScript check and lint passed.
- API unit suite: 16 tests passed.
- Tenant migration source checksum test: 1 test passed.
- Shared contracts/API client suites: 17 and 12 tests passed respectively.
- Current tracked and nonignored source scan: 164 text files, zero matches for the remote PostgreSQL credential URL, private key, GitHub token and AWS access-key patterns checked. This limited scan is not evidence of external credential revocation.
- V1 worktree was clean at HEAD `058aa8532741c4cb84289589fd2cf89282882988`.
- Task 004 completion evidence was reviewed and its four status views synchronized; task 005 is explicitly recorded as in progress.
