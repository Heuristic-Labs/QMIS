# Testing report

Latest regression for Housekeeping + Maintenance full local implementation (11 November 2026).

## Focused suites

```bash
cd backend
python -m pytest tests/test_maintenance_housekeeping_isolation.py tests/test_ops_designation_maps.py -q
```

**Pytest result:** isolation suite **9 passed** (+ designation maps → **15 passed** earlier); after tasks-key fix, isolation re-run **9 passed**.

Covers designation split, ACL writers (`hk-*` vs `maint-*` including checklists/inventory/procurement/tasks), cross-dept 403, registry/route strings, and guard that HK Task Management does **not** reuse the schedules storage key.

## API (running local uvicorn after reload)

| Check | Result |
|---|---|
| Maint PUT `maint-inventory` | 200 |
| HK PUT `maint-inventory` | 403 |
| HK PUT `hk-checklists` | 200 |
| Maint PUT `hk-checklists` | 403 |

## Frontend

```bash
npm run build
```

**Result:** PASS

## Browser

- Maintenance Materials persist after API save (Total Records: 1).
- Maintenance Announcement list loads.
- Housekeeping Checklists loads with persisted row.
- Both dashboards show PDF-aligned KPI cards.

Production remap / deploy / commit: **not tested** (prohibited this prompt).
