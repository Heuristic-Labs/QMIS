# QMIS — Maintenance Manager Role Implementation Report

| Field | Value |
|---|---|
| **Date** | 11 November 2026 |
| **Mode** | **LOCAL implementation + testing only** |
| **Approved role** | `maintenancemanager` / Maintenance Manager / prefix `MTM` |
| **Portal** | `/maintenance-manager` |
| **MVP (phase 1)** | Dashboard + Facilities Tickets (heads-only) |
| **Phase 2 (this update)** | Duty Allotment + Schedules + Checklists on `maint-*` |
| **Production** | **DB/creds/deploy not touched** — additive git push of local Maintenance code only (no force, no prod remap) |

### Status legend

| Status | Meaning |
|---|---|
| **PASS** | Verified locally |
| **FAIL** | Failed |
| **BLOCKED** | Could not run |
| **NOT TESTED** | Out of local scope / deferred |

---

## 1. Summary

Separate Maintenance Manager portal is implemented locally and verified. Housekeeping Manager remains unchanged and independent. Production Kausik account was **not** remapped.

Non-Academics PDF (v0.1) alignment: Housekeeping and Maintenance are **separate departments** with separate heads/staff; Maintenance head scope is repairs, preventive maintenance, and **ticket** resolution (the PDF never uses “work order”). Local portal now includes **Dashboard, Facilities Tickets, Duty Allotment, Schedules, and Checklists** on isolated `maint-*` collections.

| Checkpoint | Status |
|---|---|
| Backend role + permissions | **PASS** (implemented + automated) |
| Designation split (Maintenance ≠ Housekeeping) | **PASS** (implemented + automated) |
| `maint-*` vs `hk-*` ACL isolation | **PASS** (implemented + automated + API) |
| Facilities tickets | **PASS** (implemented + browser) |
| Duty Allotment / Schedules / Checklists | **PASS** (implemented + automated + API + browser) |
| Housekeeping workflows unchanged | **PASS** (browser HK duty still works) |
| Local EMP-QMIS-107 seed → `maintenancemanager` | **PASS** |
| Focused pytest (phase 2) | **PASS** — `14 passed` (`test_maintenance_housekeeping_isolation` + designation maps) |
| `npm run build` | **PASS** |
| Additive git push (code only) | **PASS** — requested after local wiring verify |
| Production remap / deploy | **NOT TESTED** (still prohibited) |

---

## 2. Files changed

### Backend
- `backend/app/permissions/matrix.py` — register role; ops + announcement sender groups
- `backend/app/services/admin_users.py` — creatable `maintenancemanager` / `MTM`
- `backend/app/services/staff_designation_map.py` — Maintenance* → `maintenancemanager`; HK stays HK
- `backend/app/services/ops_collections.py` — `_MAINT`, `maint-requests`, ticket dept role
- `backend/app/services/hr.py` — department-head visibility
- `backend/app/services/announcements.py` — audience role list
- `backend/app/services/integrations/events.py` — `maint-requests` notify
- `backend/app/services/seed.py` + `backend/app/core/config.py` — local demo seed
- `backend/scripts/provision_remaining_directory_logins.py` — maintenance → new role
- `backend/scripts/_check_postgres_staff_structure.py` — known role list
- `backend/tests/test_maintenance_housekeeping_isolation.py` — **new**
- `backend/tests/test_ops_designation_maps.py`
- `backend/tests/test_ops_role_login_portals_suite.py`
- `backend/tests/test_staff_login_provision.py`
- `backend/tests/test_admin_users.py`
- `backend/tests/test_central_admin_accounts.py`

