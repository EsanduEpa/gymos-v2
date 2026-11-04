# GYMOS-MIG-049 evidence — 4 November 2026

**Status: In Progress.** Implemented tenant-gated owner revenue/deferred and trainer-own earnings reads in `apps/api/src/finance`, strict contracts and typed API client functions. Lines include source IDs, local date window, currency and `asOf`; cash received is explicitly null. Trainer current totals are computed from only that trainer's rows and corrections. GETs do not create pay periods.

Related tasks 053/056 extend the same read model. Existing evidence consumes lifecycle rows from 046/047; it does not close their hosted or owner-acceptance gates.

Local evidence: `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test` passed 54/54. `pnpm test:finance:owned` passed 2/2 in an owned disposable PostgreSQL environment, including owner/trainer/member/other-gym denials, trainer-own earnings, and GETs without period creation. Owner-visible review and upstream lifecycle source acceptance remain open.

## Visible continuation from `c273c76`

Agent-performed owner/trainer review under user delegation passed on synthetic Alpha/Beta gyms. Owner revenue displayed local membership accrual plus a completed session with currency/window/asOf; trainer login now opens My earnings and showed only its own LKR 50 session. The visible review does not independently accept upstream 046/047, which remain open. Payroll period response now includes the required currency; the targeted owner API integration assertion passed. See [Segment 08 execution evidence](SEGMENT-08-EXECUTION-20261104.md).
