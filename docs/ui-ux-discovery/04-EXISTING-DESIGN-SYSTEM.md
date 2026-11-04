# Existing design system

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Foundations and implementation

The system is a custom **Classic light theme**, not a packaged component suite. Web dependencies are Next/React, contracts and theme tokens; global CSS imports Tailwind4, but most product styling uses named global classes and nine CSS modules in coaching/sessions. No installed icon/chart/calendar library appears in `apps/web/package.json`; charts are HTML/CSS, calendars are custom React/HTML. No React ThemeProvider, dark toggle or preference persistence was found. Root explicitly sets `color-scheme: light`. [apps/web/package.json:1](../../apps/web/package.json#L1), [apps/web/src/app/globals.css:4](../../apps/web/src/app/globals.css#L4), [packages/theme-tokens/src/classic.ts:1](../../packages/theme-tokens/src/classic.ts#L1).

`classic.ts` exports the palette and font stack; globals duplicates the same values rather than generating CSS from those tokens. Tenant pages pass `--gym-color` and `--gym-on-color` inline after validated hex and contrast resolution. Many shared and owner/trainer styles still address `--classic-primary` directly. Color customization is therefore selective. Full CSS variable manifest with values is in file11.

## Color tokens

| Semantic group | Variables/exported values |
|---|---|
| Brand | `--classic-primary` #007A35; hover #00622A; on-primary #FFFFFF; focus #45B472; soft #EAF5EE; border #BBEBD0 |
| Surfaces | page #F4F5F7; surface #FFFFFF; muted #F5F4F5; hover #F9FAFB; border #E1E1E4 |
| Text | primary #171B28; secondary #4A4D58; muted #8B8E98 |
| Navigation | background #171B28; exported text #FFFFFF; muted #A4A7B0; hover #202534; border #232736. Shell also hardcodes #B5B8C2 foreground |
| Success | foreground #146142, background #DDF5E7, exported border #BBEBD0 |
| Warning | foreground #8A3F00, background #FFF0E0, border #FFD8B3 |
| Danger | foreground #A31319, background #FDE4E4, border #F8B4B4 |
| Info | foreground #1D4ED8, background #EFF6FF, border #BFDBFE |
| Neutral | foreground #4A4D58, background #F5F4F5, border #E1E1E4 |
| Chart palette export | #007A35, #4C956C, #78AA8C, #A9C6B4, #C8DDD0 |
| Aliases | `--ink`→classic text; `--muted`→muted; `--line`→border; `--paper`→page; `--brand`→primary |
| Tenant | `--gym-color` validated primary; `--gym-on-color` white or dark text selected for higher contrast |

Evidence: [apps/web/src/app/globals.css:3](../../apps/web/src/app/globals.css#L3), [packages/theme-tokens/src/classic.ts:2](../../packages/theme-tokens/src/classic.ts#L2). Semantic/status values are not tenant configurable. Hardcoded extra colors remain in gradients, avatars, notification error/badge, chart and CSS-module rules; this is not a completely tokenized system.

## Typography, dimensions and layout

System font stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`; no custom font loader or local font asset dependency. English document language; currency/timezone are gym data, dates use mixed explicit `en`/`en-GB` and browser-default Intl formatting. No translation system found.

| Element | Observed sizing/style |
|---|---|
| Desktop shell | 224px dark sidebar, static with min-height100vh; 52px white top header; content padding24px, role-specific later overrides |
| Mobile drawer | 256px wide, max viewport−32px,100dvh, backdrop #0008; menu below768px |
| Page headings | Generic clamp34–49px; owner/trainer later25px, member27px; mobile24px. Negative letter spacing varies |
| Body/labels | Common12–14px; secondary metadata10–12px; some chart text8–9px; bold/uppercase labels widespread |
| Shared button | min-height42px, padding10×16px, gap9px, radius9px,13px/750; role overrides often36–40px |
| Shared field | input height47px, horizontal14px, radius9px,14px; owner override height36px/padding7×12px/font12px |
| Card | padding28px, radius17px,1px border, shadow `0 9px 26px #173e3110`; role cards frequently12px radius and lighter shadow |
| Table |12px body,10px uppercase headers, outer radius12px; scroll wrapper; no universal sorting/filter toolbar |
| Badge | radius100px, padding5×9px,10px bold uppercase; generic component shows raw normalized enum |
| Dialog | width min440px,viewport−32px, radius14px; inner24px; backdrop and stronger shadow |
| Spacing | Ad hoc4/6/8/9/10/12/14/16/17/18/20/22/24/28/30px etc.; no exported spacing, type, radius or elevation scale |

Source: [apps/web/src/app/globals.css:46](../../apps/web/src/app/globals.css#L46), [apps/web/src/app/globals.css:76](../../apps/web/src/app/globals.css#L76), [apps/web/src/app/globals.css:313](../../apps/web/src/app/globals.css#L313), [apps/web/src/app/globals.css:503](../../apps/web/src/app/globals.css#L503).

Auth shell has47% illustration column with a green radial gradient; form area max450px. Tenant original banner uses accent gradient and logo slot, but owner/trainer/member later overrides flatten it into a normal page header; saved logo is absent in those current page renderings. Dashboard layouts use CSS grid/flex, with min-width0 and overflow wrappers to constrain data. The root has no public marketing home despite leftover landing CSS.

## Shared component behavior

| Component | Current behavior and design implication |
|---|---|
| Button | primary/secondary/danger; full width; pending spinner, disabled and aria-busy when `pending` prop used. Many forms instead pass disabled plus custom text, bypassing shared pending visuals |
| Field | Input-only primitive; label/ID, optional indicator, hint/error linkage, aria-invalid. Select/textarea/checkbox markup is usually duplicated |
| Card/CardHeader | Semantic section and heading/eyebrow/action; role pages often use custom header markup instead |
| PageHeader/StatCard | Generic heading and metric variants; platform uses them, owner dashboard duplicates metrics |
| Tabs | Selected state/aria-controls, roving focus, Left/Right/Home/End, disabled support; generated IDs not instance-namespaced |
| DataTable | Client-side pagination of supplied rows only, typed columns and empty state. Domain lists largely build own server-paged tables; this primitive must not be assumed to paginate entire backend datasets |
| Feedback | alert for error, status for other tones; inline, not toast queue |
| EmptyState/LoadingState | Neutral empty content with optional hint/icon; status spinner, optional page sizing. Domain screens also use custom equivalents |
| StatusBadge | Case-normalizes raw enum; limited mapping: ACTIVE/COMPLETE/COMPLETED success; PENDING info; INACTIVE/SUSPENDED warning; FAILED/EXPIRED/DECLINED danger; others neutral. “ACTIVE” means account active or session in-progress depending context |
| ConfirmDialog | Native modal, labels/description IDs, focus trap/return, backdrop/Escape dismissal except pending, destructive button variant |
| ChartFrame | Generic titled frame with empty state; current domain charts mostly bypass it |

Evidence: [apps/web/src/components/ui/button.tsx:1](../../apps/web/src/components/ui/button.tsx#L1), [apps/web/src/components/ui/field.tsx:1](../../apps/web/src/components/ui/field.tsx#L1), [apps/web/src/components/ui/tabs.tsx:1](../../apps/web/src/components/ui/tabs.tsx#L1), [apps/web/src/components/ui/data-table.tsx:1](../../apps/web/src/components/ui/data-table.tsx#L1), [apps/web/src/components/ui/confirm-dialog.tsx:1](../../apps/web/src/components/ui/confirm-dialog.tsx#L1), [apps/web/src/components/ui/status-badge.tsx:1](../../apps/web/src/components/ui/status-badge.tsx#L1).

## Icons, charts, calendars and feedback

Navigation mixes inline SVG with Unicode glyphs (members/trainer/settings/audit/finance/etc.). Avatars are initials; no icon dependency. Status views sometimes translate enum labels to Pending/In progress/No show while badges display raw uppercase values. Complete session uses native `window.confirm`; lifecycle and credential controls use ConfirmDialog; policy quote uses separate native dialog implementation. Notifications are a local header popover, not a global toast center. No drag/drop calendar, scheduling grid editor or chart library is present.

Owner/member calendars differ: Sunday-first owner grid becomes stacked days below700px; Monday-first member table retains a compact seven-column grid with selected-day side panel and weekly meal entries. CSS charts use exact text labels and analytics screen-reader summaries; do not remove those alternatives when replacing charts. [apps/web/src/components/sessions/owner-session-calendar.tsx:1](../../apps/web/src/components/sessions/owner-session-calendar.tsx#L1), [apps/web/src/components/sessions/member-session-calendar.tsx:1](../../apps/web/src/components/sessions/member-session-calendar.tsx#L1), [apps/web/src/app/gyms/[slug]/owner/analytics/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/analytics/page.tsx#L1).

## Responsive rules

Shell shows sidebar at≥768px and dialog menu below; header hides profile text at≤560px. Global breakpoints include900,800,767,600 and560px; configuration and role pages have overlapping overrides. Modules add850/520 for clients,680/420 for meals,640 for workouts,900/560 for session read,700 for owner calendar,850/560/360 for member calendar. These are CSS thresholds, not a single documented breakpoint/token system. Existing tests target1440/768/390/320px, but this audit did not rerun them. [apps/web/src/app/globals.css:336](../../apps/web/src/app/globals.css#L336), [apps/web/src/components/sessions/member-session-calendar.module.css:42](../../apps/web/src/components/sessions/member-session-calendar.module.css#L42), [apps/web/src/components/coaching/meal-plan-builder.module.css:20](../../apps/web/src/components/coaching/meal-plan-builder.module.css#L20).

Registry has a special≤900px table-to-card transformation using `data-label`; saved V2 screenshots inspected at1440 and320px show this behavior and a very long stacked mobile page. Other domain tables generally scroll horizontally; trainer client table has760px minimum width. No blanket mobile usability or zero-overflow claim is made for current source.

## Accessibility evidence and limits

Positive source evidence: skip link/main target; headings and table labels; input labels/autocomplete; shared keyboard Tabs; modal focus management; textual statuses; role/status/alert feedback; calendar day accessible labels and pressed state; Intl gym-zone labels; reduced-motion spinner rule. This does not establish end-to-end assistive-technology compliance.

Confirmed implementation concerns: client-profile anchors claim tab semantics without selection/roving focus; notification popover lacks Escape/outside-click/focus-return behavior; fixed small muted text; duplicated ID-prone patterns if multiple shared tab sets mount; automatic full reload during form work. Static computed contrast for #8B8E98 against white/page/muted surface is approximately3.27/3.00/2.98 respectively. This is a token-pair calculation, not a complete rendered contrast survey; redesign target should be at least4.5 for normal text. Role-specific final cascade and semantic focus contrast still require live checks. See file06 for evidence/severity.

## Reuse direction

Retain contracts, semantic feedback, focus-managed modal/drawer patterns, money/timezone and operation-state behavior. Consolidate form controls, server pagination, enum labels, page headers/metrics, token generation and responsive scales. Replace duplicate chart/calendar presentation only after preserving all metadata, scopes, truncation and keyboard alternatives. Unmounted `GymRolePage`, unused landing CSS and test-only DataTable usage are not live product functionality to redesign as additional screens. Detailed component disposition is in file08.
