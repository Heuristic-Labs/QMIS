# QMIS ERP — Maintenance vs Housekeeping Role Audit

| Field | Value |
|---|---|
| **Date** | 11 November 2026 |
| **Mode** | **AUDIT ONLY** — no code, DB, or production account changes |
| **Client requirement** | Maintenance and Housekeeping must be **two separate departments**, each with its own department head and staff |
| **Status** | Findings reported — **awaiting approval before implementation** |

### Status legend

| Status | Meaning |
|---|---|
| **CONFIRMED** | Verified in code / docs / credential prep |
| **GAP** | Missing vs client requirement |
| **RISK** | Safe today but will break or confuse if split incorrectly |
| **PROPOSED** | Recommendation only — not implemented |

---

## 1. Executive finding

**There is no Maintenance portal role in QMIS today.**

- The only facilities-adjacent department-head portal is **`housekeepingmanager`** (Housekeeping Manager).
- Designation mapping **intentionally** sends **Maintenance Officer / “maintenance”** titles to **`housekeepingmanager`**.
- Production Maintenance head **Kausik** (`kausikg1@gmail.com`, EMP-QMIS-107) currently logs into the **Housekeeping Manager** dashboard.
- Ticket UI already distinguishes **Housekeeping** vs **Facilities / Maintenance**, but only Housekeeping has a department inbox role owner.
- Transport “Vehicle / Building Maintenance” and IT “Maintenance Inventory” are **unrelated modules** (fleet / IT stock), not a campus Maintenance department portal.

**Bottom line:** Maintenance is mapped to Housekeeping by design (historical shortcut), not by accident. Splitting them requires a **new role + portal + ops collections + credential remap**, while leaving `housekeepingmanager` intact.

---

## 2. Backend — role codes, DB records, permissions

### 2.1 Role registry

| Location | Finding | Status |
|---|---|---|
| `backend/app/permissions/matrix.py` → `FRONTEND_ROLES` / `ALL_ROLES` | Includes `("housekeepingmanager", "Housekeeping Manager")`. **No** `maintenancemanager` / `maintenance` / `facilitiesmanager`. | **CONFIRMED** / **GAP** |
| `backend/app/services/admin_users.py` → `STAFF_ROLES` | Creatable: `("housekeepingmanager", "Housekeeping Manager", "HKM")`. No Maintenance creatable role. | **CONFIRMED** / **GAP** |
| Demo seed `backend/app/services/seed.py` | Seeds `housekeepingmanager@qmis.edu` / `housekeeping123` only. | **CONFIRMED** |

### 2.2 Designation → role (root cause of the mapping)

`backend/app/services/staff_designation_map.py` documents and implements:

```text
HK Supervisor / Housekeeping / Maintenance Officer → housekeepingmanager
(no separate Maintenance Manager portal)
```

Matching logic (same function):

- `"hk supervisor"`, `"housekeep"`, **`"maintenance officer"`**, **`"maintenance"`**, compact `maintenanceofficer`
- All return **`housekeepingmanager`**

Related scripts/tests that encode the same rule:

| File | Assertion / rule |
|---|---|
| `backend/tests/test_ops_designation_maps.py` | `Maintenance Officer` / `maintenance` → `housekeepingmanager` |
| `backend/tests/test_ops_role_login_portals_suite.py` | Same mapping + portal home `/housekeeping-manager/dashboard` |
| `backend/tests/test_staff_login_provision.py` | `EMP-QMIS-107` role == `housekeepingmanager` |
| `backend/scripts/provision_remaining_directory_logins.py` | `("maintenance", "housekeepingmanager")` |

**Why Maintenance maps to Housekeeping:** product/ops decision during staff portal provisioning — one shared “campus facilities ops” portal was used for both cleaning (HK) and Maintenance Officer titles so Maintenance staff could log in without a new role. Comments explicitly say there is **no separate Maintenance Manager portal**.

