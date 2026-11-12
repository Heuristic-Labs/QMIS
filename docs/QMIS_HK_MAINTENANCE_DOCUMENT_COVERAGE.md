# QMIS — Housekeeping & Maintenance vs Non-Academics Document Coverage

| Field | Value |
|---|---|
| **Date** | 11 November 2026 (full local pass) |
| **Source doc** | `erp complete documentation/ERP Documentation – 2. Non-Academics Department.pdf` (v0.1 draft) |
| **Code baseline** | Full local HK + Maint head portals with isolation |
| **Mode** | Coverage after local implementation — **no production / no commit** |

### Status legend

| Status | Meaning |
|---|---|
| **DONE** | Present for that role’s portal |
| **PARTIAL** | Present but incomplete vs PDF intent |
| **MISSING** | Required by PDF for that department; not in portal |
| **N/A** | Not owned by this department in the PDF |
| **EXTRA** | In product; not required as department-owned in the PDF |
| **BLOCKED** | Pending client decision |

---

## 1. Document role model

| PDF role | Responsibility | ERP role code (local) |
|---|---|---|
| Housekeeping Head | Cleaning duties, checklists, supplies requests | `housekeepingmanager` |
| Housekeeping staff | Own duties / fill checklists | **BLOCKED** — no staff portal until client decides |
| Maintenance Head | Repairs, preventive maintenance, ticket resolution | `maintenancemanager` |
| Maintenance staff | Own duties / fill checklists | **BLOCKED** — no staff portal until client decides |

PDF §1 / §8 #10: separate departments with own duty / schedule / checklist — **DONE** locally (`hk-*` vs `maint-*`).

---

## 2. Shared modules

| PDF module | Housekeeping Head | Maintenance Head | Notes |
|---|---|---|---|
| Dashboard (open tickets, checklist completion) | **DONE** | **DONE** | Hydrated from persisted ops/tickets |
| Ticketing | **DONE** | **DONE** | PDF lifecycle statuses + assign + requester confirm |
| Duty Allotment | **DONE** | **DONE** | Includes shift |
| Checklists / Schedules | **DONE** | **DONE** | DAILY–YEARLY; text checklist items |
| Inventory / supplies | **DONE** | **DONE** | Maint: dept-held materials + store requests (not parallel Store master) |
| Request & Approval (store issues) | **DONE** | **DONE** | `maint-requests` |
| Purchase Workflow | **DONE** | **DONE** | `maint-procurement` feeds Store→JD→Finance path |
| Announcements | **DONE** | **DONE** | Maint broadcast wired |
| Notifications | **PARTIAL** | **PARTIAL** | Global bell |
| Lost and Found | **EXTRA** on HK | **N/A** | PDF: all users |
| Staff portal | **BLOCKED** | **BLOCKED** | |

---

## 3. Final feature matrix

| Feature | Housekeeping | Maintenance | Evidence |
|---|---|---|---|
| Dashboard | DONE | DONE | Browser |
| Duty Allotment | DONE | DONE | Browser / API |
| Schedules | DONE | DONE | Browser / API |
| Checklists | DONE | DONE | Browser / API |
| Tickets | DONE | DONE | Browser / Code |
| Inventory/Store | DONE | DONE | Browser / API |
| Announcements | DONE | DONE | Browser |
| Staff Portal | BLOCKED | BLOCKED | — |
| Role Isolation | DONE | DONE | Pytest / API |

Full audit: `docs/QMIS_HK_MAINTENANCE_FULL_IMPLEMENTATION_AUDIT.md`.

---

## 4. What you can verify locally

| Login | Should see |
|---|---|
| `maintenancemanager@qmis.edu` / `maintenance123` | Dashboard, Tickets, Duty, Schedules, Checklists, Materials, Store Requests, Inventory Requirement, Purchase, Announcement |
| `housekeepingmanager@qmis.edu` / `housekeeping123` | Full HK menu **including Checklists** |

After backend code changes, reload local uvicorn so new COLLECTIONS (`hk-checklists`, `maint-inventory`, …) are registered.

Production credentials must **not** be used until a separate production approval.
