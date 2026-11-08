# Hosted demo recovery verification — 8 November 2026

Frontend: https://gymos-v2-ten.vercel.app
Backend: https://gymos-api-dw7n.onrender.com

Render was redeployed at commit `598974b`, containing the PostgreSQL 18 catalog compatibility fix and production build dependency installation correction. `main` remains unchanged pending PR #16.

## Results

- Public API returned HTTP 200 with Hello World in approximately 0.28 seconds after deployment.
- Render logged a successful scheduled-work sweep: two gyms, zero skipped, zero failures. Both tenants processed reminders successfully.
- Browser checks passed for Super Admin, Alpha Owner, Trainer 1 and Member 1 login/workspace access. Test browser sessions were signed out.
- Admin registry refresh reported two verified gyms, six members and six trainers, with zero unavailable summaries.
- Owner scheduled-work health showed a recent successful pass and zero recorded failures.
- Member home retained the confirmed 9 November 10:00 booking with two available and one held credit.
- All 15 accounts passed live API login, role-specific reads and logout revocation. All 14 gym accounts were denied access to the other gym.
- Three initial API login checks returned transient HTTP 502 responses during recovery; all three passed the focused retry after service stabilization. One later login hit the expected throttle and passed after the required wait.

## Account checks

| Account | Role | Live API result |
| --- | --- | --- |
| admin@gymos-demo.test | SUPER_ADMIN | PASS |
| owner.demo-alpha@gymos-demo.test | OWNER | PASS |
| trainer1.demo-alpha@gymos-demo.test | TRAINER | PASS |
| trainer2.demo-alpha@gymos-demo.test | TRAINER | PASS |
| trainer3.demo-alpha@gymos-demo.test | TRAINER | PASS |
| member1.demo-alpha@gymos-demo.test | MEMBER | PASS |
| member2.demo-alpha@gymos-demo.test | MEMBER | PASS |
| member3.demo-alpha@gymos-demo.test | MEMBER | PASS |
| owner.demo-beta@gymos-demo.test | OWNER | PASS |
| trainer1.demo-beta@gymos-demo.test | TRAINER | PASS |
| trainer2.demo-beta@gymos-demo.test | TRAINER | PASS |
| trainer3.demo-beta@gymos-demo.test | TRAINER | PASS |
| member1.demo-beta@gymos-demo.test | MEMBER | PASS |
| member2.demo-beta@gymos-demo.test | MEMBER | PASS |
| member3.demo-beta@gymos-demo.test | MEMBER | PASS |

## Limits

These are hosted smoke checks, not a complete regression or security assessment. All 15 identities were tested through the live API; browser coverage sampled each role. Free Render instances can still sleep after inactivity; this recovery does not provide continuously awake hosting or prove that every future cold start will succeed. The cause of the prolonged predeployment wake-up failure was not conclusively established. No production data was imported, password reset, or paid instance upgrade performed.
