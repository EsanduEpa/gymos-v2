# Segment 01 — Platform Foundation and Decision Gates

## Execution instructions for AI agents

Read this file completely; inspect linked evidence and current source; preserve completed work; execute only the first dependency-satisfied unchecked task; verify before checking it; record commands/exit codes and discrepancies; never run V1's exposed DB script or write secret values; stop at external/owner decision gates.

## 1. Segment overview

- **Business capability:** safe multi-tenant platform substrate and binding product/technical decisions.
- **Objective:** preserve verified V2 foundations and close the remaining CI, credential, ownership, money, time, settlement, privacy, and refresh gates that block feature slices.
- **Expected result:** downstream segments have stable contracts, isolation, recovery, test fixtures, UI primitives, visual references, and approved numeric/security behavior.
- **Priority / complexity:** Critical / Large (mostly completed foundation plus eight open items).
- **Dependencies:** none.
- **Prerequisites:** access to both repositories and current evidence; external credential owner for task 010; named approvers for open ADRs.
- **In scope:** GYMOS-MIG-001–012, 014, 077–086; correction/synchronization of their evidence and derived status.
- **Out of scope:** business feature APIs/pages, production deployment, provider selection, mobile scope, V1 modification, customer data migration.

## 2. Current V1 implementation

V1 is a single Next.js/Prisma application. `lib/auth.ts`, `lib/authz.ts`, `lib/pricing.ts`, `lib/passwords.ts`, `lib/rate-limit.ts`, `lib/audit.ts`, and all `app/actions/*` combine infrastructure and business behavior over one database. `prisma/schema.prisma` contains 20 models/14 enums with floats and `gymId` filtering. Shared presentation lives under `components/shared` and `components/layout`; `app/globals.css` is the V1 Classic reference. V1 has useful password hashing, rate limiting, and role checks, but not the approved physical tenant isolation, durable cross-database command protocol, exact money policy, or forced-change enforcement.

Important discrepancy: `/Users/esanduepa/Desktop/Projects/gymos/scripts/check-db.js` contains an exposed remote credential. Its value must never be read into evidence, executed, copied, or treated as remediated by a source scan.

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

Completed foundations provide canonical email identity, typed gym access/actor links, operation state/checkpoints, tenant receipts/audit, schema manifest verification, binding gates, bounded pools, disposable two-gym databases, and local isolated recovery. Ordinary API reads must remain pure. Commands use strict contracts, idempotency/request digests, local transactions, safe results, and explicit repair states. Open ADRs must decide configuration ownership, support context, exact decimal/currency/earning rules, gym time/date/DST rules, lock/payroll/correction policy, and coaching/privacy/export/refresh limits before dependent schema fields or APIs are created.

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

### Open work packets

#### GYMOS-MIG-008 — complete workspace and hosted CI evidence

- **Objective/expected behavior:** keep local `check/build/lint/typecheck/unit/database/recovery` lanes repeatable and add hosted PR secret/dependency/review evidence without exposing credentials.
- **Prerequisites:** 001, 002, 007 complete; configured Git remote/CI authority.
- **Sources:** root `package.json`, `infrastructure/scripts/check-workspace.mjs`, `docs/migration/runbooks/ci.md`, `evidence/GYMOS-MIG-008.md`.
- **Targets:** verified existing workspace scripts; proposed CI workflow only after repository/provider is known.
- **Instructions:** inspect existing local evidence; configure least-privilege hosted checks; ensure owned DB tests cannot target shared/production DBs; record skipped provider features honestly.
- **Acceptance/test:** local lanes and hosted PR checks pass at one revision; secret scanner has no credential values in output; failure blocks merge. **[ ]**

#### GYMOS-MIG-010 — contain exposed V1 credential

- **Objective/expected behavior:** obtain provider-side revoke/rotation, reuse investigation, access review, and V2 credential separation evidence.
- **Prerequisites:** direct authorization and action by credential/provider owner.
- **Sources:** redacted finding in `MIGRATION_RISK_REGISTER.md`; `evidence/GYMOS-MIG-010.md`.
- **Targets:** evidence/incident record only; do not edit or execute V1.
- **Instructions:** owner rotates/revokes at provider; checks reuse/deploy artifacts/access logs; supplies redacted confirmation; ensure V2 uses unrelated secrets; decide history treatment separately.
- **Acceptance/test:** provider confirmation with date/scope, reuse/access findings, V2 separation evidence, and release-blocker disposition. A code scan alone fails acceptance. **[ ] BLOCKED externally**

#### GYMOS-MIG-077 — DEC-01 configuration ownership

- **Objective:** settle which gym profile fields are Master routing/brand data versus tenant operational configuration and define the cross-plane save boundary.
- **Prerequisites:** 001; review Database Map §§4–9 and O12.
- **Sources:** V1 `Gym` and `actions/gym-config.ts`; current Master `Gym/Theme`; tenant `GymConfiguration`.
- **Target:** proposed `docs/migration/decisions/DEC-01.md` plus synchronized maps/specs.
- **Instructions:** enumerate every field, owner, write authority, operation/recovery behavior, public projection, version conflict, and failure result.
- **Acceptance/test:** no duplicate source of truth; examples cover Master success/tenant failure and retry; reviewers named. **[ ]**

#### GYMOS-MIG-079 — DEC-03 support scope

- **Objective:** settle read-only support creation, expiry, audit, private-field exclusions, and explicit exit.
- **Sources:** V1 S01/admin impersonation, approved target constraints, current guard.
- **Target:** proposed `decisions/DEC-03.md`.
- **Instructions:** define issuer/subject/gym/expiry/revocation, original actor, route scope, prohibited mutations/health data, and stale-context behavior.
- **Acceptance/test:** forged/expired/wrong-gym sessions fail; every mutation denies support; audit retains original actor. **[ ]**