### 2.3 Permissions for `housekeepingmanager`

`housekeepingmanager` starts from `_CORE` and receives (via matrix loops):

| Permission group | Included? | Notes |
|---|---|---|
| `leave.read` / `leave.write` | Yes | Not a leave decider |
| `escalations.*` / `tasks.*` | Yes | Staff defaults |
| `announcements.read` / **`announcements.write`** | Yes | Listed in `_ANNOUNCEMENT_SENDERS` |
| `ops.read` / `ops.write` | Yes | Listed in `_OPS_ROLES` |
| `calendar.read` | Yes | Not a calendar editor |
| `communication.*` | Yes | All signed-in roles |
| HR department-head visibility | Yes | `_DEPARTMENT_HEADS` in `hr.py` includes `housekeepingmanager` |

There is **no** Maintenance-specific permission code.

### 2.4 Ops API isolation (Housekeeping collections)

`backend/app/services/ops_collections.py`:

| Collection prefix / id | Writers | Readers (beyond writers) |
|---|---|---|
| `hk-*` (inventory, requests, duty, schedules, SOM, RO, lost-found, requirements, procurement) | `_HK = {housekeepingmanager} ∪ admins` | Writers (+ any shared reader rules) |
| `it-support-tickets` | IT + multi-dept ticket roles **including `housekeepingmanager`** | Shared ticket store |
| `shared-*` store movements | `_STORES` includes `_HK` | Multi-store |

Ticket departments already include both:

- Categories: `"Housekeeping"`, `"Facilities / Maintenance"`
- Queues: `"Housekeeping"` → Housekeeping Queue, `"Facilities"` → Facilities Queue

**GAP:** Facilities / Maintenance tickets have a queue label, but **no Maintenance role** owns that inbox. Housekeeping portal filters tickets with `defaultDepartment="Housekeeping"` only.

Integration events (`integrations/events.py`) notify only `housekeepingmanager` for `hk-*` collections.

### 2.5 Database / production accounts (read-only evidence)

From `docs/QMIS_PRODUCTION_8_STAFF_ACCOUNT_SYNC_REPORT.md` (10 Nov 2026 execute report):

| Email | Designation (roster) | Production role | Note |
|---|---|---|---|
| `kausikg1@gmail.com` | Maintenance Officer | **`housekeepingmanager`** (kept) | Password reset; login verified as HK portal |

**This audit did not query production DB.** No prod rows were changed.

---

## 3. Frontend — role mappings, dashboards, routes, sidebar

### 3.1 Role constant

`src/constants/roles.js`:

```js
HOUSEKEEPING_MANAGER: 'housekeepingmanager',
```

**No** `MAINTENANCE_MANAGER` (or equivalent).

### 3.2 Auth / home path / layout gate

| File | Behavior |
|---|---|
| `src/context/AuthContext.jsx` | Fake creds `housekeepingmanager@qmis.edu`; home `/housekeeping-manager/dashboard` |
| `src/App.jsx` | Role `HOUSEKEEPING_MANAGER` → `HousekeepingManagerLayout`; non-`/housekeeping-manager` paths redirect home |
| `src/Layout/HousekeepingManagerLayout.jsx` | Wraps `HousekeepingManagerRoutes` |
| `src/Routes/HousekeepingManagerRoutes.jsx` | Full HK module tree (dashboard, tasks, inventory, requests, tickets, reports, broadcast, duty, schedules, SOM, RO, lost-found, requirements, purchase) |
| `src/Pages/Authentication/profileOptions.js` | “Housekeeping Manager” tile only |
| `src/Pages/Authentication/roleModuleConfig.js` | Includes `ROLES.HOUSEKEEPING_MANAGER` in ops group |

### 3.3 Sidebar & titles

`housekeepingManagerSidebarLinks` in `sidebarLinks.js` — all paths under `/housekeeping-manager/...`.

