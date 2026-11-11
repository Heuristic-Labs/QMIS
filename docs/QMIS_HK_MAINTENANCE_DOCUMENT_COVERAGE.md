# QMIS — Housekeeping & Maintenance vs Non-Academics Document Coverage

| Field | Value |
|---|---|
| **Date** | 11 November 2026 |
| **Source doc** | `erp complete documentation/ERP Documentation – 2. Non-Academics Department.pdf` (v0.1 draft) |
| **Code baseline** | Local Maintenance Manager split (MVP) + existing Housekeeping Manager portal |
| **Mode** | Coverage check only — no production changes |

### Status legend

| Status | Meaning |
|---|---|
| **DONE** | Present for that role’s portal |
| **PARTIAL** | Present but incomplete vs PDF intent |
| **MISSING** | Required by PDF for that department; not in portal |
| **N/A** | Not owned by this department in the PDF |
| **EXTRA** | In product; not required as department-owned in the PDF |

---

## 1. Document role model (what the PDF requires)

| PDF role | Responsibility (PDF wording) | ERP role code (local) |
|---|---|---|
| **Housekeeping Head** | Cleaning duties, checklists, supplies requests | `housekeepingmanager` |
| **Housekeeping staff** | Same department under head | Heads-only MVP — **no staff portal** |
| **Maintenance Head** | Repairs, preventive maintenance, ticket resolution | `maintenancemanager` |
| **Maintenance staff** | Same department under head | Heads-only MVP — **no staff portal** |

PDF §1 / §8 #10: **Housekeeping and Maintenance are separate departments**, each with its own **duty allotment, schedule and checklist**.

---

## 2. Shared Non-Academics modules that apply to both dept heads

From PDF module map (§3) + HK/Maint dashboard KPIs (§4.1).

| PDF module | Housekeeping Head | Maintenance Head | Notes |
|---|---|---|---|
| Dashboard (open tickets, checklist completion) | **PARTIAL** | **DONE** | Maint dashboard now includes open duties, active schedules, pending checklists + tickets. |
| Ticketing (repair / cleaning / IT) | **DONE** (`Housekeeping`) | **DONE** (`Facilities`) | PDF: tickets only — no “work order”. |
| Duty Allotment | **DONE** | **DONE** | Isolated `maint-duty-allotments` vs `hk-duty-allotments`. |
| Checklists / Schedules (daily–yearly) | **PARTIAL** (Schedules register) | **DONE** | `maint-schedules` + `maint-checklists` (textarea checklist items; PDF schema ambiguous). |
| Inventory / supplies | **DONE** (HK inventory + requirement) | **MISSING** | PDF: supplies via Store; HK head requests supplies. Maint may request tools/spares via Store later. |
| Request & Approval (store issues) | **DONE** | **MISSING** | |
| Purchase Workflow | **DONE** | **MISSING** | Chain: SO → JD → Finance (shared). |
| Announcements / Instructions | **DONE** | **MISSING** | PDF: dept heads can announce. |
| Notifications | **PARTIAL** (global bell) | **PARTIAL** | Shared app notifications, not dept-specific. |
| Lost and Found | **EXTRA** on HK portal | **N/A** | PDF: global / all users — not HK-owned. |
| Staff portal (non-head) | **MISSING** | **MISSING** | Approved heads-only for now. |

---

## 3. Housekeeping portal — item by item

| PDF / expected capability | Current path / module | Status |
|---|---|---|
| Separate HK head login | `housekeepingmanager` → `/housekeeping-manager` | **DONE** |
| Dashboard | `/housekeeping-manager/dashboard` | **PARTIAL** (tasks/stock/requests; weak checklist KPI) |
| Cleaning tickets inbox | `/housekeeping-manager/tickets` | **DONE** |
| Duty allotment | `/housekeeping-manager/duty-allotment` | **DONE** |
| Schedules / checklist cadence | `/housekeeping-manager/schedules` | **PARTIAL** (register exists; not full checklist execution UI) |
| Supplies / inventory | `/housekeeping-manager/inventory` | **DONE** |
| Store requirement | `/housekeeping-manager/inventory-requirement` | **DONE** |
| Requests & approvals | `/housekeeping-manager/requests-approvals` | **DONE** |
| Purchase workflow | `/housekeeping-manager/purchase-workflow` | **DONE** |
| Announcements | `/housekeeping-manager/broadcast` | **DONE** |
| Task management | `/housekeeping-manager/task-management/*` | **EXTRA** / useful ops |
| Reports | `/housekeeping-manager/reports` | **EXTRA** |
| Star of the Month | `/housekeeping-manager/star-of-the-month` | **EXTRA** (not in Non-Academics PDF for HK) |
| RO Testing | `/housekeeping-manager/ro-testing` | **EXTRA** |
| Lost & Found | `/housekeeping-manager/lost-found` | **EXTRA** vs PDF ownership (global) |
| HK staff portal | — | **MISSING** (by MVP decision) |