#### GYMOS-MIG-082 — DEC-06 exact money and earning

- **Objective:** approve currency set, Decimal scale/rounding/remainders, zero/null semantics, membership/pack earning, suspension/expiry treatment, and operational report labels.
- **Sources:** V1 `lib/pricing.ts`, financial actions, `RevenueRecord/SessionPack/Membership`; Database Map decisions.
- **Target:** proposed `decisions/DEC-06.md`.
- **Instructions:** use worked conservation examples; separate payment capture from operational earning; keep payment/refund/real receipt deferred.
- **Acceptance/test:** exact sums conserve across partial terms/packs and terminal session effects; boundary/zero examples approved. **[ ]**

#### GYMOS-MIG-083 — DEC-07 gym time, terms, scheduling

- **Objective:** approve gym timezone authority, local-date inclusivity, DST gaps/ambiguity, shift/booking bounds, duration/tolerance, pack ordering, cancellation equality.
- **Sources:** V1 Membership/SessionPack/PTSession and session/config actions.
- **Target:** proposed `decisions/DEC-07.md`.
- **Acceptance/test:** examples cover midnight, leap day, DST gap/fold, cutoff equality, overnight policy, and stable pack choice. **[ ]**

#### GYMOS-MIG-084 — DEC-08 settlement/payroll/corrections

- **Objective:** approve lock order, exclusion strategy, once-only origins, payroll periods/close, quote version acknowledgment, and immutable corrections.
- **Sources:** V1 `endSession`, `handleNoShow`, cancel and payroll actions; DEF-02–08.
- **Target:** proposed `decisions/DEC-08.md`.
- **Acceptance/test:** concurrent last-credit/complete/cancel/period-close examples yield one conserved outcome and a recoverable unknown result. **[ ]**

#### GYMOS-MIG-085 — DEC-09 coaching/privacy/exports/refresh

- **Objective:** approve confirmed relationship states, health/note projections, builder limits/day mapping, metric windows, export caps/snapshots, poll cancellation, and cross-role refresh SLA.
- **Sources:** T02–T05, dashboard/analytics/CSV/bell actions; meal day mismatch.
- **Target:** proposed `decisions/DEC-09.md`; prepared 30 October 2026 at this execution checkpoint.
- **Acceptance/test:** unrelated trainer/foreign gym/privacy negatives; safe export formulas/caps; stale poll cannot overwrite switched gym; explicit day mapping. **[ ]**

**Current proposal:** concrete defaults and tradeoffs are documented. They remain unapproved; GYMOS-MIG-085 is Blocked until the project owner and accountable Coaching/Privacy, Finance, and Frontend reviewers approve or revise DEC-09.

## 7. Security and multi-tenancy checklist

- [x] Master identity/access and tenant binding/schema foundations have linked evidence.
- [x] Bounded pools and owned disposable test databases are evidenced.
- [ ] Exposed credential is provider-contained and reuse/access reviewed.
- [ ] Open decisions define safe support, privacy, exports, and exact effects.
- [ ] Hosted CI prevents secret and isolation regressions.
- [ ] No evidence includes database URLs, password/hash/token, or customer data.

## 8. Testing and verification

Use only supported root scripts: `pnpm check:workspace`, `pnpm build:workspace`, `pnpm lint:workspace`, `pnpm typecheck:workspace`, `pnpm test:unit`, `pnpm test:database:owned`, and `pnpm test:recovery:owned`. Run targeted lanes relevant to the changed foundation. Never point owned tests at a shared database. ADR tasks use source/link/static consistency checks plus approved worked examples; they do not claim application runtime tests.

## 9. Definition of done

- [ ] All eight open items above are resolved or an explicitly approved release disposition exists.
- [ ] Every completed foundation still passes its relevant regression lane.
- [ ] Tracker, coverage, decisions, risks, and evidence agree.
- [ ] No critical credential/tenant/operation ambiguity remains for dependent tasks.

## 10. AI-agent checkpoint rules

Stop if a task needs provider/owner authority, a named decision lacks approval, a command could touch an unknown DB, or current source conflicts with recorded evidence. Report the exact blocker and next safe task; do not mark the segment complete.

## 11. Progress and handoff

- **Status:** IN PROGRESS / BLOCKED
- **Completed IDs:** 001–007, 009, 011, 012, 014, 078, 080, 081, 086
- **Remaining IDs:** 008, 010, 077, 079, 082, 083, 084, 085
- **Files changed in this continuation:** `decisions/DEC-09.md`, `evidence/GYMOS-MIG-085.md`, and synchronized task/register/segment records.
- **Tests/results:** GYMOS-MIG-008 local workspace, build, lint, type-check, unit, owned database, browser, and recovery verification recorded in linked evidence. Local checks passed at `6f3358c`; hosted checks and online lockfile audit remain unverified. Task 085 is a decision-preparation task; no application test was run or claimed.
- **Known issues:** task 008 hosted evidence absent because no Git remote is configured; pnpm audit endpoint was unreachable and an escalated attempt was rejected by automatic approval review due to dependency metadata egress. Task 010 remains externally uncontained. DEC-01/03/06/07/08/09 proposals await owner/reviewer approval.
- **Run issue log:** `docs/migration/SEGMENT_RUN_ISSUES.md`.
- **Next recommended task:** obtain owner/reviewer responses on DEC-01/03/06/07/08/09 and continue the hosted GYMOS-MIG-008 gate when a remote/PR and authorized audit route are available. GYMOS-MIG-010 still requires provider-owner action.