`TitleMappings.jsx` — Housekeeping Manager titles only; JD employee-management link for House Keeping Manager profile.

Joint Director / JDA employee management has a **House Keeping Manager** profile card only — **no Maintenance Manager profile**.

### 3.4 Housekeeping-specific workflows (must stay on HK)

These are cleaning / HK ops, not facilities repair:

| Module | Storage / collection |
|---|---|
| Duty allotment | `schoolerp-housekeeping-duty-v1` → `hk-duty-allotments` |
| Schedules | `schoolerp-housekeeping-schedules-v1` → `hk-schedules` |
| Star of the Month (HK) | `schoolerp-housekeeping-som-v1` → `hk-star-of-month` |
| RO testing | `schoolerp-housekeeping-ro-testing-v1` → `hk-ro-testing` |
| Lost & found | `schoolerp-housekeeping-lost-found-v1` → `hk-lost-found` |
| HK inventory / requests / procurement / requirements | `hk-inventory`, `hk-requests`, `hk-procurement`, `hk-inventory-requirements` |
| Tickets inbox | `defaultDepartment="Housekeeping"` |
| Announcements | `roleKey='housekeepingmanager'` |
| Movements | `department="Housekeeping"` |

### 3.5 “Maintenance” wording elsewhere (not the department portal)

Do **not** confuse with campus Maintenance head:

| Area | Owner today | Meaning |
|---|---|---|
| Transport Vehicle Maintenance | `transportmanager` | Fleet service records |
| Transport Building Maintenance | `transportmanager` | Wire/light register under Transport |
| Driver Maintenance Request | `driver` | Vehicle fault requests |
| IT Maintenance Inventory | `itsupportmanager` | IT spare stock |
| Raise ticket category `Facilities / Maintenance` | Shared tickets | Category only — no dedicated owner role |
| Accounting COA “Maintenance” | Finance | Expense ledger, not RBAC |

---

## 4. Shared role / permission inventory (Maintenance ↔ Housekeeping)

Places where **Maintenance titles and Housekeeping portal share one role**:

| # | Area | Shared behavior |
|---:|---|---|
| 1 | `staff_designation_map.py` | Maintenance* → `housekeepingmanager` |
| 2 | Provision / credential scripts | Same mapping |
| 3 | Unit tests (`test_ops_designation_maps`, portal suite, staff provision) | Assert shared mapping |
| 4 | `hrSeed.js` EMP-QMIS-107 | Designation Maintenance Officer, `role: "housekeepingmanager"` |
| 5 | Credential prep CSVs | Kausik eligible as Housekeeping Manager |
| 6 | Production 8-staff sync | Kausik role kept `housekeepingmanager` |
| 7 | Live eight-account audit script | Expects `kausikg1@…` → `housekeepingmanager` |
| 8 | Ops `_HK` ACL | Only HK role writes `hk-*` (Maintenance users inherit HK data access via that role) |
| 9 | Ticket dept roles | `housekeepingmanager` in `_TICKET_DEPT_ROLES`; Facilities queue has no peer role |
| 10 | Announcement senders | Only HK among the two |
| 11 | HR `_DEPARTMENT_HEADS` | Only HK among the two |
| 12 | Frontend ROLES / App / sidebar / JD profiles | Only Housekeeping Manager |
| 13 | Admin creatable roles | Only HKM |

**Not shared (already separate conceptually in UI copy):** ticket category/department lists include both Housekeeping and Facilities — but ownership collapses to HK role for Housekeeping only.

---

## 5. Data isolation & department workflows — gap analysis

| Concern | Today | After split (needed) |
|---|---|---|
| Cleaning schedules / duty / RO / lost-found | HK only via `hk-*` | Remain HK-only |
| Maintenance work orders / asset repair / electrical-plumbing tickets | No dedicated collections; Facilities tickets orphaned | New `maint-*` (or `fac-*`) collections + Maintenance ticket inbox |
| Inventory / purchase | HK chemicals/consumables under `hk-*` | HK keeps HK stock; Maintenance needs own inventory/requirements/procurement if client requires separate stores |
| Cross-read | Admins see all | Optional read-only cross-dept for JD/Principal only — **not** mutual write |
| Department head HR visibility | HK head sees employees with matching `department` string | Requires distinct HR `department` values (`Housekeeping` vs `Maintenance`) or role-based filters |

