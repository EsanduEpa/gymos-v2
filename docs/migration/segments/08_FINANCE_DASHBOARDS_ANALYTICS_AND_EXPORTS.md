# Segment 08 — Finance, Dashboards, Analytics, and Exports

## Execution instructions for AI agents

Read O01/O10/O11/O13/T06/H02, DEC-06/08/09, and lifecycle earning evidence. Use only committed operational facts; label metrics honestly; never turn V1's mock PAID/payment/subscription/receipt controls into real claims. Implement query semantics and privacy before charts.

## 1. Segment overview

- **Capability:** operational earning, expenses, budgets, payroll, owner/trainer dashboards, analytics, audit and scoped CSV.
- **Objective:** migrate V1 management insight screens onto exact, tenant-isolated read models and immutable source events.
- **Result:** owner sees explainable operational finance/analytics; trainer sees own earnings; exports are authenticated, bounded and formula-safe.
- **Priority / complexity:** High / Large.
- **Dependencies:** segments 03–07; DEC-06/07/08/09.
- **In scope:** GYMOS-MIG-049,053–061.
- **Out of scope:** payment gateway/cash ledger/refunds/tax/accounting sync/real receipts, subscription billing, physical attendance claims.

## 2. Current V1 implementation

O10 `/owner/financials` preloads six tabs: Revenue, Expenses, Deferred, Payroll, P&L, Export; charts/modals live under `financials/components`; actions in `app/actions/financials.ts`. T06 is read-only earnings. O01 owner dashboard uses `actions/dashboard.ts`, 30s refresh, four proxy cards, revenue chart, alerts, sessions, trainer floor cards. O11 analytics uses three computed chart panels. O13 audit filters/pages and exports the current page. H02 CSV supports financials/payroll. V1 uses Float, derived/hard-coded PAID rows, mutable pay terms, arbitrary pay periods, browser alerts/data URIs and labels that imply physical presence. `recordManualPayment` and subscription/payment controls are deferred under approved MVP.

## 3. Target V2 implementation

Tenant immutable lifecycle/earning origins, exact expenses/budgets/pay records, versioned periods and audit events feed bounded query services. Reads include `asOf`, window, currency and definitions; no aggregation from a partial page. Operational earning is distinct from cash received. Payroll close/approval is idempotent and not payout. Owner dashboard and analytics query stable projections; cross-gym platform summary uses approved sanitized aggregation. CSV is streamed/authenticated, snapshot/capped, escaped against spreadsheet formulas, and audited.

## 4. V1 to V2 UI migration

Preserve O10 six-tab order, dialogs, charts, confirmations and responsive panels; preserve T06 summary/table; O01 cards/chart/alerts/session table/trainer cards and manual/30s refresh; O11 three chart panels; O13 filter/table/pager/export. Replace browser alerts with verified inline outcomes where they represented real implemented actions, and hide deferred payment/accounting controls. Correct proxy labels (“scheduled/active sessions,” not people physically in gym) and always show metric definition/window/asOf. Each tab/chart supports loading/empty/error.

## 5. Backend and database migration

Proposed tenant schema includes immutable OperationalEarning/RevenueOrigin as approved, Expense, CategoryBudget, PayPeriod, PayRecord/Adjustment and indexes. Session origins are unique; membership/pack earning conserves exact value. Query modules return decimal strings. Audit reads use tenant AuditLog; platform audit remains Master. Exports reuse authorized queries, never accept arbitrary table/column/DB input. No cross-DB joins; platform rollups call controlled summaries with partial-failure semantics.

## 6. Detailed tasks

