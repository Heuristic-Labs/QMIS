# Testing report

Latest regression for Audit module P0 draft persistence + workflow (12 November 2026).

## Focused suites

```bash
node backend/scripts/_tmp_test_execute_audit_draft_store.mjs
cd backend
python -m pytest tests/test_audit_execute_draft_persistence.py tests/test_p1_security_isolation.py tests/test_ops_and_audit_collections.py -q
```

**Node draft-store result:** all assertions passed (object wrap, array upsert, legacy object load, double-parse bug documented).

**Pytest result:** **24 passed**, 1 warning (Starlette TestClient deprecation).

Covers process execute-draft persist/reload, non-array body 422, Process≠Quality draft isolation, teacher denied, observations + ATR CAPA + history writes, plus existing P1 security and ops/audit collection gates.

## Frontend

```bash
npm run build
```

**Result:** PASS

## Browser

Not re-run in this session for the full Execute Audit UAT checklist (manual steps listed in implementation report).

Production data / deploy / commit: **not tested** (prohibited this prompt).
