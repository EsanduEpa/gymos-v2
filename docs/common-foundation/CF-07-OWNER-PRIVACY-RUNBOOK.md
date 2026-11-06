# CF-07 owner privacy and account lifecycle procedure

## Scope and authority

Gym owners handle gym membership, gym contact/profile corrections, duplicate-account reports, departure requests, and data-access requests. Verify the requester's identity and authority through an already known channel before disclosing or changing information. Use only the gym and account views the owner is authorized to access. Never use another member's records to answer a request.

The platform account and gym membership are separate. A gym can suspend or end its membership/access relationship without deleting the global account. An account or membership suspension does not authorize access to gym features. Restore access only through the established gym lifecycle and enrollment process. Platform support is read-only and must not impersonate an owner or applicant.

## Procedures

### Contact and privacy correction

1. Confirm the requester's identity using the gym's existing contact process.
2. Correct only gym-owned Member/Trainer contact or profile fields through the authorized profile workflow. Record the normal audit trail; do not copy private supporting documents into notes.
3. Login-email changes are global identity changes. Direct applicants to `/account/email-correction`; that request records follow-up only and does not verify mailbox ownership or change the login.
4. If the requested correction cannot be safely verified, leave the value unchanged and explain how the person can return with verification.

### Possible duplicate account

1. Do not merge or expose accounts based only on matching name, phone, or email. A public application response must not confirm whether another identity exists.
2. Verify the person through an established channel and review only accounts within authorized scope.
3. If duplicate identity ownership remains ambiguous, preserve both records and escalate through the approved platform process. Never replace a password or transfer membership, PT, finance, or audit history to resolve ambiguity.

### Gym departure

1. Verify the request and identify the correct gym relationship.
2. Use the supported membership/access lifecycle to revoke or end gym access. Explain that the global account may remain available for account security and other authorized gyms.
3. Do not delete the identity or historical PT, finance, notification, operation, or audit records. Do not tell the person that departure erases their data.

### Data-access request

1. Verify identity and authority before preparing an export or summary.
2. Limit the response to the requester's own information and the gym records the requester may access. Exclude other members, credentials, recovery secrets, private owner notes, and security internals.
3. Use an approved export process if available. If no reviewed process exists, record the request for follow-up and do not improvise a database dump.
4. Retain the request and action evidence under the approved operational process; do not use hard deletion to satisfy a request.

## Minimum data and retention

Collect only fields required for application, membership, account security, and support. Passwords and recovery secrets are never retained in readable form. Rejected application data, durable sessions, recovery attempt evidence, notification history, and audit/financial/PT history have no approved legal retention duration recorded by this milestone. Keep records needed for current access control, support, security, reconciliation, and audit; do not invent a calendar duration or run automated deletion/anonymization. Any retention schedule or deletion/anonymization process requires explicit product, operational, and legal review and must preserve required PT, finance, and audit history.

Current notification inbox writes are transactional with their source records; there is no separate projection backlog. Failed session renewal/revocation and tenant profile command failures are not currently centrally recorded as operational counters. Do not infer zero from absent telemetry. The SuperAdmin operational summary reports only Master counts it can safely derive and marks these unsupported signals explicitly.

## Operational visibility

SuperAdmins can inspect aggregate pending and recovery-required application counts, stuck/retryable enrollment operation counts, and active exhausted recovery credentials at `/admin` (API `GET /admin/operations/visibility`). It exposes no identity, email, application content, credential, or protected profile values. Use the gym's owner application queue to act on individual applications. Aggregate counts are a snapshot, not an authorization decision or a substitute for reviewing the source record.