**Current isolation failure mode:** a Maintenance Officer logged in as `housekeepingmanager` can see/edit **all Housekeeping** schedules, inventory, lost-found, etc. That violates the client’s two-department model.

---

## 6. Proposed separate Maintenance role (recommendation only)

### 6.1 Proposed codes

| Item | Proposal | Rationale |
|---|---|---|
| Role code | **`maintenancemanager`** | Matches existing `*manager` ops pattern (`housekeepingmanager`, `transportmanager`, …) |
| Frontend constant | `ROLES.MAINTENANCE_MANAGER = 'maintenancemanager'` | Parallel to HK |
| Display name | **Maintenance Manager** | Department head label; staff may still be “Maintenance Officer” |
| ID prefix | **`MTM`** | Admin user-creation prefix (avoid clash with HKM) |
| Portal base path | **`/maintenance-manager`** | Parallel to `/housekeeping-manager` |
| Home | `/maintenance-manager/dashboard` | |
| Demo email (local only) | `maintenancemanager@qmis.edu` | Do not invent prod passwords in repo |

**Do not invent alternate codes** (`maintenance`, `facilitiesmanager`) unless product explicitly prefers them — stick to one approved code.

### 6.2 Designation map changes (proposed)

| Designation pattern | New role |
|---|---|
| Housekeeping*, HK Supervisor, Housekeeping Manager | **`housekeepingmanager`** (unchanged) |
| Maintenance Officer, Maintenance Manager, Maintenance*, Facilities Manager | **`maintenancemanager`** (new) |

Preserve Housekeeping functionality: **no removals** from HK portal modules; only stop routing Maintenance designations into HK.

### 6.3 Proposed permissions (parity with HK ops head)

Mirror Housekeeping Manager for staff-ops head capabilities:

