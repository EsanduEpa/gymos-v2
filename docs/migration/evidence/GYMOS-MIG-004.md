# GYMOS-MIG-004 — Verification evidence

Date:24 October2026, Asia/Colombo. Scope: internal durable-operation/receipt/audit foundation only. Task002 contracts and task003 identity/actor foundation were the accepted prerequisites; DEC-04 is owner-approved. No V1 edit, shared-development database mutation, live provisioning, public endpoint or production operation was performed.

## Implemented

- Additive Master Operation/PlatformAuditLog and tenant CommandReceipt/AuditLog models, exact approved state enums, versioned intent fields, stable physical/template targets, typed completed steps, lease/control metadata and local foreign keys. Existing003 proof/access operation references remain scalar.
- Immutable provisioning scope and cross-slug key claim; canonical SHA256 digests, explicit keyed secret fingerprint and secret/private-key rejection; allowlisted replay results.
- Database-clock30-second CAS leases with10-second serialized heartbeat; takeover requires authoritative reconciliation outside the Master transaction followed by a second CAS check. Verifier/version races are rejected.
- Typed ordered monotonic checkpoints, exact preservation of old step values in SQL, Gym slug/database/Theme binding checks, local checkpoint effects+ma1 audit atomicity.
- Tenant receipt claim, business callback, required audit and safe result in one local transaction; same-key/source-operation replay; changed digest conflict; ta1/ma1/mv1 keys; content mismatch integrity error; append-only audit and durable operation/receipt retention.

## Executed checks

| Check | Result / scope |
|---|---|
| Prisma format/generate, both schemas through004 | Exit0 with explicit cached engine override; generation is not database verification. |
| API no-emit typecheck | Exit0. Initial unchecked-update input typing issue corrected before testing. |
| Operations pure suite |7/7 passed. Final rerun270ms after narrowing an idempotency runtime type guard and removing a test-fixture lint warning. Canonical values/secrets/tuples/keys/results/checkpoints/10-second heartbeat covered. |
| API lint | Exit0; final run has no warnings. |
| API build | Exit0 through004. |
| Owned PostgreSQL17 integration suite |10/10 passed, exit0,7.72seconds. Applied original+003+004 Master and both tenant migration chains using `migrate deploy`; checked actual columns/indexes/local audit FKs and actual persisted outcomes. |
| Sandbox-first Docker attempt | Setup refused socket access;10 cases skipped, no DB result claimed. Retried with approved escalation solely for a labelled disposable local container. |
| Cleanup | Passing suite completed its afterAll ownership-checked cleanup of all4 run databases and removal of the disposable container. A cleanup error would fail the suite. Existing compose/shared database targets were not adopted. |

The PostgreSQL run started at01:58:07 in the execution host's test output; elapsed7.72seconds is recorded without translating that host clock into the client timezone. The test container was owned by the disposable helper, used tmpfs and a random loopback port, and never sourced shared URLs. No raw credential or connection URL is stored here. Per-database migration-history rows were read by teardown; the retained terminal output contains the passing suite summary rather than a separately persisted history export. File SHA256 values below are source-artifact hashes, not falsely labeled captured live checksums.

Commands used (engine path contains no credential):

```sh
PRISMA_SCHEMA_ENGINE_BINARY=/Users/esanduepa/.cache/prisma/master/d1b3f377ca835d73fd50954a5e22128b9ebdd6b8/darwin-arm64/schema-engine node node_modules/prisma/build/index.js format --schema packages/database-master/prisma/schema.prisma
PRISMA_SCHEMA_ENGINE_BINARY=/Users/esanduepa/.cache/prisma/master/d1b3f377ca835d73fd50954a5e22128b9ebdd6b8/darwin-arm64/schema-engine node node_modules/prisma/build/index.js generate --schema packages/database-master/prisma/schema.prisma
# Equivalent explicit tenant format/generate commands were also executed.
pnpm --dir apps/api exec tsc --noEmit --incremental false
pnpm --dir apps/api exec vitest run src/operations/primitives.spec.ts
pnpm --dir apps/api lint
pnpm --dir apps/api build
GYMOS_TEST_ALLOW_DOCKER=1 PRISMA_SCHEMA_ENGINE_BINARY=/Users/esanduepa/.cache/prisma/master/d1b3f377ca835d73fd50954a5e22128b9ebdd6b8/darwin-arm64/schema-engine pnpm --dir apps/api exec vitest run --config vitest.config.operations.ts
```

Prisma's local `migrate diff` invocation produced no DDL output in this environment; the additive SQL was prepared directly from the finalized datamodel, then proved by actual isolated deploy/catalog checks. An initial draft omitted columns because a documentation helper stopped at a JSON-default brace; that draft was corrected before any successful migration/test evidence or schema-stable handoff. Task003 migration bytes were not edited.

## Real database scenarios

1. Complete additive installation: actual Operation control columns, composite/partial unique indexes and same-Master audit original-actor/Gym FKs exist.
2. Five concurrent same-intent claims produce one operation/target; changed body and cross-slug reuse conflict; private request fields reject.
3. Concurrent lease acquisition has one winner; expiry is30seconds from database time; stale heartbeat fails.
4. Expired takeover cannot checkpoint before reconciliation. A heartbeat inside the external verifier proceeds without a held Master lock, then invalidates stale reconciliation CAS. Exact old-step extension/deletion attempts and operation deletion reject in direct SQL.
5. Ordered target-bound checkpoints complete once, preserve immutable scope/database and replay safe COMPLETE result after simulated response loss. Unrelated Gym target and skipped prerequisites reject.
6. Injected Master audit INSERT failure rolls back checkpoint and local Master effect.
7. Five concurrent tenant intents invoke business callback once; one receipt/audit; same source operation recovers under another key; changed digest conflicts.
8. Missing audit rolls back member/receipt; tenantB remains empty; mismatched audit content fails; direct receipt deletion/audit rewrite reject.
9. mv1 same event replays without new audit; mismatched content rolls back local aggregate version.
10. Injected tenant audit INSERT failure rolls back member and receipt together.

## Boundaries and follow-up

This is an internal foundation, with no changed HTTP surface and therefore no claim of new HTTP409/403 responses, browser parity or end-user authorization verification. Future controllers normalize OperationConflictError to the reviewed409 contract and authorize recovery.005/018 own current binding/actor gates;021–023/031/036 own external database/enrollment recovery;040 owns different-key session/financial domain uniqueness;043 owns actual required notifications. The callback makes those future local writes atomic but does not fabricate them today.

Normal receipt execution never commits a RUNNING claim separately. A preexisting/manual RUNNING or REJECTED receipt fails closed and needs explicit feature-specific reconciliation; ordinary replay never blindly repeats effects. REPAIR_REQUIRED/FAILED_FINAL operations also require separately authorized repair. No generic distributed rollback or arbitrary business reconstruction is claimed.

After the passing004 PostgreSQL run and schema-stable signal, root began005 by adding later20000/20001 migration files and additional shared-schema fields/models. The current whole-schema files therefore are not represented as the tested004 snapshot. The frozen10000/10001 migration files define004's tested additive chain. The final small runtime string-type check is pure-tested; integration inputs were already validated strings, and SQL bytes were unchanged after the passing run.

Hashes and owned files: [GYMOS-MIG-004-hashes.json](GYMOS-MIG-004-hashes.json). No global tracker/status/decision change was made by this workstream. Existing exposed-credential ownership/remediation remains task010; local tests do not prove rotation.
