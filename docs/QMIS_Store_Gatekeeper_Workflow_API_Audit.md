# QMIS Store Management & Gatekeeper — End-to-End Workflow and API Audit

**Date:** 2026-11-04 (implementation update)  
**Requirements source:** Non-Academics Department PDF extract (`local/non_academics_pdf_extract.txt`, Version 0.1 draft) + current code  
**Environment checked:** Local pytest + API (in-memory / seed logins). No production writes.  
**Scope discipline:** Did not modify Admission Enquiry or Parent Management WIP. No commit/push/deploy.

---

## 1. Requirements summary (approved / draft doc)

### Store (Store Officer / Stationery Store Manager)
| Doc § | Expected behavior |
|---|---|
| 4.1 | Dashboard: stock levels, low-stock alerts, pending requests |
| 4.2 | Product master; stock in/out; balance; availability; reports (stock/issue/low/consumption) |
| 4.3 | Purchase: requirement → vendor compare → JD approve → Finance budget → PO → GRN → stock → Finance payment |
| 4.4 | Issue request: pick products → approver → store issues → stock reduces; unavailable → purchase |
| Clarifications 11–13 | Returnable tracking; product-out confirmation; new product in confirmation |

### Security / Gatekeeper
| Doc § | Expected behavior |
|---|---|
| 9.1 | Security Supervisor vs Officer; visitor entry (name, purpose, host, in/out, ID/photo [Proposed]); gate logs; pass verification; incidents [Proposed] |
| Linked | PRM appointments notify host [stated]; material/product passes verification |

**Clarification questions (doc unclear / Proposed) — still open product decisions:**
1. Is Stationery Store Manager the sole “Store Officer”, or must Canteen/HK/IT stores share one Store Officer role?
2. Visitor photo/ID: still [Proposed] — **deferred** (not implemented).
3. PRM appointment ↔ visitor host notification: **deferred** (no confirmed notification hook for this release).
4. Finance “mark paid”: must use Finance payment reference APIs — store UI must not simulate payment (**enforced**).

---

## 2. Requirement → code / API mapping

### 2.1 Store Management

| Requirement | Frontend | API | Backend | Persist? | Status |
|---|---|---|---|---|---|
| Dashboard counts | `StationeryStoreManager/Dashboard` | ops hydrate | `ops_collections` | Yes | **PASS** |
| Inventory CRUD | `Inventory/*` | `GET/PUT /ops/stationery-inventory` | OpsRecord | Yes | **PASS** |
| Issue / return + stock qty | `IssueReturns/AddIssueReturn.jsx` | **`POST /ops/stationery/issue-return`** | `stationery_workflow.record_issue_return` | Yes (atomic) | **PASS** |
| Stock issue screen | `StockIssue/*` | Same issue-return API (mirrors `stationery-stock-issues`) | same | Yes | **PASS** (unified) |
| Requests / approvals | `RequestsApprovals/ViewRequest.jsx` | **`POST /ops/stationery/requests/{id}/decide`** | `decide_request` | Yes + history | **PASS** (store/principal; not full multi-dept DA chain) |
| Purchase §4.3 | `PurchaseWorkflow/*` | **`POST /ops/stationery/procurement/{id}/decide`** + **`…/receive-goods`** | JD / Finance / Store gates | Yes + history | **PASS** (narrow workflow; payment not simulated) |
| Critical alerts | `CriticalAlerts/*` | Derived from inventory; optional persist | inventory thresholds | Yes when synced | **PASS** |
| Material gate pass | FO material passes + store ACL | `front-office/material-gate-passes` | `front_office` + store writer ACL | Yes | **PASS** (create/verify); auto-link from issue is optional field `materialGatePassId` |
| Reports | `Reports/*` | local aggregates of hydrated ops | — | — | **PARTIAL** |
| Campus isolation | — | campus_id on OpsRecord | enforced | — | **PASS** |
| Role permissions | `stationerystoremanager` | ops + FO material only | matrix + service ACL | — | **PASS** |

