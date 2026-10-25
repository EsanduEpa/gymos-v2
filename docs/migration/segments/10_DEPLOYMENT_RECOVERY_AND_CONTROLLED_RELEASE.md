# Segment 10 — Deployment, Recovery, and Controlled Release

## Execution instructions for AI agents

Read DEC-11 and all prior quality evidence. Obtain explicit provider/environment authority before external changes. Never infer capacity, backups, TLS, regions or approvals. Use additive migrations, canaries and recoverable switches; do not deploy production until the final signed gate.

## 1. Segment overview

- **Capability:** provider policy, staging, release controls, observability, managed recovery and launch.
- **Objective:** turn the verified web system into a safely operated release.
- **Result:** independent web/API deployments, controlled tenant migrations/cutover, actionable redacted telemetry, rehearsed managed restore, and approved production launch.
- **Priority / complexity:** Critical / Large.
- **Dependencies:** segments 01–03 and 09; DEC-11; external provider access/owners.
- **In scope:** GYMOS-MIG-067–071 and 087.
- **Out of scope:** choosing/purchasing a provider without approval, destructive production reset, V1 data import, mobile release unless DEC-12 couples it.

## 2. Current V1 implementation

V1 package/config comments imply a Next/Vercel-style deployment, but no live project/account/capacity was verified. V1 has no trusted production backup/restore evidence in this workspace. Its exposed credential is a release blocker. These are environment facts to verify, not architectural instructions.

## 3. Target V2 implementation

Web and API deploy independently with compatible contracts; Master and each tenant DB use TLS, least privilege and bounded capacity. Schema rollout uses segment 03 orchestrator and additive compatibility. Health distinguishes liveness/readiness without leaking DB details. Structured logs/metrics/traces correlate request/operation/gym pseudonym, redact secrets/private data, and alert on failure/saturation/repair. Backups support Master and individual tenant restore with reviewed registry switch. Cutover/rollback is staged and owner-approved.

## 4. V1 to V2 UI migration

No new business screen is owned. Release verification smoke-tests every V2 route, theme/static asset, cookie/domain/HTTPS behavior, downloads and error states in staging/production-like configuration. Maintenance/repair/unavailable states must be honest and accessible if exposed.

## 5. Backend and database migration

Provider connections and pool budgets must fit actual plan limits. Separate roles for migration/runtime/backup. Secrets live in provider secret storage. Release migrations are backward-compatible; mixed app/schema versions are tested. Managed restore validates checksum/encryption/retention/RPO/RTO and never autoactivates an unverified restored Master/tenant.

## 6. Detailed tasks

### 087 — DEC-11 provider capacity/release policy

- **Objective:** document actual provider, regions, DB create/count/connection/TLS/backups/retention/budget, secret ownership, deploy/rollback approvals, RPO/RTO and alert owners.
- **Prerequisites:** 001 and authorized provider inspection. **Target:** proposed `decisions/DEC-11.md`.
- **Acceptance:** evidence-backed limits and named approvers; no credential values; explicit staging/production differences. **[ ]**

### 067 — independent staging web/API deployment

- **Prerequisites:** 008,009,020,022,026,069,081,087.
- **Instructions:** reproducible builds; least-privilege secrets; domains/CORS/cookies/TLS; Master+two tenant staging fixtures; worker/runtime separation; smoke test.
- **Acceptance:** clean deployment at one revision, health/login/gym/theme/role journeys, no local dependency, rollback artifact retained. **[ ]**

### 068 — release migration and feature-cutover controls

- **Prerequisites:** 008,026,063,067,081,087.
- **Instructions:** compatibility matrix, canary tenant, batch rollout, pause/resume, repair state, feature flags/readiness and rollback/forward-fix runbook.
- **Acceptance:** mixed version/canary failure/app rollback/tenant repair rehearsal; unaffected tenants continue safely. **[ ]**

### 069 — operational health, redacted logs and limits

- **Prerequisites:** 006,016,022,043,049,080,081,087.
- **Instructions:** liveness/readiness, operation/schema/pool metrics, structured correlation, rate limits, alert injection; redact identity/health/finance/secrets/DB details.
- **Acceptance:** alerts fire to named owner; saturation and repair visible; unauthorized health reveals no internals; post-commit unknown trace resolves receipt. **[ ]**

### 070 — managed backup and disaster recovery rehearsal

- **Prerequisites:** 009,026,067–069,081,087.
- **Instructions:** provider backup for Master/individual tenant, encrypted artifact/access, isolated restore, verification, registry switch/rollback, dependency order and communication.
- **Acceptance:** measured RPO/RTO meet DEC-11; corrupt/wrong backup rejected; Gym A restore leaves B untouched; restored state remains gated until verified. **[ ]**

### 071 — production acceptance and controlled launch

- **Prerequisites:** 064–066,068–070,087.
- **Instructions:** assemble signed evidence/risk/deferred list; confirm credential containment and rollback; deploy/canary/monitor/expand with abort thresholds; record final revision/config/schema.
- **Acceptance:** named product/security/platform owners approve; all critical gates green; rollback tested; post-launch smoke and observation window pass. **[ ]**

## 7. Security and multi-tenancy checklist

- [ ] Runtime/migration/backup roles least-privilege and secrets provider-managed.
- [ ] TLS, cookie, CORS/origin, rate limits and network boundaries verified.
- [ ] Logs/health/alerts redact sensitive identifiers and DB details.
- [ ] Individual tenant restore/cutover cannot alter another gym.
- [ ] Exposed V1 credential containment is closed before launch.

## 8. Testing and verification

Run reproducible builds/workspace tests, staging E2E/security/capacity, migration compatibility/canary, alert injection, backup corruption and isolated managed restore, then production smoke only under approved launch. Record provider facts, timestamps, revisions, schema versions and measured RPO/RTO without secrets.

## 9. Definition of done

- [ ] DEC-11 approved and tasks 067–071 verified.
- [ ] Representative staging and managed restore evidence exists.
- [ ] Observability, abort, rollback and approval ownership are operational.
- [ ] Production launch and observation complete with no unresolved critical issue.

## 10. Agent checkpoints

Stop before any external deployment, DNS, secret, managed DB or production action lacking explicit authority. Do not substitute the local task 009 drill for managed recovery evidence.

## 11. Progress and handoff

- **Status:** NOT STARTED
- **Completed:** none
- **Remaining:** 067–071,087
- **Next recommended task:** GYMOS-MIG-087.
- **Files/tests/issues/blockers/decisions:** _fill during execution_

