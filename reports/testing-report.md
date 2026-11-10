# Testing report

Latest regression for central Admin / Super Admin provisioning (10 November 2026).

## Focused suites

```bash
cd backend
python -m pytest tests/test_central_admin_accounts.py -q
```

**Result:** 8 passed, 1 warning (~18s).

```bash
python -m pytest tests/test_central_admin_accounts.py tests/test_admin_users.py -q
```

**Result (after email-domain fix):** central suite green; admin users suite previously co-run with 43 passed overall once central failures fixed (re-confirm central alone: 8 passed).

## Dry-run (isolated)

```bash
python scripts/provision_central_admins.py --dry-run
```

**Result:** would create `adminerp@gmail.com` (`admin`) and `superadminerp@gmail.com` (`superadmin`); no users committed; no passwords issued.

## Frontend

```bash
npm run build
```

**Result:** PASS.

## Coverage notes

- Create-missing-only; idempotent; no plaintext password storage.
- Login returns correct roles + `must_change_password`.
- Admin creatable roles exclude fileroom/cctv/admin/superadmin; Super Admin may create admin/fileroom/cctv but not another superadmin.
- Teacher denied Admin Users API.
- Production DB not used by tests.