### 2.2 Gatekeeper / Gate Keeper Manager

| Requirement | Frontend | API | Backend | Persist? | Status |
|---|---|---|---|---|---|
| Visitor create / edit / exit | `RegisterPage.jsx` | **`PUT /ops/gate-visitors/items/{id}`** | item upsert + exit stamps | Yes | **PASS** |
| Inward/outward / handover / vendors | SimpleRegister | item upsert collections | ops | Yes | **PASS** |
| Incidents | Incidents helpers | `gate-incidents` item upsert | ops | Yes | **PASS** |
| Duty allotment | GKM AssignDuty (requires assignee email) | `gate-duty-assignments` item upsert | ops | Yes | **PASS** |
| My Duty isolation | Gatekeeper MyDuty | `GET /ops/gate-duty-assignments` filtered for `gatekeeper` | `_filter_gatekeeper_duties` | Yes | **PASS** |
| Pass verification | GatePassList | FO PUT verify-only fields | `front_office` | Yes | **PASS** |
| My Attendance | Common `MyAttendancePage` + `/hr/attendance/mine` | HR mine API | attendance | Yes when HR-linked | **PASS** (empty = unlinked / no punches — not a demo wipe bug) |
| PRM host notify / visitor photo | — | — | — | — | **NOT IMPLEMENTED** (Proposed / deferred) |

---

## 3. Workflow / status transitions

### 3.1 Store request (issue approval)
`Draft / Submitted / Pending / Pending Approval` → **Approve** → `Approved` + stage `Ready to Issue` → issue via issue-return → `Partially Issued` / `Issued`  
→ **Reject** → `Rejected`  
Self-approval blocked when `requestedByEmail` matches actor (non-admin).

### 3.2 Procurement (§4.3)
```
DRAFT / QUOTATION_PENDING --(store advance)--> DEPARTMENT_REVIEW
DEPARTMENT_REVIEW --(JD approve)--> MINOR_APPROVED | ESCALATED
                   --(JD reject)--> REJECTED
MINOR_APPROVED / ESCALATED --(Finance approve_budget)--> PO_REQUIRED
PO_REQUIRED --(store advance)--> PO_RAISED --> PO_APPROVED
PO_APPROVED --(store receive-goods / GRN)--> COMPLETED (+ inventory++)
mark_paid --> 400 (Finance payment reference required; not a store button)
```

### 3.3 Issue / return
`Issue` deducts stock (409 if insufficient — message points to purchase).  
`Return` restores stock unless condition Lost/Damaged.  
Idempotent via `clientRequestId`.  
Optional links: `requestId`, `materialGatePassId`, returnable + expectedReturnDate.

### 3.4 Visitor
`Inside` (or other) → **Mark Exited** → `Exited` + `outTime` / `exitedAt` / `exitedBy*`  
Re-saving Exited is idempotent (original exit stamps preserved).

---

## 4. Endpoints, permissions, persistence evidence

| Endpoint | Auth | Who | Effect |
|---|---|---|---|
| `POST /api/v1/ops/stationery/issue-return` | `ops.write` | Store (+admins) | Atomic inventory + movement |
| `POST /api/v1/ops/stationery/requests/{id}/decide` | `ops.write` or `approvals.decide` | Store / principal / director | Approve/reject + history |
| `POST /api/v1/ops/stationery/procurement/{id}/decide` | `ops.write` / `finance.approve` / `approvals.decide` | Store / JD / Finance by action | Stage transition + history |
| `POST /api/v1/ops/stationery/procurement/{id}/receive-goods` | `ops.write` | Store | Idempotent GRN |
| `PUT /api/v1/ops/{gate-*}/items/{id}` | `ops.write` | Gate roles | Record-level upsert |
| `GET /api/v1/ops/gate-duty-assignments` | `ops.read` | Gatekeeper sees **own** only | Filtered list |

