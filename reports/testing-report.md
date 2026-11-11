# Testing report

Latest regression for Maintenance Manager portal + Housekeeping isolation (11 November 2026).

## Focused suites

```bash
cd backend
python -m pytest tests/test_maintenance_housekeeping_isolation.py tests/test_ops_designation_maps.py -q
```

**Pytest result:** 14 passed, 1 warning (~15s).

Also verified ACL map helper: `hk-*` writers include `housekeepingmanager` only; `maint-*` writers include `maintenancemanager` only; tickets shared.

## Frontend

```bash
npm run build
```

**Result:** PASS (MaintenanceManagerLayout chunk included; chunk-size warnings only).

## Notes

- Cross-department PUT isolation covered (Maintenance denied on `hk-*`; Housekeeping/teacher denied on `maint-*`).
- Browser UAT (local): Maintenance duty/schedules/checklists/tickets + Housekeeping duty regression PASS.
- Production account remap / deploy **not** tested.
