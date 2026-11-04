# GYMOS-MIG-024 — Registry and read-only support checkpoint

> **Integrated completion — 31 October 2026:** task 024 is Completed. Code/CI revision `0b7c909` passed all 11 hosted checks in [run 41172437503](https://github.com/EsanduEpa/gymos-v2/actions/runs/41172437503), after local platform 31/browser 10/operations 10/recovery 1 and build/lint/type/workspace/unit verification. [Segment 03 handoff](../SEGMENT_03_HANDOFF.md) records exact commands, fixtures, review boundaries and pending owner manual checks. Earlier checkpoints below are historical; owner acceptance and merge are not implied.

31 October 2026. Branch `codex/segment-03-platform-lifecycle`, following activation revision `736cfec`. Implemented and locally verified; final hosted verification and owner manual acceptance remain pending.

The registry uses the mapped native tenant table and shared Classic controls, with server pagination, safe provisioning progress/retry, and explicit owner credential handoff. Member counts come from tenant Member records through an explicit bounded worker/read model. Registry HTTP reads never connect to tenants. Unobserved counts are unavailable; a failed observation retains its previous count/time and reports unavailable/repair health. Owner display names are separate from login credentials; absent names stay unavailable. Billing/tier behavior is not introduced. The controlled local CLI also supports `refresh-summary GYM_ID ACTOR_ID`.

Support requires a named gym, exact GYM_SUMMARY_READ scope, reason code and 10–500 character explanation. Only a random context hash is persisted; the web stores the transport context in a host-only HttpOnly Secure-production SameSite=Lax cookie bounded by both JWT and support expiry. Contexts expire after 15 minutes without renewal. Replacement, exit, logout and credential change revoke contexts; every tenant support read is audited with original actor/gym/scope/route/outcome/reason reference. The immutable support event model stores no arbitrary payload or private values.

A global allowlist rejects support requests outside the summary/exit routes, including all operational/auth commands. Approved summaries run in actual PostgreSQL READ ONLY transactions through the same bounded tenant pool manager. Suspended summaries are explicitly supported; ordinary admission remains blocked. Partial gyms return only a Master summary without a tenant connection. Binding mismatch invalidates support. A second validation prevents a pending tenant response from surviving context exit/switch. The owner route renders only this approved read projection for an explicit platform context; no owner impersonation or private person/health projections are exposed.

The UI preserves selected-row state, disabled selection, a persistent Viewing banner, explicit exit, full document gym switching, keyboard navigation and a narrow horizontal table. Cross-tab invalidation, expiry checks and BFCache concealment discard prior context data. New-owner credential handoff uses task 017's issue/reissue/acknowledge API; reused identities never receive a handoff control. Credentials stay out of screenshots/traces and durable safe results.

Local verification, all exit 0:

- Workspace build; API/web lint; workspace type checks; diff checks.
- Support integration 5/5 in owned local PostgreSQL: actual counts/pagination, stale/unavailable counts, wrong role/scope/forged/foreign/wrong gym, real read-only write rejection, global command denial, audit, suspended summaries, partial-gym no connection, marker mismatch invalidation, pending-read exit, expiry/security-version/logout revocation. Six databases/container cleaned.
- Browser platform reservation/handoff and registry/support journeys: two focused tests passed. Real issue, lost-handoff reissue and acknowledgement; A→B switching and cross-tab clearing; cookie flags; exit and denied return; keyboard/Escape and 320px overflow. Handoff run cleaned seven databases/container/manifest; support run six. Traces and automatic screenshots are disabled for these authentication scenarios; explicit screenshots contain no secrets.
- Pool regression 23/23; protected guard regression 1/1; contracts 23/23; API-client 14/14 after rebuilding the changed client.

Visual inspection: [registry desktop](GYMOS-MIG-024/registry-desktop.png), [registry 320px](GYMOS-MIG-024/registry-320.png), [Alpha support](GYMOS-MIG-024/support-alpha-desktop.png), [Beta 320px](GYMOS-MIG-024/support-beta-320.png). An initial Alpha capture showed the loading fallback; visibility assertions were strengthened and the artifact recaptured. Legacy synthetic browser gyms intentionally have no operational currency/timezone and display “Not configured”; task 023's newly provisioned fixtures verify required values before activation. A stale compiled API-client test was rebuilt and rerun; assertions were preserved.

No V1/provider resource was executed or modified. Task 025 lifecycle transitions and task 026 controlled rollout/repair are separate remaining integration gates. Segment 03 is not complete.

## Support-navigation full-suite follow-up — 4 November 2026

- PR #8 run `41780707752` on `d37fbd1` exposed a full-suite browser timing issue after entering Alpha support: the server action updated the URL before the streamed owner shell rendered the selected gym heading. The same flow already used a fresh document for the later Beta switch.
- The browser test now reloads the owner route from a fresh document after asserting the support-entry URL; support context is read from the scoped cookie, and the gym heading/banner are then verified.
- The focused support-registry browser case passed **1/1**, and the complete disposable browser suite passed **23/23**. All runs used synthetic Alpha/Beta actors and ownership-validated cleanup. This is test stabilization; no owner-observed acceptance is claimed.
