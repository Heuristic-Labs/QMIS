# Testing report

Latest regression for remaining P1 Search/Filters/Export/Store-Gate pass (11 November 2026).

## Focused suites

```bash
cd backend
python -m pytest tests/test_p1_security_isolation.py tests/test_ops_and_audit_collections.py -q
node --test backend/scripts/_test_list_filtering.mjs
```

**Pytest result:** 19 passed, 1 warning (~24s).  
**Node listFiltering result:** 6 passed.

## Frontend

```bash
npm run build
```

**Result:** PASS (~1m 9s; chunk-size warnings only).

## Notes

- Security P1 isolation suite remains green (no regressions to #55/#31/#34/#58a).
- New FE filter helpers covered by Node unit tests (no Vitest harness in repo).
- Full `tests/` suite not re-run end-to-end in this pass.
