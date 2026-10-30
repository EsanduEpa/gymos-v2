# GYMOS-MIG-010 — Exposed credential follow-up and V2 secret hygiene

Current status — 30 October 2026: **GYMOS-MIG-010 is Completed** on the basis of owner-attested provider remediation/follow-up plus independently verified local cleanup and V2 scanning. The older preparation and “not completed” statements below describe historical checkpoints, not current status. [Task specification](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-010), [risk R18](../MIGRATION_RISK_REGISTER.md), and [finalization](../SEGMENT_01_FINALIZATION.md) record the closure basis and evidence limits.

## Evidence boundary

V1 `/Users/esanduepa/Desktop/Projects/gymos` HEAD: `058aa8532741c4cb84289589fd2cf89282882988`. V2 `/Users/esanduepa/Desktop/Projects/gymos-v2` HEAD: `25546dec684382438416ecf22a65c0262bb0f558`. Tooling: Python 3.15.0 and Git 2.46.0. No fixtures or test databases were needed.

Performed read-only source and Git metadata inspection. Did not run V1 `scripts/check-db.js`, connect to any database/provider/account, inspect actual environment-file values, rotate/revoke credentials, change V1, install tools, scan remote systems or invoke application workflows. Credential literals were compared only in process memory; output contains identifiers, paths, line numbers and classifications, never literal values or secret-derived hashes. No browser captures were needed.

## Redacted incident record

The owner/status column below records the initial source-review checkpoint. Later owner-attested containment and current disposition are documented in the final owner-attested section at the end of this file.

| Identifier | Observed source | Evidence and impact | Owner and status |
|---|---|---|---|
| V1-REMOTE-DB-001 | V1 `scripts/check-db.js:6` | PostgreSQL URL literal includes a password and a non-loopback host. Credential validity, database contents, privilege scope, exposure duration, reuse and provider are unverified. The script must not be executed to test validity. | Accountable role: Security/credential owner. Named credential owner: Esandu, supplied by the project owner in this chat23 October2026. Explicit rotation/revocation acknowledgment/evidence not supplied. Revocation/rotation and access investigation unverified; R18 remains Open/Critical. |
| V1-DEMO-SET-001 | V1 `prisma/seed.ts:35`, `:36`, `:44`, `:45`, `:466` | Current seed generates a password or accepts `SEED_PASSWORD`, hashes it, sets forced change, and prints the generated/selected secret at the end. No fixed literal password was extracted from current direct hashing arguments. Prior demo credentials or seed-run logs are outside this scan. One shared seed-run secret is assigned to multiple synthetic accounts. | Security/credential owner and demo operator must inventory prior exposures/reuse privately. No current literal comparison can prove generated or historical values were never reused. |
| V2-LOCAL-EXAMPLES-001 | V2 `.env.example:3–5` | Three credential-bearing URL examples point to loopback hosts. These are development examples, not proof of configured account credentials or safe production values. Values omitted. | Platform owner: confirm examples are never used outside disposable local development and no real account shares them. Actual configuration deliberately uninspected. |

No incident is closed by the source scan. Do not include the URL, host/account details, password, temporary credentials, connection strings or authentication tokens in this repository, PR, chat, screenshots or incident evidence. Use an access-controlled incident/secret-management system for sensitive identifiers; this public planning record only links a nonsecret incident ID when available.

## Source scan results

The initial redacting Python scan inspected **58 tracked text files** from V2's current checkout. It excluded docs, dependency/build trees, the lockfile, image/binary files and actual `.env` files; `.env.example` was included as a template. Tracked source was scanned for credential-bearing PostgreSQL URL literals, private-key headers, common token shapes and credential-named string assignments. An in-memory exact comparison covered the V1 remote URL/password; attempted direct seed hashing-literal extraction found zero fixed literals, as explained above.

