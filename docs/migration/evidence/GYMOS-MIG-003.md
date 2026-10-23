# GYMOS-MIG-003 — Identity and tenant actor foundation

Implementation and isolated verification completed across23–24 October2026, Asia/Colombo. Dependency task002 was accepted by the coordinating agent before source edits; DEC-02/04/05 were explicitly approved by the project owner. This report records task003's result for review; the coordinating agent owns tracker/status updates.

## What changed

- Extended the existing Master `User`/`GymAccess` rather than replacing them: canonical email constraints, security/forced-change metadata, access link state/version and typed local actor references. The composite `(userId,gymId)` primary key retains one role per identity per gym. Different gyms can assign different roles.
- Added minimal tenant Member/Trainer actor metadata with independent IDs, nullable external identity/operation references, registration state and versions. Existing basic Members become clearly unlinked BASIC actors; new Trainers remain PENDING. No cross-database foreign key was created.
- Added an internal Master EnrollmentProof foundation. Self password reconfirmation issues a random256-bit token, stores only SHA-256, binds identity/authVersion/gym/role/operation, and expires using database time after10minutes. Consumption and PENDING access creation share one Master transaction and row locks. Same consumed operation may resume without another link; role conflict or mismatched/expired/revoked proof fails. Existing identity password/hash remains unchanged. Restricted/expired temporary identities cannot issue or consume consent.
- Added a pure publication policy requiring explicit verified binding, current ACTIVE Master access and exact reciprocal actor kind/ID/identity/operation plus COMPLETE operation/local registration. Missing future operation evidence is false. A COMPLETE tenant actor cannot publish itself while Master is PENDING. Full operation-aware request/resource integration remains task018; no fabricated operation completion was introduced.
- Shared one ASCII/trim/lowercase identity-email validator across login/admin/service, owner/super-admin CLIs and milestone identity fixtures. Tenant contact email remains a separate contact field. Existing login response shape, Argon2 and15-minute token configuration remain unchanged.
- Existing owners remain usable through explicit ACTIVE writes and an eligible legacy-owner migration backfill. Unlinked MEMBER/TRAINER access is denied instead of assumed operational; login omits those gyms until the later operation-aware implementation can verify them. This conservative interim restriction is intentional and is not claimed as a completed trainer/member portal.

No public proof/enrollment/password-change/session-revocation endpoint or Next UI was added. Task016–020/031/036 own those behaviors. Security metadata alone is not presented as full session revocation or forced-change implementation.

## Additive schema and migration safety

New migration files preserve the original committed SQL:

- `packages/database-master/prisma/migrations/20261023090000_identity_foundation/migration.sql`
- `packages/database-tenant/prisma/migrations/20261023090001_actor_foundation/migration.sql`

The Master migration first checks noncanonical/unsupported email and normalized collisions inside an explicit transaction. It aborts without rewriting/merging conflicts. The database CHECK requires printable ASCII without whitespace and canonical lowercase under deterministic C collation; a normalized unique expression index and existing unique email index form the race boundary. Positive security/access versions, typed ACTIVE actor shape and local registration CHECKs supplement Prisma declarations.

Only existing OWNER associations for ACTIVE gyms are backfilled ACTIVE. Legacy non-owner/unlinked and suspended-gym rows are not autoactivated. New access defaults PENDING. There is no reset, history squash, imported V1 identity or preserved V1 ID.

A redacted read-only inventory query is supplied at `apps/api/scripts/inspect-identity-canonical.sql`, returning opaque identity IDs/reasons/counts. It was **not executed against an existing development database**. Any existing noncanonical rows require authorized inventory and separately reviewed repair before migration; the migration deliberately fails rather than silently normalizes data.

EnrollmentProof.enrollmentOperationId and actor/access enrollment references are currently scalar references because task004 has not yet introduced the durable Operation table. Task004 may add reviewed Master-local integrity only after defining insertion order; tenant references remain external. Foundation limitation: proof issue is unique per identity/gym/role/operation. Re-consent after an unconsumed proof expires or its nonce is lost must be defined by task031/036 recovery; current issue returns a conflict and does not silently replace it. No public recovery flow is claimed here. An expired nonce does not grant fresh authorization: later operation-status recovery must use recorded consumption and current authorization, rather than reset credentials or require replayed plaintext.

## Guarded real PostgreSQL environment

Created only a new `postgres:17` container using the already cached image, a random run label/name, random in-memory password, loopback-only randomly assigned port and temporary storage. No existing `.env`, development database or production target was selected or migrated.

Reusable support: `apps/api/test/support/disposable-postgres.ts` exports `createDisposablePostgresRun()` and `assertOwnedTarget()`. The run exposes test-only Master/tenant URLs, target names, marker verification, real `migrate(name,kind)`, guarded connections and cleanup. It requires explicit `GYMOS_TEST_ALLOW_DOCKER=1`, a local Unix-socket Docker context, exact local host/port and random run-prefix allowlist. No pre-existing target is adopted. Per-database markers live in a private `__gymos_test` schema; cleanup checks label plus exact name and marker before deletion.

Each run creates a Master, two physical tenants and one additional preflight database. The Master and tenants use **actual Prisma migrate deploy**, retaining genuine `_prisma_migrations` names/checksums/finished state. The extra preflight database intentionally uses SQL text to exercise atomic rejection and legacy backfill; it fabricates no Prisma history and is not treated as an installed-schema attestation.

The successful final run `a2bc895def4c9956` verified six actual migration records, all completed and matching source SHA-256. Cleanup removed all4 owned databases and the labelled container. [Migration/cleanup evidence](GYMOS-MIG-003/migration-evidence.json) records the actual names/checksums and cleanup result. No database or container is retained as a persistent new development environment.

