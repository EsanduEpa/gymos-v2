# DEC-05 — Schema compatibility, connection budgets and recovery

- Status: **Approved by project owner in this chat on23 October2026.**
- Prepared: 23 October 2026, Asia/Colombo.
- Resolution task: [GYMOS-MIG-081](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-081).
- Accountable reviewer: project owner with Database + Platform operations. Actual approving reviewer/date/result: **project owner,23 October2026, “Approve all three proposals.”**
- Authority: [Master Plan](../MIGRATION_EXECUTION_PLAN.md), Database map §§7–9,11–14.1; DB14/F-D13. Provider/capacity/release choices remain DEC-11/task087.

## Preserved approved requirements

Separate Master/tenant clients and one physical database per gym; one reviewed tenant schema. Current additive SQL history is preserved. Tenant database creation, migration, actual schema verification and activation are explicit operations, never implied by model generation. Master outage/schema mismatch fails closed; no fallback database. Backup/restore and migration operations stay separate from ordinary builds. No V1/database reset/data import is authorized.

## Proposed development defaults

| Area | Exact proposed default |
|---|---|
| Manifest | Commit an immutable versioned manifest listing ordered migration names and SHA-256 checksums plus required schema/constraint postconditions and supported API compatibility range. Each provisioning operation pins its manifest digest/version. Applied migration files are never edited/squashed. New changes are additive timestamped migrations; incompatible contraction needs a separately reviewed rollout. |
| Tenant binding | Tenant `GymConfiguration.masterGymId` is the immutable gym binding, separate from `SchemaState` installed manifest/version, verification state/time and schema evidence digest. Verify the actual selected database against the server-resolved target; do not duplicate business config.version as schema version. Master registry stores expected version/digest/operation. Missing, swapped, APPLYING/FAILED or incompatible markers deny ordinary gym traffic503 before domain reads. `GymConfiguration.version` never substitutes for schema state. |
| Verification | On provisioning/migration/restore, compare actual completed `_prisma_migrations` names/checksums and required PostgreSQL table/type/index/constraint postconditions against the pinned manifest before VERIFIED. A marker alone never establishes installation. An interrupted run requires evidence reconciliation; no migrate-on-read. |
| Per-request gate | Every protected gym request resolves fresh Master identity/access/gym and expected schema/binding, then reads tenant binding/status/version and compares compatibility. No authorization/schema-state cache in this development tranche. Full expensive catalog/history verification runs on install/rollout/restore and explicit repair, not on every read. Schema-write tooling changes state to APPLYING before work and re-verifies before activation; manual drift cannot be declared verified from old metadata. |
| Local pool budget | Per API process: Master pool maximum4, per-tenant pool maximum2, maximum8 resident tenant clients, provisioning/admin pool maximum1 separately. Steady connection ceiling21 per process (4+8×2+1), plus explicitly counted test/operator/backup connections and replicas. At most8 tenant clients can be admitted/resident; never create an unbounded overflow client. |
| Admission/timeouts | Pool/client admission waits at most3seconds; a supported database query/transaction statement timeout5seconds. A long migration/backup is a separate worker command with explicit operation timeout, never subject to web-query defaults. Saturation/unavailable dependency returns retryable503 without database details. |
| Lifecycle | Idle eviction after60seconds with reference-counted in-flight protection; evict only a client with zero active leases. If all8 are busy, queue within3seconds then reject rather than disconnect active work. Shutdown stops admission, drains up to10seconds and disconnects pools; unfinished operations retain recoverable receipts/checkpoints. Register actual shutdown hooks. |
| Test targets | Database integration tests create per-run isolated local Master+at least2 tenants with random run marker and explicit allowlisted local host/database prefix. Refuse shared development/staging/production or unowned cleanup targets. Existing milestone script must be guarded before use. Synthetic fixtures only; no V1 seed/reset/execution. |
| Backup artifact | Separate per-tenant and Master logical backups, encrypted before durable storage, with manifest: source gym/binding/schema version, UTC snapshot time, backup format/tool versions, encrypted payload SHA-256 and run ownership. Encryption key comes from a separate protected source, never the artifact/Git/log. Local development storage is outside versioned files; exact key source configured before first run, missing key fails clearly. |
| Restore | Restore into a new owned target database. Verify checksum/decryption, schema history/postconditions, physical binding, expected data counts/invariants and isolated access before any registry switch. Suspend affected traffic for reviewed switch; recheck expected registry version/CAS. Preserve old target until recovery accepted; wrong-gym/corrupt backup refuses cutover. Master restore requires reconciliation of current tenant bindings/operations, not automatic blind registry replacement. |
| Local recovery target | Propose development RPO≤24hours and RTO≤60minutes, measured in an isolated drill before claiming them achieved. Keep at least7 daily verified encrypted backup generations during this development tranche, without deleting the last known-good artifact. Production frequency, retention, offsite storage and service guarantees require DEC-11 approval/provider evidence. |

