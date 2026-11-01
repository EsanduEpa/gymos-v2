# DEC-11 — Limited web session policy

Status: **Web-session portion approved by project owner on 30 October 2026 in the Segment 02 conversation. Provider/release portion unresolved.**

Owner response: “Approve this limited policy (recommended)”. The owner retains decision-review responsibility; no independent specialist review is claimed.

## Approved for GYMOS-MIG-020

- Preserve DEC-02: signed 15-minute access JWTs, current Master security/access checks, no refresh tokens or automatic renewal. Expiry requires sign-in. Concurrent expired reads fail closed; commands are never replayed automatically.
- Browser transport: host-only HttpOnly, SameSite=Lax, path `/`; Secure under production HTTPS. Cookie expiry must not outlive the signed token. Bearer material stays within the cookie/server adapter and never appears in HTML, JavaScript, URLs or browser persistent storage.
- Mutations accept only the exact configured web origin (`GYMOS_WEB_ORIGIN`), including scheme and port. Reject absent, malformed, null or foreign Origin and cross-site Fetch Metadata. Do not derive trust from forwarded Host. Local HTTP is limited to loopback development/disposable tests; production public origin requires HTTPS. No wildcard origin exceptions.
- Explicit logout rotates the identity security version atomically, revoking all sessions for that identity. Clear the browser cookie even if the API is unavailable, with a plain uncertainty message. Clear private browser state; prevent private caching and prior identity/gym state reuse.
- Backend bearer clients remain independent of browser cookies. No mobile authentication or refresh policy is added by this decision.

## Still unresolved — GYMOS-MIG-087

Provider selection, capacity, domains/proxy topology, deployment secrets, environment policy and release approval remain unresolved. This limited approval satisfies only task 020's relevant DEC-11 prerequisite; it does not complete task 087 or authorize deployment. Configure the actual public web origin and verify HTTPS/cookie behavior in the selected hosting environment before release.

See [DEC-02](DEC-02.md), [task 020](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-020), and [task 087](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-087).
