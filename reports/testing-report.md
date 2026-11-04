# Testing report

**Date:** 4 November 2026  
**Context:** Store Management + Gatekeeper workflow implementation (issue/return, procurement, visitor upsert, duty isolation).

## Latest

| Suite / check | Result |
|---|---|
| `pytest tests/test_stationery_gate_workflows.py -q` | **7 passed** |
| `pytest tests/test_stationery_gate_workflows.py tests/test_front_office_api.py tests/test_ops_and_audit_collections.py -q` | **26 passed** |
| Browser UAT | **NOT VERIFIED** |
| `npm run build` | **PASS** (`vite build` ✓) |

## Coverage notes

- Stationery issue/return: stock deduct, insufficient stock 409, idempotent `clientRequestId`.
- Request decide: store approve; teacher forbidden.
- Procurement: store advance → JD approve → Finance budget; store cannot JD-approve; `mark_paid` rejected.
- GRN: inventory increase once; second receive idempotent.
- Gate visitors: whole-list PUT rejected; item upsert + exit stamps.
- Gatekeeper duty GET returns only assignments matching login email.

## Not run / blockers

- Full `pytest tests/` not re-run this slice.
- Pre-existing `processauditor` hire failure in remaining workflows (unrelated) not treated as a regression from this work.
- Browser UAT still open.
