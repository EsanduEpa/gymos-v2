# GYMOS-MIG-027 — Operational gym profile and configuration

Status: **Automated verification completed; owner manual acceptance pending.**

## Implementation

- Added owner-only, verified-tenant configuration read and optimistic-version update endpoints with strict shared contracts and sanitized decimal-string projections.
- Added tenant address/contact/pay-period, PT fees, trainer percentages, cancellation policy fields, exact database precision, and immutable version snapshots.
- Added the Gym Profile, PT Session Rates, Trainer Pay Rates, and Cancellation Policy tabs with separate save feedback and preserved failed drafts.
- Master registry/public name and theme remain separately owned and saved; currencies/timezones are read-only here.

## Verification

- `pnpm exec prisma validate --schema packages/database-master/prisma/schema.prisma` — passed.
- `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma` — passed.
- `pnpm typecheck:workspace`, `pnpm lint:workspace`, `pnpm check:workspace`, `pnpm build:workspace` — passed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.platform.ts --disableConsoleIntercept` — 32/32 passed. Covers pure reads, no audit/receipt/version side effects, owner vs trainer/member/support, unknown fields, exact precision and zero, stale writes, saved values, two-gym isolation, and historical snapshot retention.
- The owned two-gym browser suite passed 11/11, including the Segment 04 owner settings route and responsive layout.

All databases were created by the owned disposable harness and reported cleanup. No shared or production data was used.

Hosted verification passed all 11 required jobs on implementation revision `c9af453` in [run 41210839760](https://github.com/EsanduEpa/gymos-v2/actions/runs/41210839760). The draft PR remains unmerged. Owner manual acceptance is a separate pending gate.
