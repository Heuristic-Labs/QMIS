# Testing report

Latest regression for client-review push (6 November 2026).

## Full suite

```bash
cd backend
python -m pytest tests/ -q
```

**Result:** 745 passed, 35 skipped, 17 failed, 8 errors (~5m 28s).

Client-review-related checks fixed/verified green: academics collections, attendance mark scope, IT tickets self-service, PRM home-path static (`/front-office/dashboard`).

## Failures not in this change set (pre-existing / unrelated)

Finance gateway keys, SignIn demo chips, class-details static drift, teacher-roster demo static, Super Admin approvals demo seeds, principal portal class-catalog seed, gatekeeper one-at-a-time save, academic_access_phase2 errors, attendance audit exact-field assertion (session/check-in already on main).