| Check | Result | Limit |
|---|---|---|
| V1 exposure location | One password-bearing remote URL literal at `scripts/check-db.js:6` | No validity or access test |
| V2 remote URL/key/token matches | None under the tested rules | Heuristic source-only result; not a clean security certification |
| V2 URL matches | `.env.example:3–5`, loopback examples | Must not be reused for real environments |
| Credential-named string assignment | `README.md:23`, manually classified as a shell password-prompt string, not an assigned credential | Values omitted; no broad suppression added |
| Exact V1 URL/password reuse in scanned V2 files | No matches | Does not cover configured secrets, generated/historical demo values, build output or remote stores |
| Tracked actual environment files | None | Existing ignored local environment values were not read |
| Ignore behavior | `.env`, `.env.local`, `apps/api/.env`, `apps/web/.env.local` are ignored | Git ignore does not remove previously committed secrets or prevent explicit force-add |
| CI secret scanning | No `.github/workflows` files existed at this scan | GYMOS-MIG-008 may introduce CI concurrently; recheck its final diff and rescan before closing the task |
| Git source preservation | V1 and V2 tracked `git diff --name-only` were empty at inspection | Other authorized agents may subsequently change V2; this task writes this evidence file only |

Source secret handling inspected: V2 `apps/api/src/app.module.ts` registers the current services/guards without literal credentials; `apps/web/src/lib/gymos.ts` uses a server API-base environment variable with a loopback default and a cookie-name constant; `apps/api/src/auth-token.ts` reads a minimum-length JWT secret from environment. Super-admin/owner scripts obtain passwords through environment variables and hash with Argon2id; milestone verification generates random fixture passwords. None of these facts proves deployed secret settings or log redaction. No script was executed.

## Reproducible redacting scan procedure

Run only in the V2 workspace against local source. First inspect Git status and preserve other work. The following command prints only metadata, never matching source lines or credential values. It also scans present CI YAML and known build directories are excluded. It is a heuristic baseline, not a substitute for an organization-approved scanner or review. Do not replace it with a command that prints matching lines.

