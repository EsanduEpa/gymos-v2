# GYMOS-MIG-059 evidence — 4 November 2026

**Status: In Progress.** Added owner-only repeatable-read analytics for estimated trainer utilization (bounded 365-day booking horizon, 22-day shift denominator, default eight-hour shift and overnight wrap), 30-day gym-local peak hours (06:00–20:59), and six gym-local member-growth months. Added Super Admin sanitized platform summary over the existing cached registry projection; stale or unavailable gyms suppress aggregate member/trainer counts, and refresh processes at most 25 gyms per request with explicit continuation cursor. Added owner analytics page and platform refresh UI.

Owned finance PostgreSQL suite passed 2/2, including owner denial, bounded time-series shapes, and analytics route checks. Workspace contracts (54/54), lint, typecheck and production build pass. Dedicated owned database fixture passed fresh aggregation, stale and missing cache suppression, failed-tenant refresh nulling, and cursor batches of 25 then remainder (included in finance-owned 3/3). Analytics edge/zero-denominator fixtures, chart visual review and hosted checks remain open.

## 4 November 2026 continuation from ef81213

Added owned DB empty second-gym analytics fixture: 30-day peak averages are finite zero, trainer utilization has no invented denominator row, and six month points remain bounded. Existing stale/partial platform-cache and cursor fixtures remain passing. Visible chart review remains.

The six-month edge fixture exposed a UTC-naive Member.createdAt comparison bug. The query now converts that column to a UTC instant before comparing gym-local boundary instants, and groups using the gym-local month. The fixture inserts records one millisecond before and at the first/last window boundaries and checks only the in-window rows contribute.

Delegated visible owner review displayed 30-day and six-month analytics windows with Asia/Colombo boundaries and finite values; the empty second gym showed a zero-data state rather than a fabricated trainer utilization row. Automated fixtures assert exact window edges and denominator behavior. Task status is Complete.