## Executed verification

| Command / check | Result | Evidence |
|---|---|---|
| `pnpm --dir apps/api test` | Exit0;9/9 tests, two files | [Unit log](GYMOS-MIG-003/api-unit.log) |
| `pnpm --dir apps/api lint` | Exit0; no diagnostics | [API lint](GYMOS-MIG-003/api-lint.log) |
| `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` | Exit0 | [API no-emit](GYMOS-MIG-003/api-noemit.log) |
| `pnpm --dir apps/web lint` | Exit0 | [Web lint](GYMOS-MIG-003/web-lint.log) |
| `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` | Exit0 | [Web no-emit](GYMOS-MIG-003/web-noemit.log) |
| `pnpm --dir apps/api build` | Exit0 | [API build](GYMOS-MIG-003/api-build.log) |
| Owned Docker PostgreSQL integration: `pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --reporter=verbose --reporter=json --outputFile=/Users/esanduepa/Desktop/Projects/gymos-v2/docs/migration/evidence/GYMOS-MIG-003/integration-results.json` | Exit0;8/8 real-database integration tests | [Verbose log](GYMOS-MIG-003/integration-final.log), [JSON results](GYMOS-MIG-003/integration-results.json) |
| Prisma format/generate, both existing schema paths | Exit0; Prisma7.10.1 clients regenerated under ignored existing output paths | Successful tool output; schema/task hashes below |
| `git diff --check` | Exit0 | Working-tree check; no whitespace diagnostics |

Integration environment additionally set `GYMOS_TEST_ALLOW_DOCKER=1`, `DOTENV_CONFIG_PATH=/dev/null` and `PRISMA_SCHEMA_ENGINE_BINARY` to the existing cached local engine. No secret values appear in the command matrix. [Command metadata](GYMOS-MIG-003/command-results.json) records exact check arguments/exits/durations.

Concrete integration assertions:

1. Wrong host/prefix/port and missing marker refuse mutation/cleanup; the target remains readable and can be safely restored/cleaned by its owner.
2. Synthetic conflicting pre-existing email causes atomic migration failure, preserving the row and original schema; only eligible legacy-owner access is subsequently activated.
3. Four concurrent case/space variants produce exactly one identity and safe duplicate conflicts. Direct noncanonical/non-ASCII/whitespace writers fail PostgreSQL CHECKs, duplicates fail UNIQUE, and the C-collation normalized index exists.
4. One verified identity has distinct Member/Trainer actor IDs and different roles across two gyms. Two concurrent consumers of the same proof yield one link/consumption. Existing hash/security version stay unchanged. Pending Master access and missing/mismatched binding/operation/actor evidence fail publication.
5. Wrong secret, proof role/gym/operation mismatch, expiry/security-version change and same-gym role conflict produce no extra access. Required consumption and PENDING link are atomic; conflicting proof remains unconsumed.
6. Restricted or expired temporary identities cannot use internal consent; no link appears.
7. Existing login keys/900-second response and owner guard behavior remain compatible; wrong password, pending access and foreign gym deny. Responses exclude password hashes. These are direct controller/guard calls backed by real PostgreSQL, not a full HTTP/browser journey.
8. Real owner/super-admin CLI writers normalize mixed-case/outer-space identities in the owned Master. Owner access is explicitly ACTIVE and its Argon2 password verifies. SQL rejects an ACTIVE non-owner link missing its required typed actor metadata.

## Failures encountered and corrected

Preserved [initial failure](GYMOS-MIG-003/integration-initial.log) and [diagnostic failure](GYMOS-MIG-003/integration-diagnostic.log): the original test ownership table was in `public`, so Prisma correctly returned P3005 for a nonempty initial schema. Moving ownership metadata to its dedicated test schema allowed real initial migrations without baselining or editing history. The intermediate corrected run passed7/7; the final8/8 adds actual CLI-writer coverage and recorded histories/cleanup.

Prisma's first sandbox invocation attempted to update its external engine-cache timestamp and failed EPERM. Using the existing cached engine explicitly via `PRISMA_SCHEMA_ENGINE_BINARY` allowed format/generation without installing/downloading anything or changing that cache. A test mock cast/type error and one support-loop lint warning were corrected; the final no-emit/lint checks are clean. No failed check is reported as passing.

## Files, preservation and limits

[Task file hashes](GYMOS-MIG-003/task-files.json) inventory task003-owned source/schema/SQL/tests/scripts at handoff. Root task002's package/lockfile changes are separate and were preserved. No global tracker/spec/index or shared contract/client package was edited by task003.

[V1 preservation evidence](GYMOS-MIG-003/v1-preservation.json): all144 tracked non-document files still match task001 hashes, unchanged HEAD and clean status. V1 was never run or modified. Existing V2 databases were never connected/migrated/reset; the source now requires the reviewed additive schemas before it can run against a persistent database. Such a rollout is separate from these disposable tests.

Not claimed: production readiness, persistent environment migration, full schema/binding verifier005, durable operations004, session lifecycle016–020, complete enrollment031/036, browser/visual/E2E, financial invariants, backup/restore or provider capacity. No screenshots are needed because task003 changes no rendered interface. The existing milestone workflow was adapted for the identity writer but was **not executed**, because guarding its broader workflow belongs007.

Recovery: leave existing targets untouched; use the guarded run's cleanup for disposable tests. Do not reverse these migrations automatically or delete a reused identity. Any future persistent migration runs preflight first and uses the controlled rollout/backup policy. Operation-aware publication stays closed until its authoritative evidence exists.

Task003 implementation/test evidence is ready for coordinating review. Task004 can begin only after that review accepts003 and updates the authoritative tracker; subsequent model changes must add new migration files rather than edit this recorded history.
