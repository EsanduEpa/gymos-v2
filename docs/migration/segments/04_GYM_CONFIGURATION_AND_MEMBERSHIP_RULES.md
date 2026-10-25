# Segment 04 — Gym Configuration and Membership Rules

## Execution instructions for AI agents

Read DEC-01/06/07/08 and O12 sources; verify platform/actor prerequisites; distinguish verified current paths from proposed modules; implement schema→service/API→web for one task; test exact values, time boundaries, roles, and tenant isolation before checking it.

## 1. Segment overview

- **Capability:** gym profile, branding, membership products, rates, pay and cancellation policy, and date-derived eligibility.
- **Objective:** migrate O12's five tabs plus approved primary/logo controls and replace unsafe expiry writes with authoritative eligibility/renewal.
- **Result:** owners manage one tenant's operational configuration through typed/versioned APIs; every downstream quote/session/report can consume immutable policy versions.
- **Priority / complexity:** High / Large.
- **Dependencies:** segments 01–03; DEC-01/06/07/08.
- **In scope:** GYMOS-MIG-015,027–030.
- **Out of scope:** member registration, pack issuance, payments/subscriptions, expanded fonts/modes/presets, invented opening-hours feature.

## 2. Current V1 implementation

O12 sources: `app/(dashboard)/owner/gym-config/page.tsx`, `gym-config-client.tsx`, `app/actions/gym-config.ts`, `app/actions/members.ts:checkMembershipExpiries`, and V1 `Gym`, `MembershipPlan`, `Membership`. Five tabs are Profile, Plans, Session Fees, Pay Rates, Policy. Forms update name/address/phone; create plan name/description/price/duration; configure session rate card, trainer percentages, cancellation settings. Shared feedback clears on tab changes. V1 uses Float, truthy fallbacks that can ignore zero, mutable current policy reads, and a read-triggered expiry sweep that can incorrectly couple an old term to identity status.

Current V2 has Master `Gym/Theme`, tenant `GymConfiguration`, GET/PATCH theme, Classic tokens, and a public-safe gym page scaffold. Operational fields, plans, membership terms, rates, and policy models/APIs are absent.

## 3. Target V2 implementation

Per DEC-01, Master keeps routing/status/public brand fields while tenant configuration owns gym operations. Writes spanning planes use durable operation semantics, not a fake transaction. Use exact Decimal/money-string contracts and gym timezone/local-date rules. Configuration and policy records have versions/effective dates; session/membership/pay outcomes snapshot the applied version. Eligibility is derived from valid terms at the gym-local date; no GET/read writes identity status.

## 4. V1 to V2 UI migration

Preserve `/owner/gym-config`, tab order, inline Add Plan form, field labels/defaults, buttons, shared feedback, responsive grids, and V1 visual hierarchy. Add only approved primary-color and HTTPS logo controls in the appropriate profile/appearance area; Classic fallback remains internal. Each tab needs independent loading/error/empty/success state and draft retention on API failure. Status colors are semantic and never recolored by the gym primary.

## 5. Backend and database migration

Proposed tenant models/modules: versioned operational `GymConfiguration`, `MembershipPlan`, immutable/dated `MembershipTerm`, rate/pay/cancellation policy records or versioned fields as approved. Master Theme remains primary/logo source. Controllers validate DTOs; services enforce OWNER and current tenant; optimistic versions reject stale edits. Exact schema names/paths must follow ADRs and current conventions, not be invented from V1. Membership renewal creates a new term and keeps history; downstream entitlements reference term/policy snapshots.

## 6. Detailed tasks

### GYMOS-MIG-027 — operational gym profile/config reads

- **Prerequisites:** 013,018,023,077,082,083. **Sources:** O12 Profile, V1 Gym/config action, current schemas/theme.
- **Targets:** tenant configuration Prisma fields/migration; proposed Nest config module/contracts/client/web adapter.
- **Instructions:** implement approved ownership; pure sanitized read; versioned owner update; operation only if crossing Master/tenant; timezone/currency immutable or guarded per ADR.
- **Acceptance/test:** owner success, trainer/member/support mutation denial, stale version, invalid bounds, foreign gym, Master/tenant injected failure, pure GET. **[ ]**