**Housekeeping verdict:** Core PDF head capabilities are largely covered. Gaps are checklist-completion UX depth and staff portal. Several product extras remain (SOM, RO, Lost & Found on HK).

---

## 4. Maintenance portal — item by item

| PDF / expected capability | Current path / module | Status |
|---|---|---|
| Separate Maintenance head login | `maintenancemanager` → `/maintenance-manager` | **DONE** (local) |
| Designation map Maintenance* → Maintenance role | `staff_designation_map.py` | **DONE** (local) |
| Isolation from `hk-*` | ops ACL `_MAINT` / `_HK` | **DONE** (local) |
| Dashboard (open tickets + checklist completion) | `/maintenance-manager/dashboard` | **DONE** (local) |
| Tickets — repair / facilities | `/maintenance-manager/tickets` (`Facilities`) | **DONE** |
| Duty allotment (own) | `/maintenance-manager/duty-allotment` | **DONE** (`maint-duty-allotments`) |
| Schedules (own) | `/maintenance-manager/schedules` | **DONE** (`maint-schedules`) |
| Checklists (own) | `/maintenance-manager/checklists` | **DONE** (`maint-checklists`) |
| Store request / inventory / purchase | — | **MISSING** |
| Announcements | — | **MISSING** |
| Maintenance staff portal | — | **MISSING** (by MVP decision) |
| Work orders | — | **N/A** in PDF (use Ticketing) |

**Maintenance verdict:** Local head portal now covers PDF core ops for Maintenance (tickets, duty, schedules/checklists) on `maint-*`. Remaining: store/purchase, announcements, staff portal, production remap.

---

## 5. Cross-department isolation (document + product)

| Rule | Document | Local product |
|---|---|---|
| Separate heads | Required | **DONE** (`housekeepingmanager` ≠ `maintenancemanager`) |
| Separate duty / schedule / checklist data | Required | **DONE** locally (`hk-*` vs `maint-*`) |
| Separate ticket queues | Cleaning vs maintenance tickets | **DONE** (Housekeeping vs Facilities filters) |
| Production Kausik on Maintenance portal | Implied by separate head | **NOT DONE** (prod still `housekeepingmanager` until approved remap) |

---

## 6. Coverage scorecard (heads only)

| Area | Housekeeping | Maintenance |
|---|---|---|
| Role / portal / login | **DONE** | **DONE** (local) |
| Ticketing | **DONE** | **DONE** |
| Duty Allotment | **DONE** | **DONE** (local) |
| Schedules / Checklists | **PARTIAL** | **DONE** (local) |
| Supplies / Store / Purchase | **DONE** | **MISSING** |
| Announcements | **DONE** | **MISSING** |
| Dashboard completeness | **PARTIAL** | **DONE** (local) |
| Staff portals | **MISSING** | **MISSING** |
| Prod account remap | N/A for true HK heads | **MISSING** (Kausik) |

---

## 7. Recommended next build order (needs approval)

1. Maintenance **Announcements**
2. Maintenance **Store requirement / purchase** (mirror HK patterns on `maint-*`)
3. Optional: deepen structured checklist items; HK checklist UX; Lost & Found → global; staff portals
4. Production remap EMP-QMIS-107 only after deploy + approval

---

## 8. What you can verify in login now

| Login | Should see |
|---|---|
| `maintenancemanager@qmis.edu` / `maintenance123` | Dashboard, Tickets, Duty Allotment, Schedules, Checklists |
| `housekeepingmanager@qmis.edu` / `housekeeping123` | Full HK menu (unchanged) |

Production credentials must **not** be used for this check until a separate production approval.
