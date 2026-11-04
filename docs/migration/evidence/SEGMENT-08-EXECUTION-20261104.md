# Segment 08 execution evidence — 4 November 2026

Continuation from pushed commit `c1c7067` on `codex/segment-08-finance`. This continuation adds a platform cache correctness fix and acceptance fixtures; commit/PR and hosted checks remain pending. Segment 09 work was not started.

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

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:finance:owned`: **3/3 passed** on owned disposable PostgreSQL; cleanup reported six databases dropped, temporary container removed and manifest removed. Added stale/missing/failed platform-cache coverage and 25-row cursor batches; audit stable ordering over 27 same-time rows; expense audit-fault rollback; competing budget creation and payroll close races. The injected audit failure is expected and all expense/audit/receipt counts remain unchanged.
- `pnpm --dir apps/api exec vitest run --config vitest.config.session-lifecycle.ts test/session-lifecycle/session-lifecycle.integration.test.ts -t "writes a signed correction after a close wins"`: **1/1 passed**; late completion after close yields signed correction provenance.
- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test`: **54/54 passed**.
- `pnpm --dir apps/api exec vitest run src/finance/finance-arithmetic.spec.ts`: **5/5 passed** (membership/pack arithmetic, CSV bytes/formula safety, trainer shift defaults/overnight).
- `pnpm lint:workspace`: passed, no warnings after cleanup.
- `pnpm typecheck:workspace`: passed.
- `pnpm build:workspace`: passed; Next production build compiled, typechecked and generated 41 pages/routes.
- `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma`: passed.
- `pnpm check:workspace`: passed (5 packages; workspace graph valid).
- Tenant migration SHA-256 matches template manifest: `6cc8f78e5b4119deea1bca5dee6f64fa6fe9585c948d2d98019fe84953e4cace`.

The finance DB suite verifies expense role denials, precision rejection, replay/audit with one effect, budget replay and variance, full-window P&L reconciliation, membership/session recognition without a cash claim, payroll by source-session date and no payout/duplicate record, trainer privacy, two-gym isolation, >100 expense CSV rows, formula defense, filtered audit CSV and export audit, owner dashboard shape/access, analytics windows/shape/access, and bounded export date rejection.

## Exact remaining acceptance by task

- **049:** implementation and finance DB owner/trainer/foreign-gym/read-purity evidence are complete. Pending visible owner/trainer finance review and independent upstream 046/047 acceptance; task 048 remains outside this scope.
- **053:** implementation and arithmetic/DB reconciliation are complete. Pending explicit source-data matrix for timezone, suspension, expiry, partial and zero allocation dispositions.
- **054:** implementation, invalid precision, replay, foreign-gym denial, rollback fault injection, and stable >page audit fixture are complete. Pending stale-version case review and visible form/access/browser review.
- **055:** implementation, seven categories/full-window variance, duplicate-create race conflict, and zero budget semantics are complete. Pending update-race and month-edge fixture/review plus visible UI.
- **056:** implementation, owner/trainer scope, exact approval reconciliation/no payout, competing close race, and signed late-completion correction provenance are complete. Pending explicit configuration-change and retry fixture/review plus visible payroll review.
- **057:** implementation and DB P&L reconciliation are complete. Pending all-six-panel visible review, cross-month visual/chart parity, responsive/loading/empty/error states, and exact currency/window/asOf inspection.
- **058:** implementation and bounded owner DB shape are complete. Pending local-midnight/two-hour boundary fixture, selected-gym switch, overlapping refresh, empty/error labels, and visible review.
- **059:** implementation and fresh/stale/missing/failed platform summary, null-suppression, 25-item cursor continuation, and gym analytics DB shapes are complete. Pending explicit analytics 30-day/six-month edge and zero-denominator fixture, and visible chart/refresh review.
- **060:** implementation and 27-row stable same-time page ordering/filter fixture are complete. Pending redaction/support-original-actor/second-gym specific assertions and visible audit UI review.
- **061:** implementation and owned DB row-cap/formula/BOM/audit/auth cases plus helper CSV quoting tests are complete. Pending visible attachment download verification for MIME/filename/cancellation and browser review.
- **Cross-cutting:** visible Chrome O01/O10/O11/O13/T06 walkthrough, hosted check inspection, and review PR creation remain. No independent owner approval is claimed. No merge or deploy was attempted.

All ten tasks have implementation complete, but remain **In Progress** because their listed acceptance gates are not all satisfied. Segment 09 remains untouched.
