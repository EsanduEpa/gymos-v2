# GYMOS-MIG-030 — Date-derived eligibility and membership renewal

Status: **Automated verification completed; owner manual acceptance pending.**

## Implementation

- Added immutable membership terms with date-only start and exclusive end, agreed price/currency/name snapshots, source configuration version, and idempotency data.
- Added pure gym-local eligibility projection and owner renewal endpoint. Reads do not mutate member, identity, term, receipt, or audit state.
- Renewal appends a term, supports next-available/immediate policies, locks the member row, rejects overlaps/stale versions, and replays stable idempotency keys.

## Verification

- Membership rules cover inclusive start, exclusive expiry, expired and future terms, inactive/suspended actors, DST date selection, leap dates, and unchanged term end on suspension.
- API integration covers foreign plans/members, missing role access, repeated-key replay, immediate-overlap denial, concurrent renewal conflict, no read writes, and identity auth-version preservation.
- API platform suite passed 32/32; unit/date rules and workspace type/lint/build checks passed.

Daily entitlement earning, session packs, payments, and identity status mutation remain out of scope.

Hosted verification passed all 11 required jobs on implementation revision `c9af453` in [run 41210839760](https://github.com/EsanduEpa/gymos-v2/actions/runs/41210839760). The draft PR remains unmerged. Owner manual acceptance is a separate pending gate.
