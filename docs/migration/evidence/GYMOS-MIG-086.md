# GYMOS-MIG-086 — DEC-10 proposal evidence

Status: **In Progress; waiting for Product and Design/Frontend review.** The proposal is prepared, but none of its defaults is treated as approved. See [DEC-10 proposal](../decisions/DEC-10.md).

- Revision reviewed: `df7dd7acc3040b3f34056840917fa86b70b4a652`.
- Environment: local V2 checkout, read-only inspection plus this documentation proposal.
- Inputs reviewed: Task 086; UI map route, branding, visual and open-question sections; functionality decisions D09/D20; database decision DB13; current Next.js root/login/actions/gym page; current public theme endpoint.
- Source observations: the current V2 root is a marketing scaffold; login sends an ordinary account to its first gym; the current gym page fetches member data without role-specific routing; the public theme response includes only slug/name/primary color/logo; owner theme updates validate six-digit hex and HTTPS logo URLs; the logo has a monogram fallback only when no URL is set, not when the image fails to load.
- Proposed behaviors and acceptance examples: documented in DEC-10. The proposal preserves V1 on Vercel for function testing and requires V2 to use separate new database credentials. Actual ignored local settings and hosted V2 settings were not inspected or verified.
- Validation: `git diff --check` passed; `python3 -m json.tool docs/migration/MIGRATION_PLAN_INDEX.json` passed; decision and task status links reviewed. No application or database tests are appropriate for this decision-only task.
- Not performed: V1 runtime or source changes, V1/V2 database connection, provider access, deployment, browser capture, owner approval, or any application implementation.

Task 011, 015 and 019 must remain dependent on the signed DEC-10 result. Once Product and Design/Frontend record approval or requested changes, synchronize the decision register, task spec, tracker, execution plan and JSON index before implementation begins.
