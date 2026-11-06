# CF-05 — Login email correction follow-up

## Scope

The account page records a request for staff follow-up after confirming the applicant's current password. It does not change `User.email`, send email, verify mailbox ownership, merge identities, grant gym access, update tenant contact snapshots, revoke sessions, or modify recovery/enrollment claims. A request may be withdrawn by its subject. The platform review queue records either `FOLLOW_UP_RECORDED` or `CLOSED_NO_CHANGE`; both are workflow outcomes only.

Master `User.email` is the global sign-in identity. Tenant Member and Trainer email fields are gym contact snapshots. Matching contact text is not identity proof and must never be used to attach a different account, merge profiles, add gym access, or replace credentials.

## Staff follow-up

1. Contact the requester using a route the gym or platform already had on file before this request. Do not reply to the newly requested address as though it were verified.
2. Verify the person using an established in-person or known-contact process. Do not ask them to reveal their password, recovery credential, session cookie, or one-time code. The requester's password confirmation only proves current account access; it does not prove ownership of the proposed mailbox.
3. If the requester cannot access the current account, stop this workflow. Direct them to the separate staff-assisted recovery or operator recovery process; never use the new address as an easier recovery route.
4. Record only `FOLLOW_UP_RECORDED` after staff has recorded the follow-up in the existing approved support process. Use `CLOSED_NO_CHANGE` if the request is abandoned, cannot be independently verified, or no authorized correction process is available. Do not place identity documents, passwords, private explanations, or address verification claims in the request or audit log.
5. Tell the requester their current login remains active and unchanged. The platform has not sent a message and has not verified the requested mailbox.

## If a login identity change is later authorized

This release has no mailbox possession provider or approved identity-change authority. Do not edit Master or tenant email columns directly. A future change needs a separately approved process that confirms current identity, proves possession of the new mailbox or documents an equivalent independent authority, checks normalized Master uniqueness under concurrency, records fresh-password authentication and staff verification, revokes old-email-bound recovery/enrollment claims as policy requires, and reconciles tenant contact snapshots with durable operations. It must preserve a chosen password and must not claim distributed atomicity. Notify the subject in-app only after the authorized change commits; do not describe that notice as an independent mailbox alert.

Escalate conflicts, suspected account takeover, shared/privileged identities, or uncertain verification through the existing independent platform security process. Gym ownership alone does not authorize replacement of a global credential.
