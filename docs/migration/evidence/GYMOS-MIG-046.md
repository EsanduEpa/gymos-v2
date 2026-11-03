# GYMOS-MIG-046 — Complete started sessions exactly once

Status: **In Progress.** Evidence is from the uncommitted working tree on 3 November 2026. Parent-owned application registration and tenant-manifest integration are present in the shared tree; hosted checks remain pending.

## Implemented

- `POST /gyms/:slug/sessions/:sessionId/complete` is limited to ACTIVE sessions with `startedAt` and a HELD original credit. The minimum elapsed time is read from the immutable `GymConfigurationVersion` row referenced by the booked session, not the current mutable configuration. Current rates, trainer level and pay-period cadence are not consulted for the completed session.
- The command holds the selected-gym member/trainer access fence (and owner fence for an owner command), applies the DEC-08 period advisory lock before period/settlement/session effects, and commits one session event, receipt, audit and persisted member notification together with the financial effects.
- Completion consumes the held credit using its original ordinal/value even after pack expiry; writes one COMPLETED settlement and COMPLETED_SESSION operational earning; computes trainer pay from the stored confirmation rate/level; updates the OPEN period total; and returns stable effect IDs for replay. Same-key replay reconstructs the immutable committed response; different-key attempts against a terminal/versioned session conflict without another charge or earning.
- Added an additive tenant migration `20261103050000_trainer_pay_corrections` with period approval provenance and append-only signed `TrainerPayCorrection` rows. If close/approval wins the DEC-08 lock, completion writes the correction into the next OPEN period while preserving the source period, earning, session, actor, reason, and approval snapshot. No payout is created.
- Added `SESSION_COMPLETED` notification content using the member session link.

## Verification

- `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma` — exit 0.
- `pnpm exec prisma generate --schema packages/database-tenant/prisma/schema.prisma` — exit 0.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` and `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — exit 0.
- `pnpm --dir packages/api-client typecheck` — exit 0.
- `pnpm --dir packages/contracts test` — exit 0; 47/47 tests passed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-lifecycle.ts --disableConsoleIntercept` — exit 0; 3/3 guarded disposable PostgreSQL tests passed. The completion tests verify a 422 short-duration rejection with held credit preserved; successful and repeated completion use the original held ordinal/value after pack expiry; one settlement, movement, revenue, pay/correction, event, audit and member notification; frozen completion minimum/rate/level despite current configuration/trainer changes; rollback after injected revenue failure; and correction provenance/append-only/replay when CLOSED or APPROVED wins. Harness cleanup: six owned databases dropped, container removed and run manifest removed.
- Tenant migration checksum in the shared manifest is `9a29d2276335f6702635a8f8e5fdb20e9f6fc318a9f62ac5c7fee0d23cb368b1`.

## Remaining acceptance

- The trainer schedule mounts completion controls; the headed role-read run asserts the assigned trainer sees `Complete session` for a started row and the member sees no trainer command. The browser test does not execute completion; transactional success/replay/failure behavior is covered by the guarded API suite.
- Owner-observed Chrome review, hosted checks and final cross-task review remain pending. Task remains In Progress.
