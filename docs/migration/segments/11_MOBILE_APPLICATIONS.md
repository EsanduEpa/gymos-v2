# Segment 11 — Mobile Applications

## Execution instructions for AI agents

This segment is conditional. Do not create an Expo app until DEC-12 is approved and stable web APIs/session invariants are verified. Native UI must consume the same Nest services/contracts; never duplicate business or settlement logic on device.

## 1. Segment overview

- **Capability:** approved member/trainer mobile subset.
- **Objective:** freeze scope, create secure native shell, implement approved directory/session/earnings flows, and release-test Android/iOS.
- **Result:** mobile clients safely reuse V2 APIs with secure OS token storage and gym branding.
- **Priority / complexity:** Conditional / Large.
- **Dependencies:** segments 07–10; GYMOS-MIG-048; DEC-12.
- **In scope:** GYMOS-MIG-072–076,088.
- **Out of scope:** any feature not explicitly approved in DEC-12, owner/admin native UI unless approved, offline authority, duplicated pricing/eligibility/settlement, progress/community/push unless commissioned.

## 2. Current V1 implementation

V1 has no mobile application. Relevant behavior references are web M01–M03 and T01–T03/T06. There is no push notification implementation, secure mobile token lifecycle, offline sync, app-store pipeline or native design source. Those cannot be called parity requirements without approval.

## 3. Target V2 implementation

An approved Expo/React Native app (exact stack/version selected by DEC-12) consumes shared runtime contracts and the same Nest endpoints. Tokens use OS secure storage, rotation/revocation/expiry policy, no web cookie assumptions, and no secret logs. Gym selection/theme and role navigation are device-safe. Server remains authoritative for eligibility, time, fee, credits, transitions, earnings and permissions.

## 4. V1 to V2 UI migration

Translate approved web information architecture into native controls while preserving workflow order, fields, warnings, errors, empty/loading/success states and role distinctions—not pixel-copying desktop chrome. Member: trainer directory, request, own sessions/cancel. Trainer: schedule/request response/start/complete/no-show/notes, confirmed clients if approved, own earnings. Accessibility, dynamic text, safe areas and platform navigation are required.

## 5. Backend and database migration

No mobile-specific business tables. API additions are limited to compatible auth/token transport, pagination and DTOs required by the approved subset. Optional push requires a separately approved device-token/consent/revocation design and must not replace durable in-app notifications. Offline caches contain minimal encrypted/non-sensitive data and never authorize commands.

## 6. Detailed tasks

### 088 — DEC-12 mobile scope/token/push

- **Prerequisites:** 048 and named product/security/mobile approvers.
- **Instructions:** select platforms/devices/OS baseline, exact member/trainer screens, auth token lifetime/refresh/revocation/storage, deep links, offline policy, analytics/privacy, app stores, and push yes/no.
- **Acceptance:** signed scope and threat examples; unapproved features explicitly deferred; release ownership/budget named. **[ ]**

### 072 — freeze mobile API subset

- **Prerequisites:** 002,020,048,050,057,088.
- **Instructions:** enumerate exact endpoints/contracts/errors/pagination/version compatibility; generate/use typed client; prove no Prisma/web-only types and no business duplication.
- **Acceptance:** contract fixtures for every native screen and invalid/expired/foreign/repeat outcomes; API compatibility policy approved. **[ ]**

### 073 — Expo shell, secure auth and themes

- **Prerequisites:** 072,088. **Targets:** proposed mobile workspace path only after approval.
- **Instructions:** app shell, secure store, login/refresh/logout, gym chooser, role nav, primary/logo fallback, network/error/loading, deep-link allowlist.
- **Acceptance:** token absent from logs/plain storage, revocation/expiry/offline/logout, two-gym switch, accessible native navigation/theme. **[ ]**

### 074 — member mobile directory/session flows

- **Prerequisites:** 039,042,044,047,073.
- **Instructions:** active trainer directory/search; request form/eligibility; own request/history; quoted withdraw/cancel with actual result; selected-gym refresh.
- **Acceptance:** no-credit/inactive/cutoff/stale quote/repeat/offline/foreign trainer, background-resume and accessibility tests. **[ ]**

### 075 — trainer mobile session/earnings flows

- **Prerequisites:** 045–047,049,050,073.
- **Instructions:** assigned schedule/requests, accept/decline, start/notes/complete/no-show as approved, confirmed clients and own earnings; server clock authoritative.
- **Acceptance:** wrong actor/state/time, repeat/concurrency/response loss, privacy, live timer display, exact earnings and offline denial. **[ ]**

### 076 — mobile tests and release pipelines

- **Prerequisites:** 066,073–075,088.
- **Instructions:** unit/contract/device E2E, Android/iOS build signing, secret handling, privacy/store metadata, staged distribution, crash/telemetry redaction, rollback/version policy.
- **Acceptance:** approved device/OS matrix passes; signed reproducible artifacts; release gates and store owner evidence; no critical mobile/security issue. **[ ]**

## 7. Security and multi-tenancy checklist

- [ ] OS secure token storage, rotation/revocation and logout verified.
- [ ] Device never decides role/gym/fee/time/credit/transition.
- [ ] Deep links and caches cannot cross gym/role or reveal private data.
- [ ] Logs/crash reports/analytics redact tokens, health and finance.
- [ ] Optional push has consent, minimal payload and token revocation if approved.

## 8. Testing and verification

Use shared contract tests, API role/tenant negatives, native unit/component tests, approved device/emulator E2E on Android/iOS, background/offline/clock/token lifecycle cases, and release build validation. Cross-device repeated commands must still yield one server effect.

## 9. Definition of done

- [ ] DEC-12 approved and exact subset implemented—no scope creep.
- [ ] Six tasks pass contract, device, security, accessibility and release gates.
- [ ] Same server business behavior is observed on web and mobile.
- [ ] Store/release ownership and rollback are documented.

## 10. Agent checkpoints

If DEC-12 defers mobile, mark the segment explicitly DEFERRED—not completed—and create no app. Stop on any request to implement business calculations or offline command authority on device.

## 11. Progress and handoff

- **Status:** NOT STARTED / CONDITIONAL
- **Completed:** none
- **Remaining:** 072–076,088
- **Next recommended task:** GYMOS-MIG-088 only after task 048 and web API stabilization.
- **Files/tests/issues/blockers/decisions:** _fill during execution_

