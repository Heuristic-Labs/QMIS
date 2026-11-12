# QMIS — Housekeeping & Maintenance Full Implementation Audit

| Field | Value |
|---|---|
| **Date** | 11 November 2026 |
| **Mode** | LOCAL audit → implement → test (**no commit / push / prod**) |
| **Sources** | Non-Academics PDF v0.1; coverage + role reports; live FE/BE |
| **Roles** | `housekeepingmanager` `/housekeeping-manager` · `maintenancemanager` `/maintenance-manager` |

### Status legend

| Status | Meaning |
|---|---|
| **COMPLETE** | Present, persists, authorized, matches PDF intent for heads |
| **PARTIAL** | Exists but incomplete vs full PDF depth |
| **MISSING** | PDF-required and not present |
| **BLOCKED** | Needs client decision / upstream module |
| **NOT APPLICABLE** | Not owned by this department in the PDF |

Evidence: **Code** · **API** · **Pytest** · **Browser** · **Prod** (Prod always out of scope here).

---

## 1. PDF requirements distilled

- Separate HK and Maintenance departments with own duty / schedule / checklist (§1, §8#10).
- Dashboards: open tickets + checklist completion (§4.1).
- Inventory master owned by Store Officer; depts request issues (§4.2–4.4).
- Tickets: `Raised → Assigned → In Progress → Resolved → Confirmed by Requester`; history; escalate if unresolved (§4.5).
- Duty: staff, **shift**, area, date (§4.6).
- Checklists: daily/weekly/monthly/**yearly**; head create/verify (§4.7, §8#2).
- Announcements: JD / Dept Heads (§4.11).
- Staff matrix: V own duty, C fill checklist, C tickets — **no separate staff portal UX specified**.

---

## 2. Final feature matrix (after local implementation)

| Feature | Housekeeping | Maintenance | Evidence |
|---|---|---|---|
| Dashboard | COMPLETE* | COMPLETE* | Code + Browser — KPIs from ops/tickets; *photo/overdue escalate still PARTIAL |
| Duty Allotment | COMPLETE* | COMPLETE* | Code + Browser — shift/area/date/status persist; *leave-reassign log PARTIAL |
| Schedules | COMPLETE | COMPLETE | Code + Browser — DAILY–YEARLY |
| Checklists | COMPLETE* | COMPLETE* | Code + API + Browser — `hk-checklists` / `maint-checklists`; *photo + JD review lane PARTIAL |
| Tickets | COMPLETE* | COMPLETE* | Code + Browser — PDF lifecycle + assign + requester confirm; *auto-escalation PARTIAL |
| Inventory/Store | COMPLETE* | COMPLETE* | Code + API + Browser — HK ledger + Maint materials/store req/purchase on `maint-*`; *Store Officer master remains Store module |
| Announcements | COMPLETE | COMPLETE | Code + Browser — Maint broadcast wired |
| Staff Portal | BLOCKED | BLOCKED | PDF capabilities without separate portal spec — pending client decision |
| Role Isolation | COMPLETE | COMPLETE | Pytest + API — cross-dept 403 |

\*COMPLETE for head operational portals in local env; remaining PARTIAL items listed in §4.

---

## 3. What was implemented in this pass

### Shared ticketing (§4.5)
- Status set aligned to PDF lifecycle (legacy Open/Pending/Closed retained for old rows).
- Assignment field + requester confirmation + history events on update.

### Housekeeping
- Duty **shift** field.
- Schedules **YEARLY**.
- New **Checklists** register → `hk-checklists` / `schoolerp-housekeeping-checklists-v1`.
- Dashboard KPIs: open tickets, checklist pending, open duties, active schedules (hydrated).

### Maintenance
- Duty **shift**.
- Announcements routes + `announcementConfigs.maintenancemanager`.
- Materials (`maint-inventory`), Store Requests (`maint-requests`), Inventory Requirement, Purchase Workflow.
- Dashboard KPIs for materials / store / purchase / announcements.
- Maint included in shared Store writers (`_STORES`) for issue/receive participation.

### Backend
- New COLLECTIONS: `hk-checklists`, `maint-inventory`, `maint-inventory-requirements`, `maint-procurement`.
- Integration event maps updated.
- Isolation tests extended.

---

## 3b. Follow-up fix (audit subagent)

[HK/Maint audit](47cd3cdd-288f-4e51-815c-49d6efc6774b) found Task Management stored under `schoolerp-housekeeping-schedules-v1`, colliding with Schedules / `hk-schedules`.

**Fix (local):** tasks → `schoolerp-housekeeping-tasks-v1` / `hk-tasks`; schedules keep `hk-schedules`. Guarded by isolation pytest.

---

## 4. Remaining PARTIAL / BLOCKED (honest)

| Item | Status | Why |
|---|---|---|
| Checklist photo evidence | PARTIAL | PDF optional photo; register stores text items only |
| Overdue checklist → JD escalate | PARTIAL | No automated overdue notifier to JD |
| Ticket auto-escalation chain | PARTIAL | History + status exist; no automatic escalate workflow |
| Leave-driven duty reassign log | PARTIAL | Duty status editable; no HR leave bridge |
| Nested checklist item schema | PARTIAL | PDF silent; textarea lines used |
| Dedicated staff portals | BLOCKED | PDF implies staff actions; no separate login portal specified — do not invent |
| Production Kausik remap | BLOCKED | Explicitly out of scope |
| Commit / push / deploy | BLOCKED | Explicitly prohibited this prompt |

---

## 5. Test evidence

### Pytest
```bash
cd backend
python -m pytest tests/test_maintenance_housekeeping_isolation.py tests/test_ops_designation_maps.py -q
# 15 passed, 1 warning
```

### API (after local uvicorn reload for new COLLECTIONS)
| Check | Result |
|---|---|
| Maint PUT `maint-inventory` | 200 |
| HK PUT `maint-inventory` | 403 |
| HK PUT `hk-checklists` | 200 |
| Maint PUT `hk-checklists` | 403 |

### Frontend
`npm run build` — PASS

### Browser (127.0.0.1:5173 / :8000)
| Step | Result |
|---|---|
| Maintenance sidebar: Dashboard…Announcement | PASS |
| Materials list after API save (Total Records: 1) | PASS |
| Announcement list page | PASS |
| Housekeeping login → Checklists (Total Records: 1) | PASS |
| Dashboard KPIs present both portals | PASS |

Prod verified: **NO** (prohibited).

---

## 6. Safety checkpoint

| Action | Status |
|---|---|
| Local implementation + tests + browser | DONE |
| Commit / push / merge | **NOT DONE** (prohibited) |
| Production DB / accounts / Secrets / ECS | **NOT TOUCHED** |

**Stop here.** Await review before any git or production action.
