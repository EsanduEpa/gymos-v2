# GYMOS-MIG-054 evidence — 4 November 2026

**Status: In Progress.** Added tenant expense/category schema and additive migration, owner-only exact create and paged/filter reads, receipt/audit writes, and an inline form that retains the entered draft on rejected/uncertain responses. Date-only expense filtering uses UTC date storage bounds, matching the gym-local accounting date already persisted.

Contract tests passed 54/54; owned finance PostgreSQL suite passed 2/2, verifying owner-only access, invalid precision, receipt/audit counts, exact replay without duplicates, cross-gym isolation, and accounting-date listing. Expense-audit failure injection returned a server error and preserved expense, audit, and receipt counts (finance-owned test, 3/3). Stale-version and visible browser review remain outstanding.

## 4 November 2026 continuation from ef81213

Owned DB now asserts an explicit stale budget/expense-adjacent version conflict in addition to existing replay and rollback. Expense creation itself has no mutable version field, so stale-version semantics apply to versioned budget and payroll commands. Visible form review remains.
