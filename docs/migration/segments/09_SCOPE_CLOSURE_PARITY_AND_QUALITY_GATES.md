# Segment 09 — Scope Closure, Parity, and Quality Gates

## Execution instructions for AI agents

Do not use this segment to hide unfinished feature work. Reinspect both codebases and all maps at current revisions, reconcile every inventory item, then run complete journeys, visual/accessibility, security/isolation and capacity gates. Failed evidence reopens the owning segment.

## 1. Segment overview

- **Capability:** explicit scope/deferment and final web quality assurance.
- **Objective:** prove static coverage and runtime parity for the approved web MVP.
- **Result:** no silent omissions, mocks, tenant leaks, visual regressions, or unsupported completion claims remain.
- **Priority / complexity:** Critical / Large.
- **Dependencies:** segments 01–08; credential containment for security release gate.
- **In scope:** GYMOS-MIG-062–066.
- **Out of scope:** implementing missing features inside audit tasks except narrowly fixing discovered defects under reopened owners; deployment/mobile.

## 2. Current V1 implementation

The original V1 inventory is 29 route responsibilities (26 rendered pages), 74 TSX files, 40 component files, 44 exported actions, 20 models, 14 enums, 39 workflows, 52 interaction groups, 22 local-control groups, 63 source-derived proposed contracts and 8 existing V2 operations. Two additional V2 member plan-read contracts (C64/C65) were added for owner-approved first-release scope; these are new V2 scope, not V1 routes. V1 has no member plan delivery, check-in/community/ratings, and only primary Classic styling.

## 3. Target V2 implementation

All approved web features must trace source→contract/schema→implementation→test/evidence. Deferred items are absent from normal navigation or visibly non-operational without fake success. The two-gym harness drives role journeys. V1 safe synthetic fixtures anchor screenshots. Security gates cover current authorization, tenant binding, capacity, secrets and forbidden fields.

## 4. V1 to V2 UI migration

Compare every rendered route at approved desktop/mobile sizes and interaction states: default, loading, empty, validation, API error, success, modal, focus, role variations and theme fallback. Preserve V1 hierarchy/spacing/control behavior under semantic tokens; intentional differences require decision/task reference. Verify keyboard/focus/labels/contrast/reduced motion where applicable. O14 stays hidden/deferred.

## 5. Backend and database migration

Reconcile every C/E contract, action disposition, model/enum field, Master/tenant owner, migration and authorization/test. Run wrong-role, wrong-gym, forged ID, stale token/access, binding mismatch, schema mismatch, pool saturation, repeat/concurrent command and secret/redaction checks. No schema change is made merely to satisfy a count; differences must have approved rationale.

## 6. Detailed tasks

### 062 — record deferred billing, progress and theme scope

- **Prerequisites:** 002,015,032,057. **Sources:** O14, O04 progress state, progress models, mock payments/receipts, older theme proposals.
- **Instructions:** assert navigation/API absence or honest non-operational presentation; list exact future capabilities and source references; prevent placeholder alerts/PAID labels from implying service.
- **Acceptance/testing:** route/nav/direct URL, contract/endpoint and UI text checks prove no fake billing/payment/receipt/progress/expanded theme capability. **[ ]**

### 063 — final source-to-task parity reconciliation

- **Prerequisites:** all listed web feature tasks through 062. **Sources:** both current trees, four maps, traceability, tracker/coverage.
- **Instructions:** regenerate inventories; assign every added/removed item; reconcile routes/actions/models/contracts/interactions/deferred items and evidence; detect duplicate ownership.
- **Acceptance/testing:** 0 unexplained items/dangling IDs/links; actual counts recorded; discrepancies reopen owner tasks; no “100% runtime” claim from static audit. **[ ]**

### 064 — complete two-gym cross-role journeys

- **Prerequisites:** 007,035,038,048,051,052,057,063.
- **Instructions:** deterministic Gym A/B fixtures; admin/owner/trainer/member journeys including credentials, config, enrollment, packs, request/accept/start/complete/cancel/no-show, coaching, finance, bell/audit/export; switch contexts mid-request.
- **Acceptance/testing:** all journeys pass with persisted invariant counts; Gym B unchanged during A commands; errors do not show success; artifacts/revision captured. **[ ]**

### 065 — visual, responsive and accessibility parity

- **Prerequisites:** 014,063,064. **Instructions:** compare safe V1 fixtures to every V2 screen/state at approved viewports/themes; keyboard/screen-reader labels/focus/contrast; reviewer classifies diffs.
- **Acceptance/testing:** required baseline manifest complete; no unexplained high-impact diff; 320px without blocked controls; modal/drawer/tab/table/chart states accessible. **[ ]**

### 066 — security, isolation and capacity gate

- **Prerequisites:** 006,010,026,048,061,064. **Instructions:** execute threat/negative matrix, pool/load limits, secret scan, forbidden-field recursion, cross-tenant DB swap/resource IDs, support boundaries, command replay/races, recovery-safe failures.
- **Acceptance/testing:** no critical/high unresolved leak/integrity issue; credential containment linked; caps fail safely; redacted report and residual risks approved. **[ ]**

## 7. Security and multi-tenancy checklist

- [ ] Every endpoint has direct role/gym/actor/resource negatives.
- [ ] Cross-tenant IDs and physical binding swaps reveal no data.
- [ ] Secrets/hashes/DB details/private health/pay fields are absent from unauthorized output/logs.
- [ ] Pool saturation/shutdown and schema mismatch fail closed.
- [ ] Credential incident containment is externally evidenced.

## 8. Testing and verification

Run complete supported workspace checks plus owned DB integration, E2E, visual manifest verification, security matrix and capacity suite. Record environment/revision/fixtures/commands/exit codes and retain redacted artifacts. A flaky/failed/skipped required test blocks verification.

## 9. Definition of done

- [ ] 062–066 verified with reviewed evidence.
- [ ] All required V1 features/routes/workflows and approved corrections are represented.
- [ ] No unexplained coverage gap, duplicate owner, critical security issue or visual/accessibility blocker.
- [ ] Deferred scope is explicit and honest.

## 10. Agent checkpoints

If the audit finds missing behavior, reopen its owning task/segment and stop the relevant gate. Do not implement broad fixes inside 063–066 or lower severity without evidence.

## 11. Progress and handoff

- **Status:** NOT STARTED
- **Completed:** none
- **Remaining:** 062–066
- **Next recommended task:** GYMOS-MIG-062 after feature completion.
- **Files/tests/issues/blockers/decisions:** _fill during execution_

