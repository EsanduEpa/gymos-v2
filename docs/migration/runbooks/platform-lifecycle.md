# Controlled platform and schema operations

31 October 2026. Development tooling only. Provider/capacity/topology/release choices remain task 087. These commands do not authorize real Neon/shared resources, a production rollout, a registry switch, or a merge.

## Environment and boundaries

Build with `pnpm prepare:checks && pnpm build:workspace`. Builds generate clients/compile code; they never deploy schemas. Keep URL/credential values outside terminal output, Git, screenshots and logs.

The command wrappers require the live owned disposable harness's `GYMOS_OWNED_RUN_ID`, three loopback database URL variables, matching local Unix Docker context/container label/image/port, and private Master ownership marker. They reject other environments before importing/constructing database services. The harness supplies connection values privately. Only IDs, version references, request keys and review reasons appear in examples below. Do not put credentials or member information into reasons.

The worker uses the existing bounded pools: Master4, tenant2 × at most8 residents, provisioning1; one controlled migrator process is separately counted. Master deploy uses one operator connection before/after its separate migrator. All provider/replica totals require task 087 review. A dedicated local CREATEDB/CREATEROLE login with no superuser privilege was tested; real provider role capabilities remain unverified.

## Provisioning and registry observations

```sh
node apps/api/scripts/provision-gym.mjs reserve ACTOR_ID REQUEST_KEY "Synthetic Gym" synthetic-gym OWNER_EMAIL LKR Asia/Colombo
node apps/api/scripts/provision-gym.mjs resume OPERATION_ID
node apps/api/scripts/provision-gym.mjs refresh-summary GYM_ID ACTOR_ID
```

The HTTP create request reserves only. The controlled worker uses the exact persisted target and pinned SQL, never a client database name. Existing targets require the original operation-bound role marker and ownership; unknown targets are never adopted/dropped. The provisioner receives explicit membership in its generated NOLOGIN owner role so CREATE DATABASE OWNER and migrations need no superuser capability. Retry retains checkpoints/target and performs reconciliation. New identities, owner access, Classic theme, required configuration/reciprocal proof and ACTIVE publication finalize atomically after tenant readiness. Existing identities require their own authenticated current-password consent at `POST /auth/provisioning/:id/owner-consent`; platform email assertions cannot supply it. No reused identity is reset/deleted.

The original platform actor can issue/reissue/acknowledge a new owner's one-time credential through the registry handoff. There is no retrieval after issue. Lost/expired handoff uses explicit reissue, revokes the prior security version and still requires forced password change. Never copy credentials into task evidence.

Registry HTTP reads are pure Master reads. The explicit bounded observation job reports actual tenant Member/Trainer counts with observation time; failures preserve stale counts with unavailable/repair health. Never substitute zero for unavailable.

## Support and lifecycle

Support is a named, 15-minute GYM_SUMMARY_READ context with reason and original-actor audit. Every tenant summary uses an actual READ ONLY transaction, fresh binding/schema checks and a second context validation. Replacement/exit/logout/security changes invalidate it. Only summary and exit routes accept the transport context. It grants no owner/tenant mutation rights or private health/person/credential projections. Partial/repairing schemas expose Master-only summaries.

Lifecycle endpoints are platform-only: `POST /admin/gyms/:id/lifecycle` with stable Idempotency-Key and `{expectedVersion,target,reason}`, safe status `GET /admin/lifecycle/:id`, and explicit `POST /admin/lifecycle/:id/resume` with `{}`. Suspension commits Master status before bounded local draining. A failed drain remains blocked. Reactivation fully verifies installed schema, binding/current operation, recorded manifest and active owner, then performs a Gym CAS/audit. Reasons/intents cannot be edited on retry. Resume the original incomplete operation rather than starting another key.

While suspended, ordinary work must remain pending/unavailable and reauthorize after reactivation. Reviewed maintenance and named read-only support share the same pool budgets. They do not grant subscription entitlement, change people/session business status, or erase history. This tranche measures one development API process; cross-instance orchestration is a task 087 deployment gate.

## Master and tenant schema rollout

```sh
node apps/api/scripts/schema-rollout.mjs deploy-master
node apps/api/scripts/schema-rollout.mjs reserve ACTOR_ID REQUEST_KEY TARGET_VERSION TARGET_DIGEST 1 GYM_A_ID GYM_B_ID
node apps/api/scripts/schema-rollout.mjs run ACTOR_ID ROLLOUT_ID
node apps/api/scripts/schema-rollout.mjs status ACTOR_ID ROLLOUT_ID
node apps/api/scripts/schema-rollout.mjs approve-canary ACTOR_ID ROLLOUT_ID EXPECTED_ROLLOUT_VERSION "Reviewed synthetic canary evidence"
node apps/api/scripts/schema-rollout.mjs run ACTOR_ID ROLLOUT_ID
```

Use only versions/digests exported by the immutable reviewed manifest catalog. `batchSize` is1–25 with concurrency1; selection is unique and bounded to100 explicit gym IDs. This is an application work bound, not a provider capacity claim. The first gym is the canary. Further work stops at CANARY_READY until explicit approval; approval re-verifies current installed/binding health, not just an old COMPLETE checkpoint. Batches run sequentially and stop on repair. Source manifests must be reviewed compatible prefixes; no downgrade/reset/squash path exists.

Master deploy verifies source hashes and the existing completed history prefix before DDL, then checks actual installed history/catalog postconditions and records evidence. Tenant work blocks its expected Master operation before mutation, pauses/drains local admission, checks original physical ownership, copies verified SQL bytes into a private pinned artifact, marks APPLYING, deploys explicitly, fully verifies/attests, and publishes the completed expected operation by CAS/audit. Ordinary requests never migrate. Healthy supported old/new tenants remain available independently. Suspension is retained across rollout.

## Interrupted work and repair

```sh
node apps/api/scripts/schema-rollout.mjs review-target ACTOR_ID OPERATION_ID EXPECTED_OPERATION_VERSION "Inspected actual history, catalog and binding"
node apps/api/scripts/schema-rollout.mjs run ACTOR_ID ROLLOUT_ID
```

Review is explicit, actor-bound, version-checked and immutable. It inspects the same positively owned target and records actual source/target schema evidence for the next attempt. A missing SchemaState observation or external success before Master checkpoint can be re-attested only after that review; installed SQL is not inferred from source-directory version. A stale lease cannot commit. A lost parent checkpoint resolves completed per-gym work without rerunning DDL.

Unresolved/changed migration history, an unknown target, wrong binding or incompatible catalog cannot be approved by this runner. It never edits `_prisma_migrations`, runs `migrate resolve`, drops a target or resets data. Keep the affected gym gated. Use reviewed forward repair or the [isolated restore procedure](backup-restore.md) into a new owned target with checksum, binding/data checks and registry CAS. Preserve the old target. An immutable rollout target must never be retargeted to a restored database; a new reviewed ownership/operation record is required before a later rollout. Provider restore/ownership bootstrap is not authorized by these local wrappers.

Verification commands create and clean their own resources:

```sh
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.platform.ts --disableConsoleIntercept
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:recovery:owned
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test tests/two-gym.e2e.spec.ts
```

Only safe state/count/timing evidence is retained. Owner manual acceptance and all-11 latest-revision hosted checks remain separate gates; no command here authorizes merging PRs.
