# Account operations

## Account and gym ownership

Master owns login identity, gym-account credentials, access links, sessions and security events. A gym owns its operational contact and profile records. A name, phone number or matching email in a gym record is insufficient to link or merge identities. Platform support uses an audited, time-limited, read-only session for the selected gym.

An application goes through the gym's Owner queue. Existing-identity enrollment requires the account holder's own confirmation and consent. New credentials are handed off once, require a first-login password change and may be reissued only through the scoped workflow. A repeat command reconciles the existing operation before publishing another enrollment. Owners act on individual applications. The platform operations summary exposes only aggregate counts for eligible application, enrollment and recovery states.

Access tokens have a 15-minute lifetime. Device sessions use rotating renewal and durable server-side revocation. Personal devices have a seven-day idle and 30-day absolute limit. Shared devices have a 30-minute idle and eight-hour absolute limit. Use the correct scoped or global credential surface for recovery and revocation.

## Recovery and login-email correction

Use the authorized staff-assisted or platform recovery workflow with fresh operator verification. Deliver the one-time credential privately to the verified subject. A request recorded at `/account/email-correction` requires the current password and supports withdrawal. The platform queue records `FOLLOW_UP_RECORDED` or `CLOSED_NO_CHANGE`; these are follow-up outcomes.

1. Contact the requester through a previously established channel. Verify identity through the approved in-person or known-contact process. Staff should never collect passwords, session cookies or one-time codes.
2. Use staff-assisted recovery if the subject lacks access. A proposed address provides no mailbox ownership evidence.
3. Record only the disposition and permitted operational evidence. Tell the requester which login remains active.
4. Escalate uncertain ownership, duplicate or privileged identities, and suspected takeover through the platform process. A future login address change requires approved mailbox proof or equivalent authority, Master uniqueness checks, review of existing claims and durable reconciliation of any tenant snapshots.

## Owner privacy procedures

| Request | Owner action |
| --- | --- |
| Contact or profile correction | Verify the requester through an established channel. Edit only authorized gym profile fields and retain the normal audit trail. Route login-email follow-up through the account page. |
| Possible duplicate | Review records within the selected gym. If ownership remains uncertain, preserve both histories and escalate. Membership, payments, PT and credentials require their own authorized operations. |
| Gym departure | End or suspend the verified gym relationship through the membership lifecycle. Explain that global account and audit/financial histories may remain. |
| Data access | Verify the requester and export authority. Disclose only permitted records through an approved process. Refer unresolved requests for follow-up and keep other members, secrets and internal security data out of the response. |

Collect only the data needed for access, service and support. Retention, deletion and anonymization require a reviewed policy covering applications, device sessions, recovery evidence, notifications, coaching, finance and audit. Missing counters should remain explicitly unavailable. See [security and privacy review](SECURITY-REVIEW.md) and [browser acceptance](END-TO-END-MANUAL-SCENARIOS.md).

The Common Foundation guide, progress, evidence, prototype notes, and separate email/privacy runbooks are available at Git revision `8b004bb`.