```sh
python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlsplit
import json, re, subprocess
root = Path.cwd()
v1_script = root.parent / 'gymos/scripts/check-db.js'
needles = []
for value in re.findall(r'''postgres(?:ql)?://[^\s"'`]+''', v1_script.read_text()):
    parsed = urlsplit(value)
    needles.extend([value, parsed.password or ''])
paths = set(filter(None, subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')))
paths.update(str(p.relative_to(root)) for p in (root / '.github/workflows').glob('*') if p.is_file())
report = {'scanned': 0, 'findings': [], 'excluded': 0}
for rel in sorted(paths):
    p = root / rel
    if (rel.startswith(('docs/', 'node_modules/', '.next/', 'dist/')) or
        ('node_modules' in p.parts) or p.name == 'pnpm-lock.yaml' or
        (p.name.startswith('.env') and p.name != '.env.example')):
        report['excluded'] += 1
        continue
    try:
        content = p.read_text()
    except (UnicodeError, OSError):
        report['excluded'] += 1
        continue
    report['scanned'] += 1
    for line_no, line in enumerate(content.splitlines(), 1):
        rules = []
        if any(value and len(value) >= 6 and value in line for value in needles):
            rules.append('V1_EXACT_LITERAL_REUSE')
        for value in re.findall(r'''postgres(?:ql)?://[^\s"'`]+''', line):
            try:
                parsed = urlsplit(value)
                local = parsed.hostname in ('localhost', '127.0.0.1', '::1', 'postgres')
            except ValueError:
                local = False
            rules.append('DATABASE_URL_LOCAL_EXAMPLE' if local else 'DATABASE_URL_REMOTE_OR_UNKNOWN')
        if re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', line):
            rules.append('PRIVATE_KEY_HEADER')
        if re.search(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b', line):
            rules.append('TOKEN_SHAPE')
        if re.search(r'''(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"']{4,}["']''', line, re.I):
            rules.append('CREDENTIAL_NAMED_STRING_LITERAL')
        if rules:
            report['findings'].append({'path': rel, 'line': line_no, 'rules': rules})
print(json.dumps(report, indent=2))
PY
```

Executed initial redacting scan and this documented reproduction: exit **0**. The reproduction also attempts tracked image files as text, so decoded SVG examples may increase the scanned-file count; only source/CI findings should determine review scope. Its observed final count and metadata are recorded below. Commands `git rev-parse HEAD` in each repository, `git status --short`, `git diff --name-only`, `python3 --version`, `git --version` and `git check-ignore` for the four paths above all exited **0**. Empty tracked diff output is preservation evidence, not remediation evidence.

Re-run after GYMOS-MIG-008 and any source changes, and privately review each finding without copying source literals into review output. A future approved CI scanner must redact output by default, fail on high-confidence secrets, review template/fixture exceptions narrowly, scan PR diffs and history where authorized, and keep uploaded scan artifacts free of secret values. Record scanner version, ruleset, revision and sanitized result. Task010 does not implement CI or modify dependencies.

## Owner action and evidence checklist

The following work is **proposed and unexecuted**. It needs a named credential/account owner and authorization for the relevant external operation. Assignment alone does not count as acknowledgment or remediation.

1. **Acknowledge and assign.** Name the Security incident owner and provider/account administrator, create a private incident ID, record acknowledgment time, affected nonsecret credential identifier `V1-REMOTE-DB-001`, environment and allowed scope. Confirm whether any active V2/staging/production resource could be affected. Do not paste the credential into the incident title or this record.
2. **Contain through the provider's approved mechanism.** After authorization, revoke the exposed credential or disable the affected login; create a replacement only if the account is still required. Choose the narrowest privileges, store the replacement in an approved secret manager, update authorized consumers and terminate/revalidate existing sessions where the provider requires it. Evidence: provider change/audit ID, UTC timestamp, responsible owner, affected credential identifier and success status. Do not test by running the V1 script.
3. **Verify revocation without publishing credentials.** Authorized administrator checks provider status/audit and, if necessary, a controlled approved client test. Record old credential unusable, new credential healthy for required consumers, existing-session handling and rollback/recovery outcome. Never restore the exposed value as rollback. This task has performed none of these tests.
4. **Investigate reuse.** Privately inventory actual environment stores, hosted CI secrets, deployment variables, development machines, prior seed runs/logs, backups and other accounts. Compare values in a protected process with redacted output. Include `V1-DEMO-SET-001` and local template examples; current literal scan is insufficient for generated demo secrets. Rotate every confirmed reuse under its owner's authorization. Record systems reviewed, outcome, owners and evidence IDs, not values.
5. **Review access and exposure.** Establish first/last possible exposure using authorized history review, account audit logs and deployment history. Review unexpected logins, privileged actions, schema/data changes and privilege escalation. If logs are unavailable, record missing retention and residual uncertainty; do not call “no suspicious access” from absent logs. Follow applicable incident handling based on actual findings.
6. **Decide repository history/artifact treatment.** Owner approves any V1 history or source remediation separately. Inventory branches/tags, cached CI logs, build bundles, deployment artifacts, shared archives and backups containing the literal. Record remediation/retention decisions and verification evidence. Removing a current line cannot revoke a leaked secret; rewriting history cannot erase all copies. This task leaves V1 unchanged.
7. **Approve V2 secret policy and review.** No V1/demo/template credential reuse for V2, staging, production or durable test accounts. Use unique per-environment credentials and synthetic one-run fixture secrets, server-only secret references, least privilege and redacted logs. No actual environment files, secret values, password hashes or credential-bearing URLs in Git/evidence/DTOs. Review GYMOS-MIG-008 secret scanning and repeat the documented scan on the integrated revision.
8. **Close with evidence.** Named owner signs the redacted evidence summary; reviewer checks revoke/reuse/access/history status, residual risk and GYMOS-MIG-001/008 evidence. Update task/tracker/risk together through the coordinating agent. GYMOS-MIG-066 security gate and GYMOS-MIG-071 release approval must see actual remediation status. An unresolved external rotation remains an explicit release blocker.

## Historical preparation checkpoint — 23 October 2026 (superseded)

## Acceptance and unresolved work at that checkpoint

- [x] Source location confirmed without exposing values; V1 script not run and V1 unchanged.
- [x] V2 tracked-source scan, ignore checks and limited CI inventory recorded with redacted findings and limitations.
- [x] Concrete revoke/reuse/access/history/CI verification procedure and demo-reuse prohibition documented.
- [ ] GYMOS-MIG-001 dependency evidence reviewed and integrated.
- [ ] Named credential owner, incident ID and explicit owner acknowledgment recorded.
- [ ] External revoke/rotate and controlled verification evidence supplied.
- [ ] Generated/historical demo and actual environment/store reuse inventory completed privately.
- [ ] Authorized access-log review and history/deployment-artifact decision completed.
- [ ] Integrated GYMOS-MIG-008 CI/source rescan and reviewer sign-off completed.

Required external evidence is unavailable in this session. **No credential is claimed remediated, no owner acknowledgment is invented, and GYMOS-MIG-010/R18 must remain unresolved.** Application build/lint/unit/API/database/browser tests were not run for this documentation-only preparation; they do not establish provider revocation. No endpoints, Prisma changes or application behavior were changed. Recovery is append-only correction of this evidence, preserving prior findings; credential recovery must never reactivate the exposed secret.

## Documented scan reproduction result

Reproduction exited **0**; scanned **63** tracked/present-CI text files; excluded **2** files. It reported **4** metadata-only finding locations:

- `.env.example:3` — DATABASE_URL_LOCAL_EXAMPLE.
- `.env.example:4` — DATABASE_URL_LOCAL_EXAMPLE.
- `.env.example:5` — DATABASE_URL_LOCAL_EXAMPLE.
- `README.md:23` — CREDENTIAL_NAMED_STRING_LITERAL.

These are the three loopback template examples and README prompt false positive reviewed above. No remote URL, private key, common token shape or exact V1 literal reuse was reported by these rules. Generated/historical demo reuse and actual configured secrets remain unverified.

## Historical owner updates — intermediate checkpoints superseded by the final disposition below

The project owner answered “Esandu” to the credential-owner question on23 October2026. No revocation/rotation/access-investigation result was provided. This identifies the responsible person; it does not establish remediation or authorize remote rotation/V1 edits. Task010 remains Blocked for that evidence.

On 24 October 2026, Esandu stated that the V1 database is no longer needed and directed GymOS V2 to use a new database. This confirms the V2 non-reuse decision. It does not confirm that the exposed V1 credential or its account/database access was revoked, so the external containment and investigation checklist remains open. All V2 implementation and verification must continue against newly created isolated databases.

## Continuation update — 25 October 2026

Reviewed the GYMOS-MIG-001 baseline evidence and confirmed the local V1 checkout remains at `058aa8532741c4cb84289589fd2cf89282882988` with no working-tree changes. The V2 checkout was clean at revision `1a39f8ff8b7c6994041666afbcd43b8ca28c2995` before this documentation update. No V1 files, environment values, provider accounts, databases or remote repositories were changed or contacted.

Repeated a redacting source scan against tracked V2 files and the current CI workflow. It inspected 131 text files and excluded 70 files (including documentation, dependency/build trees, lockfiles and actual `.env` files). It reported 16 heuristic locations: five loopback-only URL examples (three in `.env.example` and two in test fixtures), one remote/unknown-shaped URL in a negative guard test, and ten credential-named string matches in the README prompt and synthetic tests. Review classified these as examples/test values, not credentials for a real service. No private-key header, common token shape or exact V1 URL/password reuse was found. The same exact URL/password comparison across all 14 locally reachable V2 commits found no match. This is a targeted local scan, not a hosted secret scanner certification.

The current `.github/workflows/ci.yml` includes Gitleaks with comments, summaries and uploaded scanner artifacts disabled. No Gitleaks binary is installed locally, no V2 Git remote is configured, and the hosted action has not run on a pull request. No secret-bearing output was published. Actual ignored environment values remain unread; generated or historical seed passwords and deployment/CI secret stores remain outside this local comparison.

The V1 file containing the exposed literal remains in the current V1 checkout. Local history is not shallow, and one reachable V1 commit affects `scripts/check-db.js`; no history rewrite or remote-history inspection was performed. The V1 checkout remains unchanged. History copies, hosted CI logs, deployment artifacts, provider audit logs, database access, and prior seed-run logs have not been examined.

When asked on 25 October 2026 whether the exposed V1 database login had been revoked or rotated, Esandu answered **“No.”** Treat the credential and associated access as exposed and not yet contained. No provider change, replacement, access-log review, reuse inventory, or incident ticket reference has been supplied. **GYMOS-MIG-010 and risk R18 remain Blocked/Open and are release blockers.** No credential is claimed remediated.

Asked on 25 October 2026 whether the old login or demo passwords had been checked for reuse in V2 or other accounts, Esandu answered **“No, not checked.”** The private reuse review remains outstanding; the local exact V1 URL/password source-and-history comparison above does not cover generated seed values or other accounts.

## V1 availability clarification — 25 October 2026

Esandu clarified that V1 remains hosted on Vercel for function testing and must continue running alongside V2. This supersedes the 24 October interpretation that the V1 database was no longer needed. Preserve V1 and its current testing setup; do not remove or alter it as part of Task 10. V2 must use a separate new database and new credentials. Actual V2 local/hosted database settings have not been inspected or verified. Keeping V1 available does not resolve the exposed-login rotation or reuse review.

## Owner-reported containment update — 30 October 2026

Esandu identified Neon PostgreSQL as the V1 database provider and reported rotating the password and redeploying V1 through Vercel. The owner reported that Vercel now displays the affected settings as updated, and subsequently confirmed successful V1 login and access to member records.

This is owner-reported password rotation and application smoke verification; no provider dashboard, credential values, fresh old-password rejection test, session invalidation or provider audit evidence was independently inspected. This update supersedes the earlier owner report that rotation had not occurred, without erasing that history.

Remaining: verify the exposed credential is the rotated role/branch and fails on a fresh connection; confirm existing-session handling and affected branches/consumers (including local settings); complete private reuse and available access-log review; record source/history/artifact treatment, integrated scan and reviewer sign-off. Task 010 remains open pending these checks; no secret values are required in evidence.

### Owner-reported password non-reuse — 30 October 2026

When asked whether the exposed database password had been used in V2 or any other project/account, Esandu answered “no i havent used.” Record this as the owner's explicit non-reuse confirmation for that password. It supersedes the earlier absence of an owner answer on reuse; it is not an independently inspected inventory of environment stores, historical/generated demo passwords, logs or backups. No secret values were requested or inspected. Fresh old-credential rejection, existing-session handling, available access-log review, source/history/artifact treatment and integrated scanning/reviewer evidence remain outstanding.

### Owner-reported completion of remaining follow-up — 30 October 2026

After receiving instructions for (1) fresh old-password rejection verification, (2) review of available Neon activity records and role/session follow-up, and (3) removal of the hardcoded V1 credential and review of older copies, Esandu stated “I solved them.” Record this as the owner's report that those follow-up items were addressed, alongside the prior rotation, successful V1 smoke check and password non-reuse confirmations.

No detailed outcomes, log coverage/retention, session-handling result, provider evidence reference, cleanup revision or history-treatment result were supplied in that reply. Do not infer a clean access history or independently verified remediation from this statement. The next agent should inspect local cleanup and integrated scanner/CI evidence without printing secrets, then reconcile reviewer sign-off and any missing external evidence. Do not repeat requests for the already supplied owner confirmations. Task 010 remains pending evidence reconciliation rather than being marked Verified/Completed solely from this report.

## Finalization reconciliation — 30 October 2026

Metadata-only local inspection still finds a credential-bearing PostgreSQL URL literal in V1 scripts/check-db.js. No secret was printed, no connection was attempted and V1 was not edited. Owner-reported follow-up completion therefore does not establish local source cleanup. Whether this literal is now revoked was not independently tested. Preserve the rotation/non-reuse/smoke attestations and reconcile this discrepancy before verified closure. See [finalization record](../SEGMENT_01_FINALIZATION.md).

## Local cleanup recheck — 30 October 2026

Owner requested reinspection after cleanup. Local scripts/check-db.js now uses process.env.DATABASE_URL, validates presence and contains no credential-bearing PostgreSQL URL literal. Earlier local source discrepancy is resolved. The script still logs a full owner record and raw errors, so it was not executed; safe-output review is outstanding. No V1 edits or database connections were performed. External rotation, V1 smoke success, non-reuse and follow-up remain owner-attested.

## Final owner-attested containment disposition — 30 October 2026

The closure evidence is Esandu's direct reports in this conversation: Neon password rotation and Vercel redeployment; successful V1 login/member reads; explicit non-reuse of the exposed password; and “I solved them” after the old-password rejection, available activity/role review and source/history-cleanup instructions. The owner requested finalization and explicitly retained review responsibility. These reports are accepted as owner-attested external containment and follow-up, not independent provider inspection or proof that unauthorized access never occurred. No detailed access-log findings/retention or provider audit ID was supplied; that evidentiary limitation remains recorded.

Independent local checks verify removal of the V1 hardcoded connection string, environment-variable use, and a passing redacted V2 history secret scan after exact false-positive review. No provider database was contacted and V1 was neither executed nor modified. Existing raw owner/error logging in the V1 diagnostic script remains a separate legacy safe-output follow-up; do not run it or publish its output. This does not reinstate the old password and is not represented as a verified V2 credential leak.

Task 010 is Completed on the basis of owner-attested external remediation plus independently verified local source cleanup/V2 scanning. This supersedes earlier pending-containment records while preserving their history. R18 is recorded as contained by owner attestation, with historical access uncertainty retained. A later provider finding reopens the incident rather than silently revising this evidence.