Whole-list `PUT` for gate visitor/register/handover/vendors/incidents/duty-assignments returns **400** (`not_supported`) — FE uses `persistCampusJsonItem` / upsert loop.

---

## 5. Implemented fixes (this session)

| ID | Change | Files | Status |
|---|---|---|---|
| SG-01 / race | Visitor edit/exit via **item upsert**; exit stamps | `ops_collections.py`, `RegisterPage.jsx`, `campusJsonStore.js`, `opsApi.js` | **Done** |
| SG-02 / §4.3 | JD/Finance/Store gated procurement + GRN | `stationery_workflow.py`, endpoints, `procurementData.js`, `PurchaseWorkflow.jsx` | **Done** |
| SG-03 | Persist failures toast; no silent success | RegisterPage + purchase/issue paths | **Done** |
| SG-05 / requests | Approve/Reject API + ViewRequest actions | `decide_request`, `requestsData.js`, `ViewRequest.jsx` | **Done** |
| SG-07 / SG-08 | FO verify-only + store material-gate (prior) | `front_office.py` | **Prior** |
| SG-09 / duty | Server filter + assignee email on assign | `ops_collections.py`, `AssignDuty.jsx`, `gateDutyData.js` | **Done** |
| SG-11 | StockIssue → same issue-return ledger | `stockIssuesData.js` | **Done** |
| SG-14 | My Attendance uses HR `/mine` via Common page | Common Attendance (already wired) | **PASS** |
| Stock guards | Insufficient stock 409; idempotent issue/GRN | `stationery_workflow.py` | **Done** |

---

## 6. Tests / UAT

| Check | Command / method | Result |
|---|---|---|
| New workflow suite | `pytest tests/test_stationery_gate_workflows.py -q` | **7 passed** |
| Related regression | `pytest tests/test_stationery_gate_workflows.py tests/test_front_office_api.py tests/test_ops_and_audit_collections.py -q` | **26 passed** |
| `npm run build` | vite production build | See latest run below |
| Browser UAT | Visitor exit / GRN / duty after refresh | **NOT VERIFIED** |

### Test coverage in `test_stationery_gate_workflows.py`
- Issue deduct + idempotent retry  
- Insufficient stock 409  
- Request decide permissions  
- Procurement JD/Finance gates + mark_paid blocked  
- GRN idempotency  
- Visitor item upsert + exit stamp  
- Gatekeeper duty list isolation  

### Unrelated failures
- Earlier `test_remaining_workflows` processauditor hire failure remains **pre-existing** / out of scope (not re-run as blocker for this slice).

---

## 7. Remaining blockers / product decisions

| Item | Status |
|---|---|
| Visitor photo/ID collection | **BLOCKED** — Proposed only |
| PRM appointment → host notification | **BLOCKED** — needs confirmed notification product decision |
| Full multi-approver store chain (every dept head) | **PARTIAL** — store/principal decide API in place; expandable |
| Finance payment settlement UI | **BLOCKED** — use Finance APIs; store cannot mark paid |
| Browser UAT | **NOT VERIFIED** |
| Cross-dept shared inventory E2E | **NOT VERIFIED** this pass |

---

## 8. Classification rollup

| Module | Overall |
|---|---|
| Store inventory + issue/return | **PASS** (server ledger) |
| Store request approve/reject | **PASS** (v1 roles) |
| Store purchase / JD / Finance / GRN | **PASS** (narrow; payment external) |
| Gate visitor create/edit/exit | **PASS** (code + pytest; browser UAT pending) |
| Gate duty isolation | **PASS** |
| Gate pass verification | **PASS** |
| Host notify / photo | **NOT IMPLEMENTED** |

**Implementation status:** Confirmed Store + Gatekeeper defects from the audit are implemented with backend validation and focused tests. Browser UAT and Proposed features remain open. No commit/push performed.
