# PT scheduled work and release handoff

## Runtime

The API registers `SessionExpiryRunner` in `AppModule`. It starts once on application initialization, runs immediately and every 30 seconds, and drains the current pass on shutdown. `NODE_ENV=test` or `PT_EXPIRY_RUNNER_ENABLED=false` disables **both request expiry and reminders**. Production must run a persistent API process; a sleeping or request-only deployment does not satisfy the runner gate. No public worker trigger, browser scheduler, external notification provider, or device push is used.

The same runner discovers up to 1,000 active, current-manifest gyms per pass using a stable ID cursor. A short final page resets discovery. Each physical database must match its completed registry operation, gym binding, installed migration checksums, schema evidence, and `tenant-2026-11-06.5` manifest. Unknown/unverified tenants fail closed. Per-gym Master advisory locking serializes passes across API instances. Tenant client admission remains bounded by the existing pool manager. Per tenant, expiry processes batches of 50, up to 500 requests, and reminders process up to 100 jobs. The normal target is delivery within 60 seconds; backlog/capacity monitoring must establish that at deployment scale. The outer pass lock has a 120-second transaction budget; individual notification/access transactions retain their existing limits.

Confirmation creates tenant-local reminder jobs transactionally through `PTSession_reminder_sync`. The unique schedule identity is session ID + booked start/end + kind + recipient, independent of notes/version. Jobs exist only when their threshold is at/after original confirmation. Exactly due is eligible. The additive migration backfills future confirmed bookings with that rule and preserves historical terms and overdue requests.

Each reminder obtains a current Master participant access fence and then locks the session before the work row. Busy sessions retry on the next pass. Current identity, active participant status, session state, schedule and time are checked again inside the transaction. Notification insertion and SENT status commit together. Stable notification source keys prevent duplicates after retry/restart. A failed transaction rolls both back; durable retry uses 30/60/120/240/480/900-second capped backoff. An inaccessible database cannot record its own error; process logs and stale last-success time are the evidence in that case. Work resumes when the database and registry verification recover.

After an outage, 24H work is skipped once one hour remains, and 1H work is skipped at/after start. Late 24H messages say the confirmed appointment is coming up and include its absolute gym-local time. Cancellation, starting, terminal outcomes, participant changes and rescheduling invalidate pending work and suppress previously emitted reminders from the bell in the same tenant transaction. Suppressed notifications remain in tenant history with `supersededAt` and read state. Replacement sessions get their own jobs. The bell keeps its 20-second poll, focus/visibility refresh and context response guard. Users see reminders when opening/using the app; no external delivery is promised.

## Health and recovery

Owner Sessions shows the selected gym's health through authorized `GET /gyms/:slug/sessions/scheduled-work-health` (shared Zod contract and API client). It reports enabled configuration, durable last attempt/success, recorded job failures, overdue reminders, retrying jobs, oldest reminder delay, and overdue request count/delay. A missing or >120-second-old success, disabled runner or last error shows an attention message. Zero due jobs is not evidence that the process is healthy: check the timestamp. Process logs/status include registry/verification/expiry batch failures that cannot be persisted safely into an unverified tenant. Never bypass the tenant gate to update health.

1. Check process startup logs for enabled scheduled work, then completed sweeps and per-gym reminder counts. Verify process uptime and the selected tenant's recent success timestamp. Investigate any growing lag, failure count or backlog.
2. For stopped workers, restart the compatible API process with the runner enabled. For tenant verification/pool failures, restore availability or use the existing reviewed schema-operation recovery procedure; never edit registry bindings or checksums by hand.
3. For retrying jobs, fix the underlying availability/constraint failure and let durable backoff retry. Do not create new notification keys, reset jobs to SENT, or delete failed work. Cancelled/skipped work is retained for diagnosis. Stale reminders are never replayed as current instructions.
4. If the app is unavailable, staff keep an external operational record of appointments actually delivered/cancelled. They do not promise a credit outcome from an unavailable system. After recovery an authorized owner reviews each booking through existing correction/reschedule/remedy quote/commit commands, using the real initiator, reason and delivery evidence. Preserve old facts and reconcile net credits/earnings. This is a recovery procedure, not an external messaging integration.

## Verification commands (owned synthetic resources only)

```sh
pnpm prepare:checks
pnpm check:workspace
pnpm typecheck:workspace
pnpm lint:workspace
pnpm test:unit
pnpm build:workspace
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:pt:owned
GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test tests/pt-workspaces.e2e.spec.ts tests/notifications-bell.e2e.spec.ts
```

Read `docs/manual-testing.md` before using its separate manual harness. These PT commands create their own containers/databases and synthetic accounts, verify ownership, and clean up; they do not use `.env` credentials. `vitest.config.pt.ts` includes availability/booking/exceptions/restore, requests, lifecycle, reads, notifications/reminders/upgrade and finance. CI now explicitly runs this command and the targeted browser specs. CI execution is not claimed by a local pass.

## Release sequence and remaining gates

No deployment, shared database change, merge, real participant pilot or launch approval was performed. Before any authorized release:

1. Close the deferred detailed verification matrix in `EVIDENCE.md`, including earlier PT-01–PT-05 gaps, keyboard/error/unknown-response cases, comprehensive contrast/zoom and concurrent availability/booking/edit permutations. Local screenshots and tests are evidence for their recorded cases only.
2. Inventory the intended existing tenant's future/pending/unsupported legacy bookings without mutation. Back up through the existing encrypted backup procedure, verify ownership and retention, then apply additive schema through the existing operation/registry rollout. Do not downgrade or rewrite old bookings. Rehearsal here covers reviewed PT05→PT06 plus fresh schemas; it is not a rehearsal of every older tenant version.
3. Ship compatible API/worker capability and verify health before enabling new member request entry points, then ship UI. Disable new PT entry points during an outage/rollout if expiry cannot run. Setting the runner's disable flag alone does not disable request creation.
4. Recovery is a compatible forward fix or restoration into a verified isolated target with explicit registry activation under the established recovery procedure. An old binary/down-migration may not understand EXPIRED, compensating credit movements, adjustment records or reminders. Do not delete them to make an old version boot.
5. Monitor actual deployed expiry/reminder latency, retries, shutdown/restart, tenant discovery and capacity. The local manual tick and API/browser fixtures prove execution without a browser; they do not establish production uptime or scale.
6. With separate authorization, run the guide's several-operating-day owner/trainer/member pilot and capture friction, incorrect outcomes, overdue requests, stale reminders and support interventions. Obtain explicit owner review and wider-launch sign-off. These cannot be replaced by synthetic automated tests.

First unfinished action: execute the remaining local matrix items recorded in `EVIDENCE.md`; deployment and the real pilot remain separately authorized gates. No PT milestone is promoted to fully Verified by this run alone.
