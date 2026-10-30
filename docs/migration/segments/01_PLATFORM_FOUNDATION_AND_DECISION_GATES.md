# Segment 01 — Platform Foundation and Decision Gates

> **Current verified status — 30 October 2026 at `bdf3b41`:** Segment 01 is COMPLETED (23/23); overall 27/88 migration tasks completed. All 11 hosted checks passed at [run 41013407287](https://github.com/EsanduEpa/gymos-v2/actions/runs/41013407287). Decisions are owner-approved; external credential remediation is owner-attested with local cleanup and V2 scanning verified. See [finalization](../SEGMENT_01_FINALIZATION.md) for evidence limits and handoff. Earlier status entries are historical checkpoints.

## Execution instructions for AI agents

Read this file completely; inspect linked evidence and current source; preserve completed work; execute only the first dependency-satisfied unchecked task; verify before checking it; record commands/exit codes and discrepancies; never run V1's exposed DB script or write secret values; stop at external/owner decision gates.

## 1. Segment overview

- **Business capability:** safe multi-tenant platform substrate and binding product/technical decisions.
- **Objective:** preserve verified V2 foundations and close the remaining CI, credential, ownership, money, time, settlement, privacy, and refresh gates that block feature slices.
- **Expected result:** downstream segments have stable contracts, isolation, recovery, test fixtures, UI primitives, visual references, and approved numeric/security behavior.
- **Priority / complexity:** Critical / Large (foundation and decision gates completed; feature implementation remains in later segments).
- **Dependencies:** none.
- **Prerequisites:** access to both repositories and current evidence; external credential owner for task 010; named approvers for open ADRs.
- **In scope:** GYMOS-MIG-001–012, 014, 077–086; correction/synchronization of their evidence and derived status.
- **Out of scope:** business feature APIs/pages, production deployment, provider selection, mobile scope, V1 modification, customer data migration.

## 2. Current V1 implementation

V1 is a single Next.js/Prisma application. `lib/auth.ts`, `lib/authz.ts`, `lib/pricing.ts`, `lib/passwords.ts`, `lib/rate-limit.ts`, `lib/audit.ts`, and all `app/actions/*` combine infrastructure and business behavior over one database. `prisma/schema.prisma` contains 20 models/14 enums with floats and `gymId` filtering. Shared presentation lives under `components/shared` and `components/layout`; `app/globals.css` is the V1 Classic reference. V1 has useful password hashing, rate limiting, and role checks, but not the approved physical tenant isolation, durable cross-database command protocol, exact money policy, or forced-change enforcement.

Historical finding: the V1 diagnostic once contained an exposed remote credential. Current V1 source inspection verified that the hardcoded URL was removed and the script now requires `process.env.DATABASE_URL`. Never print credential values, run this diagnostic, or treat source cleanup alone as provider remediation. See GYMOS-MIG-010 for current owner-attested and independently verified evidence.

## 3. Target V2 implementation

Verified targets already exist in:

- Master/tenant Prisma schemas and additive migrations under `packages/database-master` and `packages/database-tenant`.
- `apps/api/src/identity`, `operations`, `tenancy`, bounded lease/pool services, and disposable integration harness.
- `packages/contracts`, `packages/api-client`, `packages/theme-tokens`.
- `apps/web/src/components/ui` and `apps/web/tests/visual`.
- Recovery scripts/runbook and migration evidence.

Preserve Master ownership of identity, registry, access, themes, platform audit, and durable operations. Preserve tenant ownership of actors, gym configuration, command receipts, tenant audit, and future operational domains. No cross-database FK/transaction; publish access only after reciprocal tenant proof. Ordinary requests must pass binding/schema verification and bounded admission.

## 4. V1 to V2 UI migration

This segment owns UI foundations rather than feature screens. V1 `globals.css`, root/dashboard layouts, PageHeader, DataTable, StatusBadge, ConfirmDialog, stat cards, chart shells, fields, feedback, tabs, empty/loading/error states, mobile drawer, and visual fixtures are mapped to verified tokens/primitives. Preserve geometry and Classic appearance; semantic brand variables may change primary/logo only. Feature pages consume these primitives later. Completed visual fixture work is reference evidence, not proof that V2 pages exist.

## 5. Backend and database migration

Completed foundations provide canonical email identity, typed gym access/actor links, operation state/checkpoints, tenant receipts/audit, schema manifest verification, binding gates, bounded pools, disposable two-gym databases, and local isolated recovery. Ordinary API reads must remain pure. Commands use strict contracts, idempotency/request digests, local transactions, safe results, and explicit repair states. DEC-01/03/06/07/08/09 now record owner-approved configuration, support, money/earning, time/scheduling, settlement and coaching/privacy/export/refresh rules. Apply them only in dependency-ready feature tasks; approval does not claim implementation.

## 6. Detailed step-by-step implementation tasks

### Completed work — preserve and regression-check

| Done | Task | Objective and expected behavior | Source / verified targets | Acceptance and testing |
|---|---|---|---|---|
| [x] | 001 Baseline | Reproducible, non-mutating source/toolchain baseline | Both repos; `evidence/GYMOS-MIG-001.md` | Preserve revision/command evidence; do not rerun destructive milestone tooling |
| [x] | 002 Contracts | Runtime success/error/pagination/money/identity contracts and typed client | `packages/contracts`, `packages/api-client` | Contract tests reject unknown/unsafe fields |
| [x] | 003 Identity schema | Canonical identity, access versions, typed tenant actor links | both Prisma schemas; identity tests | Cross-gym/role conflict/publication tests remain passing |
| [x] | 004 Operations | Recoverable Master operations and tenant receipt/audit primitives | `apps/api/src/operations`; schemas | Repeat key/digest/response-loss tests preserve one effect |
| [x] | 005 Tenant gate | Verify physical binding and installed schema before access | `apps/api/src/tenancy` | Wrong DB/version/digest fails closed |
| [x] | 006 Pools | Bound clients and safely drain/shutdown | pool/lease services and tests | Cap, saturation, eviction and shutdown tests pass |
| [x] | 007 Harness | Owned disposable Master + two tenants + browser fixture | `apps/api/test/support`, web E2E | Cleanup refuses unknown/unowned databases |
| [x] | 009 Local recovery | Encrypted isolated Master/tenant restore drill | `infrastructure/recovery`, runbook | A restore/switch/rollback proven; B unchanged; Master not autoactivated |
| [x] | 011 Tokens | V1 Classic semantic tokens and safe fallbacks | `packages/theme-tokens` | token and two-gym visual checks pass |
| [x] | 012 UI primitives | Accessible shared controls/states | `apps/web/src/components/ui` | keyboard/error/pending/320px evidence preserved |
| [x] | 014 Visual fixtures | Synthetic safe V1 reference manifest | `apps/web/tests/visual` | 104 required baselines and preservation proof linked |
| [x] | 078/080/081/086 | Approve identity, operation, schema/recovery, routes/Classic decisions | `decisions/DEC-02/04/05/10.md` | Follow approved decisions; changes require recorded approval |

### Resolved work packets — acceptance history

#### GYMOS-MIG-008 — complete workspace and hosted CI evidence

- **Objective/expected behavior:** keep local `check/build/lint/typecheck/unit/database/recovery` lanes repeatable and add hosted PR secret/dependency/review evidence without exposing credentials.
- **Prerequisites:** 001, 002, 007 complete; configured Git remote/CI authority.
- **Sources:** root `package.json`, `infrastructure/scripts/check-workspace.mjs`, `docs/migration/runbooks/ci.md`, `evidence/GYMOS-MIG-008.md`.
- **Targets:** verified existing workspace scripts; proposed CI workflow only after repository/provider is known.
- **Instructions:** inspect existing local evidence; configure least-privilege hosted checks; ensure owned DB tests cannot target shared/production DBs; record skipped provider features honestly.
- **Acceptance/test:** local lanes and hosted PR checks pass at one revision; secret scanner has no credential values in output; failure blocks merge. **[x]**

#### GYMOS-MIG-010 — contain exposed V1 credential

- **Objective/expected behavior:** obtain provider-side revoke/rotation, reuse investigation, access review, and V2 credential separation evidence.
- **Prerequisites:** direct authorization and action by credential/provider owner.
- **Sources:** redacted finding in `MIGRATION_RISK_REGISTER.md`; `evidence/GYMOS-MIG-010.md`.
- **Targets:** evidence/incident record only; do not edit or execute V1.
- **Instructions:** owner rotates/revokes at provider; checks reuse/deploy artifacts/access logs; supplies redacted confirmation; ensure V2 uses unrelated secrets; decide history treatment separately.
- **Acceptance/test:** provider confirmation with date/scope, reuse/access findings, V2 separation evidence, and release-blocker disposition. A code scan alone fails acceptance. **[x] Owner-attested containment; see final evidence**

#### GYMOS-MIG-077 — DEC-01 configuration ownership

- **Objective:** settle which gym profile fields are Master routing/brand data versus tenant operational configuration and define the cross-plane save boundary.
- **Prerequisites:** 001; review Database Map §§4–9 and O12.
- **Sources:** V1 `Gym` and `actions/gym-config.ts`; current Master `Gym/Theme`; tenant `GymConfiguration`.
- **Target:** proposed `docs/migration/decisions/DEC-01.md` plus synchronized maps/specs.
- **Instructions:** enumerate every field, owner, write authority, operation/recovery behavior, public projection, version conflict, and failure result.
- **Acceptance/test:** no duplicate source of truth; examples cover Master success/tenant failure and retry; reviewers named. **[x]**

#### GYMOS-MIG-079 — DEC-03 support scope

- **Objective:** settle read-only support creation, expiry, audit, private-field exclusions, and explicit exit.
- **Sources:** V1 S01/admin impersonation, approved target constraints, current guard.
- **Target:** proposed `decisions/DEC-03.md`.
- **Instructions:** define issuer/subject/gym/expiry/revocation, original actor, route scope, prohibited mutations/health data, and stale-context behavior.
- **Acceptance/test:** forged/expired/wrong-gym sessions fail; every mutation denies support; audit retains original actor. **[x]**

#### GYMOS-MIG-082 — DEC-06 exact money and earning

- **Objective:** approve currency set, Decimal scale/rounding/remainders, zero/null semantics, membership/pack earning, suspension/expiry treatment, and operational report labels.
- **Sources:** V1 `lib/pricing.ts`, financial actions, `RevenueRecord/SessionPack/Membership`; Database Map decisions.
- **Target:** proposed `decisions/DEC-06.md`.
- **Instructions:** use worked conservation examples; separate payment capture from operational earning; keep payment/refund/real receipt deferred.
- **Acceptance/test:** exact sums conserve across partial terms/packs and terminal session effects; boundary/zero examples approved. **[x]**

#### GYMOS-MIG-083 — DEC-07 gym time, terms, scheduling

- **Objective:** approve gym timezone authority, local-date inclusivity, DST gaps/ambiguity, shift/booking bounds, duration/tolerance, pack ordering, cancellation equality.
- **Sources:** V1 Membership/SessionPack/PTSession and session/config actions.
- **Target:** proposed `decisions/DEC-07.md`.
- **Acceptance/test:** examples cover midnight, leap day, DST gap/fold, cutoff equality, overnight policy, and stable pack choice. **[x]**

#### GYMOS-MIG-084 — DEC-08 settlement/payroll/corrections

- **Objective:** approve lock order, exclusion strategy, once-only origins, payroll periods/close, quote version acknowledgment, and immutable corrections.
- **Sources:** V1 `endSession`, `handleNoShow`, cancel and payroll actions; DEF-02–08.
- **Target:** proposed `decisions/DEC-08.md`.
- **Acceptance/test:** concurrent last-credit/complete/cancel/period-close examples yield one conserved outcome and a recoverable unknown result. **[x]**

#### GYMOS-MIG-085 — DEC-09 coaching/privacy/exports/refresh

- **Objective:** approve confirmed relationship states, health/note projections, builder limits/day mapping, metric windows, export caps/snapshots, poll cancellation, and cross-role refresh SLA.
- **Sources:** T02–T05, dashboard/analytics/CSV/bell actions; meal day mismatch.
- **Target:** proposed `decisions/DEC-09.md`; prepared 30 October 2026 at this execution checkpoint.
- **Acceptance/test:** unrelated trainer/foreign gym/privacy negatives; safe export formulas/caps; stale poll cannot overwrite switched gym; explicit day mapping. **[x]**

**Final decision:** concrete defaults and the owner amendments are approved by Esandu, who explicitly accepts the review responsibilities. No independent specialist review is claimed.

## 7. Security and multi-tenancy checklist

- [x] Master identity/access and tenant binding/schema foundations have linked evidence.
- [x] Bounded pools and owned disposable test databases are evidenced.
- [x] Exposed credential is provider-contained and reuse/access reviewed.
- [x] Open decisions define safe support, privacy, exports, and exact effects.
- [x] Hosted CI prevents secret and isolation regressions.
- [x] No evidence includes database URLs, password/hash/token, or customer data.

## 8. Testing and verification

Use only supported root scripts: `pnpm check:workspace`, `pnpm build:workspace`, `pnpm lint:workspace`, `pnpm typecheck:workspace`, `pnpm test:unit`, `pnpm test:database:owned`, and `pnpm test:recovery:owned`. Run targeted lanes relevant to the changed foundation. Never point owned tests at a shared database. ADR tasks use source/link/static consistency checks plus approved worked examples; they do not claim application runtime tests.

## 9. Definition of done

- [x] All eight open items above are resolved or an explicitly approved release disposition exists.
- [x] Every completed foundation still passes its relevant regression lane.
- [x] Tracker, coverage, decisions, risks, and evidence agree.
- [x] No critical credential/tenant/operation ambiguity remains for dependent tasks.

## 10. AI-agent checkpoint rules

Stop if a task needs provider/owner authority, a named decision lacks approval, a command could touch an unknown DB, or current source conflicts with recorded evidence. Report the exact blocker and next safe task; do not mark the segment complete.

## 11. Progress and handoff

- **Status:** COMPLETED — 30 October 2026.
- **Completed IDs:** 001–012, 014, 077–086 (23 owned tasks; task 013 belongs to Segment 02).
- **Remaining IDs:** none.
- **Evidence:** [CI repair and all 11 hosted results](../evidence/GYMOS-MIG-008.md), [owner-attested credential closure](../evidence/GYMOS-MIG-010.md), approved DEC-01/03/06/07/08/09 and linked evidence.
- **Verification:** authenticated hosted [run 41013407287](https://github.com/EsanduEpa/gymos-v2/actions/runs/41013407287) at `bdf3b41` passed all 11 required jobs: workspace, build, lint, type-check, unit, owned-database, browser, recovery, secret scan, dependency review and lockfile audit. Earlier run 41010929511 passed implementation revision `9f1849a`. No real database or V1 was changed.
- **Evidence boundary:** provider remediation/access review is owner-attested, not independently inspected; historical access uncertainty is retained. The legacy V1 diagnostic script still prints full records/raw errors and must not be run or published as evidence; safe-output cleanup is a separate legacy follow-up.
- **Owner scope:** member read-only viewing of own assigned workout/meal plans is added to tasks 051/052; 90-day trainer privacy, completed-session-only pay, unchanged expiry and continued earning during suspension are recorded. See [finalization](../SEGMENT_01_FINALIZATION.md).
- **Next dependency-satisfied task:** Segment 02 / GYMOS-MIG-013 dashboard shell (handoff only; not started here). Task 020 remains gated on DEC-11. Completion is not production-release approval.