### GYMOS-MIG-028 — membership plans and owner plan form

- **Prerequisites:** 012,018,027,082,083. **Sources:** O12 Plans, `createMembershipPlan`, `MembershipPlan` schema.
- **Targets:** proposed tenant plan model/service/controller/DTOs and Plans tab.
- **Instructions:** exact price string→Decimal, bounded duration/name/description, active/history semantics approved by ADR, duplicate policy explicit; never expose Prisma Decimal/record directly.
- **Acceptance/test:** valid create/list, zero/negative/precision/overflow/unknown field, role/tenant negatives, empty/list UI, repeat submission. **[ ]**

### GYMOS-MIG-029 — rates, pay percentages, cancellation policy

- **Prerequisites:** 012,027,028,082–084. **Sources:** remaining O12 tabs, V1 pricing/config actions.
- **Targets:** proposed versioned tenant policy schema/service/APIs/tab forms.
- **Instructions:** preserve V1 fields but honor zero; validate exact percentages/rates/windows/toggles; effective version and audit; expose quote-safe projection; existing sessions never change retroactively.
- **Acceptance/test:** zero/null/boundary/precision/stale version, invalid toggle combination, role/tenant denial, historical quote unchanged. **[ ]**

### GYMOS-MIG-030 — date-derived membership eligibility and renewal

- **Prerequisites:** 018,028,029,083. **Sources:** V1 Membership and unsafe expiry action; O02/O04 displays.
- **Targets:** proposed tenant membership-term schema/service/contracts; no read-triggered job.
- **Instructions:** derive active/expired/not-started from inclusive rules and gym time; renewal appends term with approved overlap policy; actor access status remains separate; return reason/asOf/version.
- **Acceptance/test:** boundary before/on/after start/end, timezone/DST/leap date, multiple old/current/future terms, suspension, concurrent renewal, pure reads. **[ ]**

### GYMOS-MIG-015 — branding editor and fallback

- **Prerequisites:** 011–013,024,027,086. **Sources:** current theme endpoint/page, O12, Classic tokens.
- **Targets:** adapt `gyms.controller.ts`, shared contracts/client, gym-config UI.
- **Instructions:** OWNER-only primary hex and HTTPS logo; safe public projection/cache invalidation; sanitize/fallback broken logo; accessible contrast and immutable status colors; audit/version update.
- **Acceptance/test:** invalid scheme/color/size, support/trainer/member mutation denial, two-gym switch, broken/missing logo, contrast, desktop/mobile visual diff. **[ ]**

## 7. Security and multi-tenancy checklist

- [ ] OWNER-only writes enforced in Nest; public theme exposes no registry/identity internals.
- [ ] Tenant configuration and terms always use verified DB binding.
- [ ] Exact value/time validation is server authoritative.
- [ ] Optimistic versions prevent lost updates; operations recover cross-plane writes.
- [ ] Theme URLs are HTTPS and safely rendered; no script/data URL.

## 8. Testing and verification

Use contract/client tests, API unit/service tests, owned tenant DB integration tests, and targeted O12 browser/visual/accessibility tests. Include pure-read persisted-count checks, role matrix, two-gym foreign IDs, exact decimal round trips, date/DST fixtures, stale versions, and injected cross-plane failure. Finish changed-package lint/typecheck.

## 9. Definition of done

- [ ] O12 and branding preserve V1 UI behavior with approved corrections.
- [ ] Configuration ownership, exact values, time semantics, and versions match ADRs.
- [ ] All five tasks pass role/tenant/failure/regression tests.
- [ ] Current V2 theme and platform activation continue to work.

## 10. Agent checkpoints

Do not create policy/schema fields before their ADR is approved. Do not add opening hours or expanded theming. Stop if a cross-plane profile field lacks an owner/recovery rule.

## 11. Progress and handoff

- **Status:** NOT STARTED
- **Completed:** none
- **Remaining:** 015,027–030
- **Next recommended task:** GYMOS-MIG-027.
- **Files/tests/issues/blockers/decisions:** _fill during execution_