### Frontend
- `src/constants/roles.js`
- `src/context/AuthContext.jsx`
- `src/App.jsx`
- `src/Layout/MaintenanceManagerLayout.jsx` — **new**
- `src/Routes/MaintenanceManagerRoutes.jsx` — **new**
- `src/Pages/MaintenanceManager/Dashboard/*` — **new**
- `src/Common/CommonSidebar/Components/sidebarLinks.js`
- `src/Common/CommonSidebar/CommonSidebar.jsx`
- `src/Common/CommonHeader/Components/TitleMappings.jsx`
- `src/Pages/Authentication/profileOptions.js`
- `src/Pages/Authentication/roleModuleConfig.js`
- `src/Common/RBAC/createdUsersData.js`
- `src/Common/RBAC/rolePermissionsData.js`
- `src/Common/RaiseItTicket/RaiseItTicketModal.jsx`
- `src/Pages/ITSupportManager/SupportTickets/SupportTicketsList.jsx` — keep default department in filter options
- `src/Pages/JointDirector/EmployeeManagement/*` + JDA equivalents — Maintenance Manager profile
- `src/Pages/HR/domain/hrSeed.js` — EMP-QMIS-107 local only

### Docs
- `docs/QMIS_MAINTENANCE_ROLE_IMPLEMENTATION_REPORT.md` (this file)
- `.gitignore` allowlist entry for this report

**Intentionally unchanged:** production audit expectation script `_live_eight_account_audit_readonly.py` still expects Kausik → `housekeepingmanager` (current production truth until a separate prod approval).

---

## 3. Backend role and permissions

| Item | Value |
|---|---|
| Role code | `maintenancemanager` |
| Display name | Maintenance Manager |
| Creatable prefix | `MTM` |
| Permissions | `_CORE` + leave/escalations/tasks + `ops.read`/`ops.write` + announcements read/write + communication (via matrix loops) |
| Ops writers | `_MAINT` for `maint-*` only |
| Tickets | Included in `_TICKET_DEPT_ROLES` (shared `it-support-tickets`) |
| HK collections | **No** write/read via `_HK` — Maintenance excluded from `hk-*` |
| HR | In `_DEPARTMENT_HEADS` |
| Local seed | `maintenancemanager@qmis.edu` / `maintenance123` (demo only) |

Designation map:

| Designation | Role |
|---|---|
| Housekeeping*, HK Supervisor | `housekeepingmanager` |
| Maintenance Officer / Manager / maintenance / Facilities Manager | `maintenancemanager` |

---

## 4. Frontend routes and modules

| Path | Module | Collection / key |
|---|---|---|
| `/maintenance-manager/dashboard` | Tickets + duty + schedule + checklist KPIs | — |
| `/maintenance-manager/tickets` | Facilities inbox | `it-support-tickets` (UI filter) |
| `/maintenance-manager/tickets/view-ticket/:id` | Shared ticket view | — |
| `/maintenance-manager/duty-allotment` | Duty create/edit/status | `maint-duty-allotments` / `schoolerp-maintenance-duty-v1` |
| `/maintenance-manager/schedules` | Recurring schedules | `maint-schedules` / `schoolerp-maintenance-schedules-v1` |
| `/maintenance-manager/checklists` | Checklist completion | `maint-checklists` / `schoolerp-maintenance-checklists-v1` |

**Sidebar:** Dashboard, Tickets, Duty Allotment, Schedules, Checklists.

**Ambiguity documented:** PDF §4.7 does not define nested checklist-item schema; items stored as textarea lines with Pending/In Progress/Completed/Verified status (RegisterPage pattern). No extra approval stages invented.

Housekeeping portal (`/housekeeping-manager/*`) unchanged — still uses `hk-*` only.

---

## 5. Facilities ticket integration

- Raise-ticket UI already had category `Facilities / Maintenance` and department `Facilities`.
- Maintenance inbox filters `Facilities`; Housekeeping inbox still filters `Housekeeping`.
- Both roles may GET/PUT the shared ticket collection (same as other dept heads); UI filter enforces department view.
- Empty Facilities queue still keeps `Facilities` in the department dropdown (list filter fix).

---

## 6. Automated tests

### Focused suite — phase 2 (duty / schedules / checklists + designation)

```text
cd backend
python -m pytest tests/test_maintenance_housekeeping_isolation.py tests/test_ops_designation_maps.py -q
# 14 passed
```

Also covered in isolation suite: Maintenance duty/schedule/checklist PUT persist; HK/teacher denied; Maintenance denied on `hk-duty-allotments`; FE registry + route strings.

