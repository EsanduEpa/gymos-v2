# GYMOS-MIG-058 evidence — 4 November 2026

**Status: Complete.** Added owner-only read-only dashboard endpoint and dashboard route, moved the existing member roster to `/owner/members`, and added manual/30-second refresh with stale-request sequencing. Data includes gym-local day/window/asOf, source counts and definitions, eight two-hour earning buckets, up to ten sessions and 50 trainers. Text avoids physical attendance claims.

Dashboard contract test passes within the 54-test contracts suite; owned finance PostgreSQL coverage checks owner-only access and bounded dashboard shape. Historical limitations below are superseded by later delegated visible review and the focused deterministic request-order test.

## 4 November 2026 continuation from ef81213

Added owned DB gym-local midnight and 07:59/08:00 bucket fixture; pre-midnight earning is excluded, current-day operational total is 9.0000, and two-hour buckets split 3.0000/4.0000. The dashboard now remounts on gym slug change and preserves last data on refresh error. Visible gym-switch/overlap review remains.

The inherited browser isolation suite also revealed an obsolete add-member redirect to the former owner root. The redirect now returns to `/owner/members?created=1`, preserving the roster success state after Segment 08 moved the owner root to the live dashboard. The five affected browser checks passed across the route-sensitive rerun and the rebuilt add-member rerun. This is automated browser evidence, not the visible owner walkthrough.

In the delegated review, owner Alpha visibly showed Asia/Colombo `asOf`, the 06:00–22:00 two-hour explanation, an 08:00 completed session and LKR 250 recognized earning; copy clarified session counts do not mean physical attendance. Owner switched to Beta; its dashboard showed zero earning/no session records and did not show Alpha's LKR 250. Refresh was activated twice, but an overlapping-response ordering was not conclusively observed. The empty state is visible.

## Visible refresh failure retry from `cad3434`

A fresh guarded disposable fixture reported API and web readiness on loopback ports and synthetic Alpha/Beta gyms. In visible Chrome, owner Alpha's Refresh now control was activated, then the fixture API was terminated to exercise the failure path. The dashboard visibly displayed “Dashboard data could not be refreshed. The last loaded values are shown.” and retained the prior LKR 250 result and `Asia/Colombo` asOf label. The web route then could not load finance because its API had been stopped. The recorded stop file caused cleanup to report six databases dropped and the temporary container and manifest removed.

## Merge-readiness verification at `214483f` continuation

The focused test `apps/api/src/finance/segment08-client-transport.spec.ts` deterministically completes the newer dashboard refresh first and the older refresh last, then asserts only the newer payload remains. It exercises the same `LatestRequestSequence` used by the owner dashboard. The test passed 2/2 with the CSV proxy signal propagation case. This closes dashboard ordering acceptance alongside the visible selected-gym, empty-state, and refresh-error review. **Task status: Complete.**
