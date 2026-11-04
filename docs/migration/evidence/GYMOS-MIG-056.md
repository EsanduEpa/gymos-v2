# GYMOS-MIG-056 evidence — 4 November 2026

**Status: In Progress.** Added owner period listing/close/approval, trainer-scoped period reads, trainer-own earnings and existing-current-period read. Close/approve use a pay-period advisory lock, row lock, expected version, command receipt and audit. Approval reconciles record plus correction totals and explicitly does not initiate payout.

Workspace typecheck passes. Owned finance PostgreSQL suite passed 2/2 and verifies trainer-scoped earnings, owner denial, close then approval, exact total reconciliation, and no payout/duplicate pay row. Competing close requests produced one close and one conflict. The targeted lifecycle test “writes a signed correction after a close wins” passed 1/1, verifying late completion correction provenance. Configuration-change/retry coverage and visible owner/trainer review remain outstanding.

## 4 November 2026 continuation from ef81213

Reused the passing session-lifecycle test that mutates configuration and trainer level after booking yet settles pay at stored 0.400000/LEVEL_1, plus existing late-close correction provenance. No new payroll configuration case was needed. Visible owner/trainer payroll review remains.

Delegated visible review showed the owner’s open Nov period at LKR 50 for one earning and the trainer’s own earnings/current period at LKR 50. No close, approval or payout was performed. Payroll period API regression: the service omitted `currency`, causing output schema validation at `items[0].currency`; it now maps the configured currency, and the focused integration assertion passed. Configuration snapshot and visible payroll criteria complete; task status is Complete.