### Broader related run

| Suite | Result |
|---|---|
| Above + `test_admin_users` + announcements ops + remaining workflows | **73 passed**, **1 failed** |
| Failure | `test_remaining_workflows.py::test_department_roles_persist_their_own_records` — `gatekeeper` PUT `gate-visitors` returns `400 not_supported` (“Save this collection one record at a time.”) |
| Relation to this change | **Unrelated** (gatekeeper API behavior; not Maintenance/HK) |

### Frontend

| Check | Status |
|---|---|
| `npm run build` | **PASS** (includes `MaintenanceManagerLayout-*.js` chunk) |

---

## 7. Local API evidence

Against `http://127.0.0.1:8000` after backend restart:

| Check | Result |
|---|---|
| Login `housekeepingmanager@qmis.edu` | role `housekeepingmanager` **PASS** |
| Login `maintenancemanager@qmis.edu` | role `maintenancemanager` **PASS** |
| Maintenance PUT `hk-schedules` | **403 PASS** |
| Housekeeping PUT `maint-requests` | **403 PASS** |
| Housekeeping PUT `hk-schedules` | **200 PASS** |
| Maintenance PUT `maint-requests` | **200 PASS** |
| Both GET `it-support-tickets` | **200 PASS** |

---

## 8. Browser UAT evidence (local Vite `:5173`)

| Step | Status |
|---|---|
| Maintenance login → dashboard with duty/schedule/checklist KPIs | **PASS** |
| Sidebar: Dashboard, Tickets, Duty Allotment, Schedules, Checklists | **PASS** |
| Duty Allotment list + Add Entry | **PASS** |
| Schedules list + Add Entry | **PASS** |
| Checklists list + Add Entry | **PASS** |
| Facilities Tickets still filters `Facilities` | **PASS** |
| Housekeeping Duty Allotment still works (regression) | **PASS** |

Production account browser login for Kausik: **NOT TESTED** (no prod remap).

---

## 9. Local seed — EMP-QMIS-107

| Field | Local value |
|---|---|
| Code | EMP-QMIS-107 |
| Name | Kausik |
| Designation | Maintenance Officer |
| Department | **Maintenance** |
| Role | **`maintenancemanager`** |
| Pradeep EMP-QMIS-120 | **Unchanged** (directory-only) |
| Production password / DB role | **Unchanged** |

---

## 10. Remaining gaps

1. **Maintenance Announcements** — PDF dept-head capability; not in this phase.
2. **Maintenance store request / inventory / purchase** — not in this phase.
3. **`maint-requests` UI** — collection exists; PDF primary path is Ticketing (optional).
4. **Staff (non-head) portals** — heads-only.
5. **Credential prep / prod Kausik remap** — still production `housekeepingmanager` until separate approval.
6. **Nested checklist item schema** — PDF silent; current textarea-line model may need refinement if client specifies structured items.

---

## 11. Production migration plan (documentation only)

Requires **separate explicit approval**. Do not execute from this report.

1. Deploy frontend + backend with `maintenancemanager` role and portal.
2. Confirm role exists in production RBAC seed / roles table.
3. Read-only audit: users with Maintenance designations still on `housekeepingmanager`.
4. Manual RDS snapshot.
5. Remap **only** approved accounts (start with EMP-QMIS-107 / `kausikg1@gmail.com`) to `maintenancemanager`; set HR department string to `Maintenance` if applicable.
6. **Do not** reset passwords unless client requests.
7. Login + browser UAT on production URL; Facilities inbox; confirm HK portal still works for true Housekeeping heads.
8. Update credential workbooks and live audit expectations.
9. Record results in a production sync report.

---

## 12. Final safety checkpoint

| Action | Status |
|---|---|
| Local implementation | **PASS** |
| Local tests + build + browser UAT | **PASS** |
| Production DB / accounts / credentials / Secrets / ECS | **NOT TESTED** (prohibited) |
| Git commit / push / merge | **NOT DONE** (prohibited) |

**Stop here.** Any production action needs a new written approval.