- `_CORE` + leave read/write, escalations, tasks, announcements read/**write**, ops read/write, communication, calendar read
- Add to `_OPS_ROLES`, `_ANNOUNCEMENT_SENDERS`, `_TICKET_DEPT_ROLES`, `_DEPARTMENT_HEADS`
- **Do not** grant `hk-*` write — only new `maint-*` (and Facilities ticket filter)
- Optionally include in `_STORES` / `shared-*` **only if** Maintenance issues/receives store stock as its own department string

### 6.4 Proposed Maintenance dashboard / sidebar (MVP)

Reuse the HK layout pattern; modules tailored to facilities:

| Nav item | Purpose | Data |
|---|---|---|
| Dashboard | Open tickets, open work orders, SLA | Aggregates |
| Task Management | Assign/complete tasks | Existing task APIs |
| Work Orders / Requests | Repair & facilities requests | New `maint-requests` (or reuse shaped copy of HK requests) |
| Tickets | Inbox `defaultDepartment="Facilities"` | Existing `it-support-tickets` |
| Inventory | Spares / tools (optional MVP+) | New `maint-inventory` |
| Inventory Requirement / Purchase | Dept procurement | New `maint-*` keys |
| Announcement | Dept broadcast | Same announcement system, role key `maintenancemanager` |
| Reports | Export lists | Same ExportModal patterns |
| Duty / Asset checklist (optional) | Staff roster for technicians | New collection if required |

**Explicitly exclude from Maintenance portal (remain HK-only):** RO testing, Lost & Found, HK cleaning schedules, HK Star of the Month, Housekeeping duty allotment for cleaners.

### 6.5 Optional staff (non-head) roles

Client asked for separate **department heads and staff**. Options:

| Option | Approach | Recommendation |
|---|---|---|
| A | Heads only (`housekeepingmanager` / `maintenancemanager`); staff are directory-only or shared “worker” accounts | Fastest MVP |
| B | Add `housekeepingstaff` / `maintenancestaff` with limited write | Larger scope — defer unless client mandates staff portals |

This proposal assumes **Option A** unless approved otherwise. Pradeep (EMP-QMIS-120, Maintenance Officer, directory-only today) can remain directory-only or later receive Maintenance staff access under Option B.

---

## 7. Preserve existing Housekeeping role

Non-negotiable preserve list:

1. Keep role code `housekeepingmanager` and all current routes under `/housekeeping-manager`.
2. Keep `hk-*` ACL writers as Housekeeping (+ admins) — **do not** add Maintenance as HK writer.
3. Keep demo seed `housekeepingmanager@qmis.edu`.
4. Keep announcement / task / ticket Housekeeping department filter.
5. Keep JD “House Keeping Manager” employee profile entry (add a **separate** Maintenance profile; do not rename HK to Maintenance).
6. Regression tests for HK designation → `housekeepingmanager` must continue to pass for Housekeeping titles.

---

## 8. Impact on existing user accounts & credential workbooks

### 8.1 Known people

| Emp code | Name | Designation | Credential prep today | Likely post-split |
|---|---|---|---|---|
| EMP-QMIS-107 | Kausik (aka Kowsic) | Maintenance Officer | `housekeepingmanager` / Housekeeping Manager / eligible | Remap to **`maintenancemanager`** after portal exists |
| EMP-QMIS-120 | Pradeep | Maintenance Officer | Directory only | Stay directory-only **or** Maintenance staff later |
| (any true HK Supervisor / HK Manager) | — | Housekeeping* | `housekeepingmanager` | **Unchanged** |

### 8.2 Workbooks / prep artifacts to update (after approval)

| Artifact | Change |
|---|---|
| `docs/QMIS_Staff_Credential_Prep.csv` | Kausik role code/label → Maintenance Manager |
| `erp complete documentation/QMIS_Staff_Credential_Prep*.csv` | Same |
| `src/Pages/HR/domain/hrSeed.js` | EMP-QMIS-107 `role` → `maintenancemanager`; consider `department: "Maintenance"` |
| `backend/scripts/_live_eight_account_audit_readonly.py` | Expect Maintenance role for Kausik |
| Client Excel credential workbooks (gitignored) | Update role column only when implementing — **do not auto-edit prod** |
| Tests asserting Maintenance → HK | Rewrite to Maintenance → `maintenancemanager` |

### 8.3 Production impact (planned later — **not executed now**)

When approved for a controlled sync (similar to 8-staff sync):

1. Deploy code with new role + portal first.
2. Dry-run remap: `kausikg1@gmail.com` role `housekeepingmanager` → `maintenancemanager`.
3. Snapshot DB; commit only after login verifies Maintenance dashboard.
4. **Do not** change passwords unless client requests.
5. Confirm no other user still needs HK portal under a Maintenance designation.

**This audit must not run that sync.**

---

## 9. Migration & implementation plan (awaiting approval)

### Phase 0 — Approval gates

- [ ] Approve role code `maintenancemanager`
- [ ] Approve portal path `/maintenance-manager`
- [ ] Approve MVP module list (tickets + requests ± inventory)
- [ ] Approve account remap of EMP-QMIS-107 only (vs also provision Pradeep)
- [ ] Confirm Housekeeping remains untouched

### Phase 1 — Backend role & ACL (no prod writes)

1. Add role to `matrix.py` `FRONTEND_ROLES` + permission loops (`_OPS_ROLES`, announcements, tickets).
2. Add creatable option in `admin_users.py` (`MTM`).
3. Split `staff_designation_map.py` Maintenance vs Housekeeping.
4. Add `_MAINT` writers for new `maint-*` collections in `ops_collections.py`.
5. Add Facilities ticket handling so Maintenance role is in `_TICKET_DEPT_ROLES`.
6. Add `maintenancemanager` to `hr.py` `_DEPARTMENT_HEADS`.
7. Update/extend unit tests (designation, portal suite, admin creatable, announcements ops audience).
8. Local seed user for demo login (optional).

### Phase 2 — Frontend portal

1. `ROLES.MAINTENANCE_MANAGER` in `roles.js`.
2. Auth home path, `App.jsx` layout gate, `MaintenanceManagerLayout`, routes, sidebar, titles.
3. Dashboard + tickets (`defaultDepartment="Facilities"`) + requests/inventory pages (clone HK patterns carefully with new storage keys).
4. Profile picker / role module config / RBAC created-users / taskManagementConfig / announcementConfigs / RaiseItTicket labels.
5. JD/JDA employee-management profile for Maintenance Manager (additive).
6. FE build + smoke login.

### Phase 3 — Credential prep & local verify

1. Update prep CSVs + `hrSeed` for EMP-QMIS-107.
2. Local provision/login: HK still lands on Housekeeping; Maintenance lands on Maintenance.
3. Verify data isolation: Maintenance cannot PUT `hk-schedules`; HK cannot PUT `maint-*`.
4. Verify Facilities tickets appear in Maintenance inbox; Housekeeping tickets remain HK.

### Phase 4 — Production (explicit second approval)

1. Deploy frontend+backend with new role.
2. Read-only audit who holds `housekeepingmanager` with Maintenance designations.
3. Controlled role remap for approved emails only.
4. Browser UAT sign-off; update production sync report.
5. **No automatic password changes; no bulk directory rewrites.**

### Phase 5 — Docs & regression

1. Update Full Role Module Workflow Audit row for Maintenance.
2. Update README role table.
3. Keep this audit as historical SoT; add implementation report when done.

### Estimated risk

| Risk | Mitigation |
|---|---|
| Kausik loses login mid-deploy | Deploy portal first; remap only after health checks |
| HK regressions | Do not edit HK routes/collections except tests that wrongly couple Maintenance |
| Orphan Facilities tickets | Map Maintenance inbox to `Facilities` before remap |
| Shared store movements | Use department string `Maintenance` vs `Housekeeping` on new rows |

---

## 10. File checklist (implementation touch list)

**Backend:**  
`permissions/matrix.py`, `admin_users.py`, `staff_designation_map.py`, `ops_collections.py`, `hr.py`, `announcements.py`, `integrations/events.py`, `seed.py`, provision/credential scripts, tests listed in §2.2 / §8.2.

**Frontend:**  
`constants/roles.js`, `AuthContext.jsx`, `App.jsx`, new `Layout/MaintenanceManagerLayout.jsx`, new `Routes/MaintenanceManagerRoutes.jsx`, new `Pages/MaintenanceManager/**`, `sidebarLinks.js`, `TitleMappings.jsx`, announcement/task/ticket/RBAC configs, JD employee management, `hrSeed.js`, `campusCollectionRegistry.js`.

**Docs / prep:**  
Credential CSVs, this audit, future implementation report, `.gitignore` allowlist for new docs.

---

## 11. Explicit non-actions (this audit)

- No production DB updates  
- No credential password changes  
- No force role remap  
- No deletion of Housekeeping portal  
- No commit/push/deploy of implementation code until approved  

---

## 12. Approval request

Please confirm:

1. **Role code** `maintenancemanager` — approve / change?
2. **Portal path** `/maintenance-manager` — approve / change?
3. **MVP scope** — tickets + work orders/requests only, or also inventory + purchase?
4. **Account remap** — EMP-QMIS-107 Kausik only at first?
5. **Staff portals** — heads-only (Option A) for now?

After written approval, implementation can proceed per Phases 1–3 (local), then Phase 4 only with a separate production approval.
