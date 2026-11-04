# GYMOS-MIG-053 evidence — 4 November 2026

**Status: Complete.** Revenue projection allocates membership value by local service day using integer minor units and deterministic term/date source IDs. Session-pack available/held/expired-unused value is separately projected from movement/hold ordinals; expired unused value is kept outside operational totals.

Contract suite passed 54/54; finance arithmetic/CSV/helper suite passed 5/5; owned finance PostgreSQL suite passed 2/2 and verifies full-month membership accrual and separate operational/cash representation. General leap/remainder/partial allocation arithmetic is covered by unit tests. The continuation fixture below closes the timezone, suspension and expiry source-data matrix. No cash/payment claim is made.

## 4 November 2026 continuation from ef81213

Added owned DB source-data fixture: a suspended member’s three-day LKR 0.10 term in Asia/Colombo allocates 0.04/0.03/0.03, totals 0.1000, starts at 2026-08-31T18:30Z, and has zero post-expiry allocation. Existing unit tests prove zero and partial remainder arithmetic. Automated allocation acceptance passed; visible finance review remains.

The delegated visible owner review then showed the current-month term split across gym-local dates Nov 1–3, with LKR 31.0200 accrued in the Nov 1–4 window. The rebuilt UI now formats the serialized local-midnight allocations in Asia/Colombo rather than showing the previous UTC day. Task acceptance is Complete.
