# Testing report

Latest regression for Audit / communication / nav bug-fix pass (10 November 2026).

## Focused suites

```bash
cd backend
python -m pytest tests/test_ops_and_audit_collections.py -q
```

**Result:** 10 passed, 1 warning (~17s).

## Notes

- Frontend changes are demo-domain / React module fixes (schedule persistence, campus JSON item save for audit collections, communication routes, export formats). No new backend tests added in this pass.
- Full `tests/` suite was started but not completed in-session (long runtime); focused audit/ops collection suite is green.
