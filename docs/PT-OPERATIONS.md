# Personal training operations

## Booking and settlement rules

| Area | Current behavior |
| --- | --- |
| Booking | One-to-one, 60-minute appointments. Initial release sessions are in person. Introductory workflows remain separate. |
| Availability | Trainers and owners manage availability. Candidate starts use a 15-minute gym-local grid, accept adjacent half-open appointments, and obey an inclusive two-hour to 14-day creation window. Missing availability makes a slot unavailable. Use database time and the gym timezone. |
| Requests | A member may have two live pending requests per gym. Each holds the slot but reserves no credit. Expiry is the earlier of creation plus 12 hours or scheduled start minus one hour. Acceptance must occur strictly before expiry and does not reapply the two-hour creation rule. |
| Confirmation | A Trainer accepts a member request or an Owner confirms directly. Membership and pack eligibility cover the session's gym-local date. Confirmation checks the current balance, holds one credit and saves the agreed pay and configuration. |
| Delivery | Trainers start and complete sessions manually. Start closes 15 minutes after scheduled start for an unstarted session. The worker can then settle an eligible no-show. Completion is explicit and requires the configured minimum elapsed time. |
| Cancellation and correction | Member cancellation is free at or before the 24-hour boundary under the default policy. Late cancellation and no-show consume one credit. Withdrawing an unconfirmed request consumes none. Trainer/gym cancellation protects member value. Follow the stored policy quote. Owner corrections require a reason and preserve original facts and accounting history. |
| Earnings | Eligible completion consumes the held credit and records earned value and snapshotted fixed trainer pay once. Approval of payroll records the obligation. Use the finance workflow for corrections. |

## Scheduled work and recovery

The persistent API runner sweeps request expiry, automatic no-shows, 24-hour/one-hour reminders and 24-hour missing-notes reminders. It starts immediately and runs every 30 seconds by default. `NODE_ENV=test` or `PT_EXPIRY_RUNNER_ENABLED=false` disables it. Cross-instance locking, tenant verification and bounded batches protect each run. Appointment reminders are in-app and tied to the booked start/end and recipient. Cancellation and rescheduling invalidate stale reminder work.

1. In Owner Sessions, check the last successful sweep, recent errors, overdue work and retry counts. Compare those fields with the API startup and sweep logs. A dormant service can accumulate work even when few jobs are visible.
2. Restore access to the verified database and run a compatible persistent API. Let durable work retry. Use the controlled schema rollout to resolve compatibility issues and review the resulting tenant evidence.
3. During an outage, record delivery and cancellations separately. After recovery, use authorized owner correction or reschedule commands to reconcile affected bookings and let credits and earnings follow the recorded outcomes.

## Verification and rollout

- Leave `GYMOS_PT_QR_ENABLED` and `GYMOS_PT_VIRTUAL_ENABLED` unset on the web and API for the initial release. A separate review environment can enable the relevant setting with `1` on both services. Virtual bookings also require trainer opt-in.

- Run `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:pt:owned` for isolated PT and finance coverage. Use the [ordered browser scenarios](END-TO-END-MANUAL-SCENARIOS.md) for role, keyboard, mobile and manual-delivery acceptance.
- Review future bookings, approved payroll and pending work before rolling out schema rules. Verify backups, matching API/web releases, current tenant manifests, and scheduled-work recovery. Use a compatible forward fix or the reviewed isolated restore process.
- Phone QR timing and virtual delivery acceptance remain tracked in the [development checklist](AUDIT-REMAINING-CHECKLIST.md). Local test results do not substitute for hosted and owner acceptance.

The original PT implementation specification, progress and detailed evidence are available at Git revision `8b004bb`. [Preserved synthetic screenshots](pt-implementation/evidence/2026-11-06-pt67/README.md)
