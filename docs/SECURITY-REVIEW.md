# Security and privacy review

This document consolidates the 6–8 November 2026 reviews and follow-up evidence. Gate the initial release using the recorded status and recheck the target revision and host. [Release review](RELEASE-REVIEW.md)

| Finding | Current evidence or follow-up |
| --- | --- |
| S1 · Public application email ownership | A submitted email can start an application without independent mailbox verification. Owner approval gates gym access. Set the verified email or restricted-access policy before broad public signup. |
| S2/S3 · Session binding and token expiry | The November fix requires session-bound access tokens and bounded timing claims. Tests cover revocation, expiry, cookie handling and refresh-only logout. Preserve the distinction between global identity and gym-account versions. |
| S4 · Authentication throttling | Local/process limits exist. Verify attribution and behavior behind the deployed web service, across replicas and during a realistic login burst. Review account/client limits and shared storage if scaling out. |
| S5 · Privileged access | Password-based privileged access was identified in the original review. Confirm the release access restrictions and the requirement for privileged MFA or step-up before broad real-data operation. |
| S6 · Browser response hardening | Local CSP, frame, content type, referrer and permissions headers have regression evidence. Check the actual hosted edge, HTTPS, redirects, errors, origin controls and protected downloads. |
| S7 · Secret and database configuration | Hosted startup validates the target and JWT secret. Verify stable key handling, direct TLS, grants for serving and provisioning, backups and isolated restore on the target. |
| Sensitive records | Verify access, deletion and retention for identity data, recovery evidence, coaching records/photos, audit and payments. Use an approved response process for access requests and keep unauthorized records out of exports. |

The original follow-up also verified restoration of trainer profiles with legacy session states, enabled provisioning and scheduled work for verified tenants, and improved browser recovery after partial enrollment. A local restore rehearsal and two-gym isolation help establish implementation behavior. Hosted performance, backup schedules, production retention, capacity and recovery require separate evidence.

Use the [account procedures](ACCOUNT-OPERATIONS.md) for email correction, recovery, duplicates and privacy requests. The detailed 2026 review and fix evidence files remain available at Git revision `8b004bb`. The [historical characterization probe](security-review/characterization-probe.ts.txt) records the historical test input and is retained as evidence.
