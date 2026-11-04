# GYMOS-MIG-057 evidence — 4 November 2026

**Status: Complete.** Owner finance page has Revenue, Expenses, Deferred, Payroll, P&L and Export panels. P&L uses a bounded repeatable-read snapshot, full-window exact totals, source-date session earnings/payroll, local-day membership allocation and separates SALARIES-category expenses to prevent double counting. Finance export panel links to the authenticated CSV route. Revenue and P&L totals reconciled in the owned PostgreSQL fixture; the finance tab includes window, currency, basis and category totals.

Owned finance PostgreSQL suite passed 2/2, including P&L reconciliation. Contracts 54/54, arithmetic/CSV helper tests 5/5, lint, typecheck, Prisma validate and production build passed. Visible acceptance was completed under delegated review; the responsive chart layout fix and final hosted checks are tracked in the Segment 08 execution evidence.

## 4 November 2026 continuation from ef81213

The existing owned fixture spans prior and current month and reconciles P&L against membership, session earnings, expense and payroll; exact currency, window and asOf are schema-bound. Visual chart/panel/loading/error/responsive review remains.

Delegated visible review inspected all six panels, cross-month P&L (LKR 281.02 operational - 125 expenses - 50 payroll = LKR 106.02 surplus), LKR/window/asOf labels, empty Beta revenue, route loading and a 393×852 single-column finance layout. Membership rows previously displayed Oct 31 due UTC formatting of gym-local midnight; the table now formats with the gym timezone and rebuilt Chrome shows Nov 1, 2 and 3. Chrome also showed the export failure feedback (“No file was delivered”) and the six-month analytics empty utilization state.

The review found that existing chart rows had no `.dashboard-chart` layout styles, so labels, values and units ran together. Added grid columns and row separators in `apps/web/src/app/globals.css`. `pnpm --dir apps/web exec next build --webpack` passed, including TypeScript, and rebuilt Chrome visibly showed readable hour/month labels, distinct values and units at 393×852. Task acceptance is complete.
