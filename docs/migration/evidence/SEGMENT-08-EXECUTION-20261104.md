# Segment 08 execution evidence — 4 November 2026

Branch at start: `codex/segment-06-management`; changes remain uncommitted pending Git metadata approval. Segment 09 work was not started.

## Implemented task scope

- **049:** Owner operational revenue/deferred and trainer-own earnings reads, strict contracts/client, explicit null cash and no GET-created payroll period.
- **053:** Exact daily membership allocation and separate session-pack available/held/expired value.
- **054–055:** Additive expense/budget schema migration, exact owner expense writes/listing, replay/audit, seven categories and full-month variance.
- **056:** Owner close/approve and owner/trainer period reads; advisory/row locks, versioned receipts/audit, exact total reconciliation and no payout.
- **057:** Six finance panels and full-window P&L; session-linked earning and payroll basis by scheduled source date, membership accrual by local day, salary category separate to prevent double count.
- **058:** Owner-only bounded dashboard and manual/30-second refresh with stale-response sequencing.
- **059:** Three bounded gym-local analytics series and sanitized cached platform summaries with stale/partial suppression and at-most-25 refresh batches.
- **060:** Owner filtered/paged audit screen with strict event taxonomy, stable server order and safe transition fields.
- **061:** Authenticated bounded CSV for revenue, expenses, payroll and current audit page; BOM/CRLF/quoting/formula defense, safe filename, no-store/nosniff and audited export.

## Verified checks

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:finance:owned`: **2/2 passed** on owned disposable PostgreSQL; cleanup reported six databases dropped, temporary container removed and manifest removed.
- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test`: **54/54 passed**.
- `pnpm --dir apps/api exec vitest run src/finance/finance-arithmetic.spec.ts`: **5/5 passed** (membership/pack arithmetic, CSV bytes/formula safety, trainer shift defaults/overnight).
- `pnpm lint:workspace`: passed, no warnings after cleanup.
- `pnpm typecheck:workspace`: passed.
- `pnpm build:workspace`: passed; Next production build compiled, typechecked and generated 41 pages/routes.
- `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma`: passed.
- `pnpm check:workspace`: passed (5 packages; workspace graph valid).
- Tenant migration SHA-256 matches template manifest: `6cc8f78e5b4119deea1bca5dee6f64fa6fe9585c948d2d98019fe84953e4cace`.

The finance DB suite verifies expense role denials, precision rejection, replay/audit with one effect, budget replay and variance, full-window P&L reconciliation, membership/session recognition without a cash claim, payroll by source-session date and no payout/duplicate record, trainer privacy, two-gym isolation, >100 expense CSV rows, formula defense, filtered audit CSV and export audit, owner dashboard shape/access, analytics windows/shape/access, and bounded export date rejection.

## Explicitly incomplete acceptance

- **Visible browser walkthrough:** blocked because the CUA browser-access host is unavailable. No owner-visible Chrome review or independent owner approval is claimed. Resume when Chrome/browser access is restored while the owner watches.
- **Platform analytics:** no dedicated tenant-missing/stale/partial summary or multi-batch cursor fixture yet; API behavior is implemented but that finite acceptance remains open.
- **Concurrency/fault cases:** budget concurrent update/create race, payroll competing close race, late completion/correction provenance, and expense transaction rollback fault injection remain unverified.
- **UI interactions:** selected-gym switch/overlapping refresh, finance/chart visual parity, audit paging/filter, CSV download behavior, responsive/loading/empty/error states remain for visible review.
- **Hosted checks and reviewable PR:** pending Git branch/commit/PR preparation and GitHub connectivity; `gh` is not installed in the environment. No merge or deploy was attempted.
- **Upstream lifecycle tasks 046/047 and task 048 remain open;** Segment 08 consumes their existing tenant facts but does not claim their acceptance.

All ten Segment 08 tasks remain **In Progress** (0/10 completed). Segment 09 remains untouched.