| Done | Task | Prerequisites and sources | Exact implementation result | Acceptance/testing |
|---|---|---|---|---|
| [ ] | **049 Lifecycle earnings baseline** | 032,043,046,047,082,084; session/revenue/pay actions | Unique lifecycle origins and owner/trainer-safe projections; explicit operational label/currency/asOf | one origin per terminal fact; repeat/response-loss exact; role/tenant/privacy tests |
| [ ] | **053 Membership/pack earning** | 030,034,046,047,049,082,083; O10 Revenue/Deferred | Approved daily/session allocation with exact remainder conservation; suspension/expiry disposition | full/partial/zero/leap/timezone/expired/suspended examples sum exactly; no payment claim |
| [ ] | **054 Expense capture/list** | 012,018,027,049; O10 expense dialog/actions | OWNER-only exact expense transaction, bounded notes/category/date, paged filters | required/invalid/precision/date/repeat/stale/foreign tests; dialog retains failure draft |
| [ ] | **055 Budgets/variance** | 012,027,054,082; O10 budget dialog/chart | unique category+month/versioned exact budget; variance over complete window | zero semantics, duplicate/concurrent update, month boundaries, full totals, chart empty/error |
| [ ] | **056 Payroll close/approval/adjustment** | 018,046,049,053,084; O10 Payroll/T06 | approved local period, snapshot records, close and approval distinct, immutable reasoned corrections | boundary/late completion/concurrent close/retry/config change/owner vs trainer projection; no payout claim |
| [ ] | **057 Finance panels/P&L/charts** | 012,053–056,082,084; O10 | six honest query panels using exact DTOs; P&L definitions; exports delegated to 061 | each window/currency/asOf, full totals, no NaN/float drift, loading/empty/error/visual parity |
| [ ] | **058 Live owner dashboard** | 013,032,037,043,044,049,053,083,085; O01 | honest stat definitions, bounded alerts/sessions/trainers, 30s+manual refresh with stale response discard | selected-gym switch, poll overlap, empty/error, time window, no physical-attendance claim, visual tests |
| [ ] | **059 Operational analytics/platform summaries** | 024,037,044,053,058,083,085; O11/S01 | three series with approved denominators/windows; sanitized platform partial rollup | zero denominator, missing tenant, window/timezone, support scope, no cross-tenant detail leak |
| [ ] | **060 Audit screen/taxonomy** | 013,024,043,056,080,085; O13 | stable event taxonomy, server filter/cursor, sanitized transition projections, tenant/platform scope | >page ordering, filter, duplicate key, private field redaction, support original actor, two-gym denial |
| [ ] | **061 Authenticated scoped CSV** | 020,044,057,060,085; H02/O08/O10/O13 | authorized server download, capped snapshot, safe filename/content-type/BOM/escaping/formula defense | role/scope/date/cap, formula/newline/quote cells, stable snapshot, abort/failure UI, audit event |

All target feature modules and models are **proposed** until created; use actual repository conventions and record paths in handoff. Existing verified reusable targets are shared contracts/client/UI, tenant transaction receipts/audit, auth/tenant gates, and chart frame.

## 7. Security and multi-tenancy checklist

- [ ] OWNER reads gym finance; TRAINER reads only own approved earnings; MEMBER has no finance access.
- [ ] Support scope follows DEC-03 and excludes private detail as approved.
- [ ] Exact decimals/currency/date windows are server-defined; no client totals are authoritative.
- [ ] Export caps, snapshot, formula escaping and audit prevent data/execution leakage.
- [ ] Platform summaries never expose tenant rows or silently treat failed tenants as zero.

## 8. Testing and verification

Use exact-arithmetic unit/property tests, owned Postgres integration and lifecycle-origin fixtures, role/tenant negatives, query count/window tests, concurrent payroll close, CSV byte/content tests, and targeted O01/O10/O11/O13/T06 browser visual/accessibility/poll tests. Verify no GET writes and no partial-page totals. Run package/workspace checks for changed areas.

## 9. Definition of done

- [ ] Ten tasks and all five screen families pass.
- [ ] Every number has definition/window/currency/asOf and reconciles to unique source facts.
- [ ] Mock cash/payment/receipt/accounting/subscription behavior is absent or honestly deferred.
- [ ] Exports and audit are complete, authorized, isolated, bounded and redacted.

## 10. Agent checkpoints

Stop if DEC-06/08/09 is unapproved or an earning line cannot be tied to an immutable origin. Do not infer cash from membership/pack issuance. Do not label scheduled sessions as physical attendance.

## 11. Progress and handoff

- **Status:** NOT STARTED
- **Completed:** none
- **Remaining:** 049,053–061
- **Next recommended task:** GYMOS-MIG-049.
- **Files/tests/issues/blockers/decisions:** _fill during execution_

