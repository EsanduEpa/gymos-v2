# Workspace design

The four workspaces use the same Next.js role shell, existing API contracts, persisted display preference and shared controls. Use semantic appearance tokens from the platform/workspace styles and role-specific layout styles. Apply Atlas Light and Midnight Blue to one component tree. Theme and sidebar state store display preferences locally. Authentication and gym context remain managed by the application session.

| Workspace | Surfaces to preserve |
| --- | --- |
| Super Admin | Overview and registry, async gym creation and credential handoff, read-only time-limited support, lifecycle actions and explicit data availability. Preserve cursor paging and truthful aggregate totals. |
| Gym Owner | Live operations, people and applications, memberships and packs, personal training, configuration, finance, payroll, analytics and audit. Preserve reviewed estimates, confirmation states, queued work, record links and financial semantics. |
| Trainer | Schedule and calendar, requests, session start/completion/notes, availability, relationship-scoped clients and plans, and own earnings. Preserve action eligibility, history, recoverable form input and confirmed command outcomes. |
| Member | Home, directory and request flow, session/calendar history, memberships and packs, coaching plans, training journal and progress. Preserve own-data boundaries and accurate dated/recurring records and empty states. |

Check both appearances at desktop, tablet and 320–390px widths, and at 200% zoom where controls can wrap. Keep focus visible and restored when dialogs or drawers close. Give icon controls accessible names. Maintain loading, empty, denied and error results as separate states, preserve safe form input on retry, and keep page details readable without exposing sensitive data. Follow [browser scenario E26](END-TO-END-MANUAL-SCENARIOS.md#4-money-records-and-personal-account) and the role-specific journeys for verification.

The original shared design plan, four role mappings and dated QA notes are available at Git revision `8b004bb`. [V1 migration context](migration/NOTES.md)