Budget defaults apply to one development API process. They are **not** a managed-provider capacity assertion. Total connections count API replicas, workers, migrations, tests, operators and backups; do not multiply the process count without revisiting the server limit. Encrypted backups are not proven restorable until the drill passes.

## Alternatives and tradeoffs

| Alternative | Tradeoff versus proposed default |
|---|---|
| Cache authorization/schema gates | Less Master traffic but delayed revocation/mismatch visibility; postpone until a reviewed numerical bound and invalidation design. |
| One unbounded Prisma client per gym | Easy initial code but exhausts connection/server memory. Bounded admission adds complexity and predictable503 under load. |
| Full catalog verification every request | Stronger immediate drift observation but costly; controlled migration ownership plus fresh state gate and explicit full verification is the proposed development compromise. |
| Reset/squash current schema | Simpler fresh history but destroys auditability and conflicts with preservation. Keep additive chains and repair incompatible rows explicitly. |
| Provider snapshots only | Useful later, but per-gym portable restore and Master reconciliation still need verification; provider capability unverified. |

## Implementation impact and expected tests

Affected: GYMOS-MIG-005–009,021–023,026,067,069,070,081 and087.005 owns binding/manifest verifier,006 pool lifecycle,007 isolated harness,008 build/operation separation,009 early backup/restore. Deployment/provider tasks later replace measured development defaults only through reviewed configuration/ADR.

1. Swapped target, missing marker, wrong manifest checksum, partial migration or failed constraint postcondition blocks domain queries. Successful explicit re-verification recovers a lost observation without inventing applied SQL.
2. Load9+ tenant keys: no more than8 clients, each max2; busy client is never evicted. Admission exceeds3seconds→503; slow query reaches5second limit; idle clients release after60seconds; shutdown drains/ends within reviewed10second budget. Record actual database connection counts.
3. Master outage denies ordinary access without querying another tenant. Build/typecheck/lint never creates databases, migrates, seeds or restores.
4. Wrong host/prefix/missing ownership marker refuses test mutation/cleanup; parallel run IDs never share data. Cleanup cannot delete today's development gyms.
5. Backup A plus Master, mutate isolated A, restore into new target: schema/binding/data invariants pass, B unchanged. Corrupt encrypted payload, missing key, wrong gym and stale registry version refuse switch. Exercise registry rollback and Master/tenant reconciliation.
6. Measure backup age and elapsed restore time. Failed24hour/60minute target is reported as failure/unknown, never an achieved RPO/RTO. Seven-generation retention does not delete the last verified good copy.

No connection, backup, restore or runtime workflow is executed by this proposal. Approval must record actual reviewer/date/result; rejecting these defaults leaves source unchanged and dependent work blocked pending revision.

## Approval record

The project owner explicitly approved DEC-02, DEC-04 and DEC-05 together in this chat on23 October2026. The defaults above are accepted for dependent implementation; existing MVP scope remains unchanged. This does not authorize production deployment, shared-data reset, external credential rotation or V1 edits.
