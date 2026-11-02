# QMIS ERP — File Room, CCTV Room & PRO Portals — Phase 1 Audit

**Date:** 2026-11-02  
**Branch:** `feature/class-section-catalog-consistency` (synced with `qmis/main`)  
**Scope:** Phase 1 audit + Phase 2 File Room + Phase 3 CCTV Room. **PRO / Irulappan accounts not started.**  
**Status:** Phases 2–3 implemented locally (not committed).

---

## 1. Sources reviewed

| Source | Use |
|--------|-----|
| `docs/QMIS_Full_Role_Module_Workflow_Audit.md` | Role inventory; PRO gap F-008; documents module |
| `docs/QMIS_Staff_Credential_Prep.md` | Verified role codes; File Room / Control Room = **directory-only** today |
| `docs/QMIS_End_to_End_Academic_Examination_Results_Audit.md` | Admissions/PRO perms |
| `src/constants/roles.js`, `AuthContext.jsx`, `App.jsx` | Login, home paths, layouts |
| `backend/app/permissions/matrix.py` | Canonical role + permission SoT |
| `backend/app/services/staff_designation_map.py`, `admin_users.py` | Designation → role; creatable roles |
| `src/Common/CommonSidebar/Components/sidebarLinks.js` | Sidebars |
| Admin Documents / File Management / CameraManagement | Reusable UI |
| `ops_collections.py`, `documents.py`, `files.py`, admissions/announcements/communication | APIs |

---

## 2. Existing vs missing — summary

| Portal | Role code exists? | Dedicated login portal? | Backend APIs usable? | Verdict |
|--------|-------------------|-------------------------|----------------------|---------|
| **PRO** | Yes — `pro` | **No** — shares Front Office / PRM | Admissions, FO, TC, communication, calendar read | **PARTIAL** — polish into dedicated portal |
| **File Room** | **No** | **No** | Student/employee documents + file library exist for Admin/HR | **NOT READY** — new role + portal; reuse document APIs |
| **CCTV Room** | **No** | **No** | Camera **register** only (`security-cameras`); no live video in ERP | **NOT READY** — new role + portal; reuse register; mark live/playback pending |

**Do not invent role codes until approved.** Proposed codes below are recommendations only.

---

## 3. Supported role codes (actual)

Frontend `ROLES` + backend `ALL_ROLES` include (among others):  
`superadmin`, `admin`, `managing_director`, `prm`, **`pro`**, `teacher`, `coordinator`, `principal`, `director`, finance variants, ops managers, auditors, `hr`, `driver`, …

**Absent today:** `fileroom`, `file_room`, `cctv`, `cctvroom`, `controlroom`, `security` (as portal).

Staff credential prep currently marks:

- File Room Officer / File Room & Stores → **directory-only**
- Control Room Officer → **directory-only**
- A provisioning script once mapped `"file room"` → `stationerystoremanager` (wrong portal — must not continue)

### Creatable via Admin User Creation

`STAFF_ROLES` / `CREATABLE_ROLE_OPTIONS`: principal, prm, teacher, coordinator, librarian, gatekeepers, transport, driver, canteen/IT/stationery/HK managers (+ admin for superadmin).

**`pro` is not creatable** via that API. File Room / CCTV codes do not exist to create.

### Demo / seed logins

| Email | Frontend FAKE_CREDENTIALS | Backend demo seed |
|-------|---------------------------|-------------------|
| `pro@qmis.edu` | Yes | **No** |
| File Room / CCTV demos | None | None |

---

## 4. Authentication & routing today

- Single shared Sign-in UI (`/signin`) → API login (or demo when enabled).
- `ROLE_HOME_PATHS[pro]` = `/front-office/admission-enquiry` (same as PRM).
- `App.jsx`: `PRM || PRO` → `PRMLayout` + `/front-office/*` only.
- Sidebar: pathname `/front-office` → `prmSidebarLinks`. **`roleBasedSidebarLinks` has no `PRO` key** (known gap F-008).
- Profile picker / role modules: PRO tile missing.

---

## 5. Reusable functionality

### Documents / File Room candidates

| Asset | Path / API | Notes |
|-------|------------|--------|
| Student Documents UI | `src/Pages/Admin/Documents/StudentDocuments/*` | Real `/api/v1/documents/students` |
| Employee Documents UI | Admin + HR | Real `/api/v1/documents/employees` |
| File Management (library) | `Admin/FileManagement` | Real `/api/v1/files` but gated by **`users.write`** (admin-only today) |
| Principal Documents | Principal pages | **Hardcoded demo — do not reuse as SoT** |

Permissions: `documents.students.*`, `documents.employees.*`. Admin has full grant; HR has employee docs. **No File Room role holds these yet.**

Campus isolation: document/file services are campus-scoped for the actor — keep and extend when adding the role.

### CCTV / camera candidates

| Asset | Notes |
|-------|--------|
| `CameraRegister.jsx` | Metadata register; opens stream URL in NVR/VMS; **ERP does not play video** |
| `GET/PUT /ops/security-cameras` | Writers: admin, superadmin, MD, gatekeepermanager |
| Stream URL validation | Rejects embedded credentials (`user:pass@`) |

**No Live Monitoring, Recording & Playback, Incident, Alerts, or Audit Log modules** for CCTV exist.

### PRO / communications candidates

| Asset | PRO can use today? |
|-------|-------------------|
| Admission enquiry / list, FO collections, TC | Yes (`admissions.write`, `frontoffice.*`, `tc.*`) |
| Communication inbox | Yes |
| Announcements | **Read only** — PRO not in announcement writers / FO creator keys |
| Academic calendar | Read |
| Activities / events | `activities.read` in matrix; **no FO route** |
| News & Media / Enquiries CRM beyond admissions | **No dedicated module** |

---

## 6. Required sidebars vs reality

### File Room (requested)

Dashboard · File Management · Student Records · Staff Records · File Requests · Search & Retrieval · Archive & Disposal · Activity & Reports · Settings  

| Item | Backend / UI today | Plan |
|------|--------------------|------|
| File Management | Admin library (`users.write`) | Reuse UI; **need dedicated permission** (do not grant full `users.write`) |
| Student / Staff Records | Documents APIs | Reuse Admin document screens under File Room routes |
| File Requests / Search / Archive / Disposal / Reports / Settings | Missing or partial | **Pending** placeholders until APIs exist |
| Dashboard | None | KPI from document/file counts if API allows; else pending |

### CCTV Room (requested)

Dashboard · Live Monitoring · Camera Management · Recording & Playback · Incident Management · Alerts & Events · School Locations · Security Reports · Audit Logs · Settings  

| Item | Reality | Plan |
|------|---------|------|
| Camera Management | Exists | Reuse `CameraRegister` |
| Live / Recording / Incidents / Alerts / Reports / Audit | **None** | Explicit **pending / unconfigured** screens — never fake feeds |
| School Locations | May derive from camera `location` field | Read-only list from register |
| Settings | None | Pending |

### PRO (proposed candidates)

| Candidate | Reality |
|-----------|---------|
| Dashboard | None dedicated |
| Announcements & Circulars | Announcement UI exists; PRO lacks write |
| Events & School Activities | Activities API exists; not on FO nav |
| News & Media | **Missing** |
| Parent & Community Communication | Communication inbox exists |
| Enquiries & Follow-ups | Admissions enquiry exists |
| Communication Reports | **Missing / pending** |
| Settings | Generic / pending |

**Product decision needed:** keep admissions/gate-pass FO tools on PRO nav, or slim to PR-focused menus only.

---

## 7. Gaps & required changes (implementation preview — not started)

### Shared (auth)

1. Add approved role constants to `roles.js` + `matrix.py` (+ designation map).
2. `ROLE_HOME_PATHS`, `App.jsx` layouts, route modules, sidebars, `FAKE_CREDENTIALS` (dev only).
3. Extend creatable roles **only if** Admin should provision these logins.
4. Backend guards must enforce independently of FE nav; preserve campus isolation.
5. Do **not** invent parallel login; do **not** hardcode secrets.

### File Room

- New role (proposed: `fileroom`).
- Perms: `documents.students.read/write`, `documents.employees.read/write`, plus a **narrow files-library permission** (prefer new `documents.library.*` over `users.write`).
- Portal routes e.g. `/file-room/*`; pending screens labeled clearly.
- Stop wrong designation → stationery mapping.

### CCTV Room

- New role (proposed: `cctv` or `controlroom`).
- Grant `ops.read` / ops write for `security-cameras` only (extend `_writers_for` / `_readers_for`).
- Portal `/cctv-room/*`; Camera Management live; all video/incident features **pending**.
- Never expose RTSP credentials in FE or logs.

### PRO

- Keep role `pro`.
- Dedicated layout/sidebar (or filtered FO sidebar) + home path.
- Decide announcement write / activities nav / whether FO gate-pass stays.
- Add `PRO` to `roleBasedSidebarLinks`; profile tile; optional demo seed; optional creatable.

### Irulappan accounts — **Phase 7 only**

Blocked until portals verified + explicit AWS/campus approval. Prefer separate role accounts; no prod SQL; no CI seed of privileged users; no passwords in reports.

---

## 8. Unresolved business decisions (blockers)

Answer before Phase 2 coding:

1. **Role codes:** Approve `fileroom` and `cctv` (or alternate names)?
2. **File library ACL:** New `documents.library.read/write` vs temporary reuse of `users.write` (not recommended)?
3. **PRO nav:** Full FO parity vs PR-slim menu (dashboard, announcements, events, communication, enquiries, reports, settings)?
4. **PRO announcement write:** Grant `announcements.write` or keep read-only?
5. **CCTV write:** Can CCTV role edit camera register, or read-only (Admin/GKM write)?
6. **Demo seeds:** Create local demo users for the three roles for UAT (non-prod)?
7. **Admin creatable:** Should Super Admin User Creation list File Room / CCTV / PRO?

---

## 9. Recommended build order (after approval)

1. File Room portal (reuse strongest APIs)  
2. CCTV Room portal (register + pending shells)  
3. PRO dedicated portal (split from PRM shell)  
4. Tests + browser UAT + build  
5. Irulappan account plan → **approval** → create  

---

## 10. Git / env boundaries (confirmed)

- No commit/push/deploy without approval  
- No AWS/prod DB changes in this phase  
- Working tree left clean after this audit doc only  

---

## 11. Next step (historical)

Phase 2 File Room decisions were approved and implemented — see §12.

---

## 12. Phase 2 — File Room portal (implemented 2026-11-02)

### Product decisions applied

| Decision | Choice |
|----------|--------|
| Role code | `fileroom` |
| File library ACL | `documents.library.read` / `documents.library.write` (not `users.write`) |
| Document screens | Reuse Admin student/employee document components with path props |
| Demo seed | `fileroom@qmis.edu` when `seed_demo_accounts` is on (local/dev only) |
| Provisioning | **Super Admin only** via creatable roles (Campus Admin cannot create `fileroom`) |
| Out of scope | CCTV, PRO, Irulappan accounts |

### Final role / sidebar

- **Role:** `fileroom` / label File Room / staff prefix `FLR`
- **Home:** `/file-room/dashboard`
- **Sidebar:** Dashboard · File Management · Student Records · Staff Records · File Requests · Search & Retrieval · Archive & Disposal · Activity & Reports · Settings

| Menu | Status |
|------|--------|
| Dashboard | **Live** — counts from `/documents/students`, `/documents/employees`, `/files?kind=library` |
| File Management | **Live** — reuses Admin `FileManagement` + library APIs |
| Student Records | **Live** — reuses Admin student document screens |
| Staff Records | **Live** — reuses Admin employee document screens |
| File Requests / Search / Archive / Reports / Settings | **Pending** — honest “Not yet available” (no fake saves) |

### Permissions

`fileroom` holds: core + `students.read` + `hr.employees.read` + student/employee document R/W + library R/W.  
Does **not** hold `users.write` / `users.read` / admissions / ops.  
Admin/HR grants unchanged. Library list/upload/delete accept `users.write` **or** `documents.library.*`.  
No Alembic migration required — permissions sync from matrix seed.

### Key files changed

- Backend: `matrix.py`, `files.py` endpoints/service, `admin_users.py`, `staff_designation_map.py`, `seed.py`, `config.py`, `hr.py`, provision script file-room mapping
- Frontend: `roles.js`, `AuthContext.jsx`, `App.jsx`, `FileRoomLayout` / `FileRoomRoutes`, sidebar, TitleMappings, document path props, `PendingFeature`, dashboard
- Tests: `test_file_room_portal.py`, `test_file_room_frontend_static.py`

### Tests / build

| Check | Result |
|-------|--------|
| `pytest` file-room + file-mgmt + admin docs + admin users | **76 passed** |
| `npm run build` | **PASS** |

### Browser UAT (`:5173` → `:8000`, `fileroom@qmis.edu`)

| Screen / check | Result |
|----------------|--------|
| Login → `/file-room/dashboard` | **PASS** — live counts (1 student folder, 0 staff, 0 library at UAT time) |
| Full 9-item sidebar | **PASS** |
| File Management list + Upload UI | **PASS** (list exercised; upload click not required for ACL — covered by pytest) |
| Student Records list (1 entry) + Add New | **PASS** (list; add form not fully submitted in UAT) |
| Archive & Disposal pending banner | **PASS** — “Not yet available” |
| Direct `/admin/file-management` while fileroom | **PASS** — redirected to `/file-room/dashboard` |
| Staff Records / File Requests / Search / Reports / Settings | Not separately clicked; Staff uses same document API as pytest; others are pending shells |

### Unresolved / remaining (as of Phase 2)

- Dedicated search, archive, requests, reports, settings APIs still missing
- CCTV Room was Phase 3 — see §13
- PRO portal (Phase 4)
- Irulappan accounts (Phase 7) — needs env approval after portal UAT
- Not committed / pushed / deployed

### No production migration

Permission rows are matrix-seeded; no schema change.

---

## 13. Phase 3 — CCTV Room portal (implemented 2026-11-02)

### Product decisions applied

| Decision | Choice |
|----------|--------|
| Role code | `cctv` |
| Camera register | **Read-only** for CCTV; Admin + Gatekeeper Manager keep write |
| Live video / playback / incidents / alerts / reports / audit / settings | **Pending / unconfigured** — no fabricated feeds or counts |
| School Locations | Derived from camera `location` metadata |
| Demo seed | `cctv@qmis.edu` when `seed_demo_accounts` is on |
| Provisioning | **Super Admin only** |
| Out of scope | PRO, Irulappan accounts; File Room left intact |

### Final role / sidebar

- **Role:** `cctv` / label CCTV Room / staff prefix `CCTV`
- **Home:** `/cctv-room/dashboard`
- **Perms:** `_CORE` + `ops.read` only (no `ops.write`, no `users.*`)
- **Readers:** `security-cameras` includes `cctv` in `_readers_for`; writers unchanged (`admin`/`superadmin`/`managing_director`/`gatekeepermanager`)

| Menu | Status |
|------|--------|
| Dashboard | **Live** — register status counts only |
| Camera Management | **Live** — `CameraRegister` with `canEdit={false}` |
| School Locations | **Live** — distinct locations from register |
| Live Monitoring / Recording / Incidents / Alerts / Security Reports / Audit Logs / Settings | **Pending** |

### Security

- Existing stream URL validation still rejects embedded username/password
- CCTV cannot PUT/DELETE cameras (403) — confirmed API + pytest
- Direct `/admin/camera-management` while `cctv` redirects to `/cctv-room/dashboard`
- Ops collections remain campus-scoped (`OpsRecord.campus_id == actor.campus_id`)

### Key files

- Backend: `matrix.py`, `ops_collections.py`, `admin_users.py`, `staff_designation_map.py`, `seed.py`, `config.py`, `hr.py`, provision control-room → `cctv`
- Frontend: `roles.js`, `AuthContext`, `App.jsx`, `CctvRoomLayout` / `CctvRoomRoutes`, sidebar, TitleMappings, Dashboard, SchoolLocations, PendingFeature
- Tests: `test_cctv_room_portal.py`, `test_cctv_room_frontend_static.py`; camera exact-set assert relaxed for shared DB

### Tests / build

| Check | Result |
|-------|--------|
| CCTV + File Room + camera pytest | **33 passed** |
| `npm run build` | **PASS** |

### Browser UAT (`:5173` → `:8000`, `cctv@qmis.edu`)

| Screen / check | Result |
|----------------|--------|
| Login → `/cctv-room/dashboard` + 10-item sidebar | **PASS** |
| Camera Management shows UAT Gate; no Add button | **PASS** |
| Live Monitoring pending banner | **PASS** |
| School Locations page loads | **PASS** |
| `/admin/camera-management` redirect | **PASS** |
| API CCTV write denied 403 after Admin seed | **PASS** |

### Missing APIs / remaining (as of Phase 3)

- NVR live/playback integration, incidents, alerts, security reports, CCTV audit UI, settings
- PRO portal was Phase 4 — see §14
- Irulappan accounts (Phase 7)
- Not committed / pushed / deployed

---

## 14. Phase 4 — Dedicated PRO portal (implemented 2026-11-02)

### Product decisions applied

| Decision | Choice |
|----------|--------|
| Role code | Existing `pro` (unchanged) |
| Home | `/pro/dashboard` (no longer shared PRM `/front-office`) |
| Announcements | **Read-only** — `announcements.read` only; not in `CREATOR_ROLE_KEYS`; no `announcements.write` |
| Events & activities | Read APIs only; UI hides Add/Edit/Delete for `roleKey='pro'` |
| Communication | Reuses shared `CommunicationPage` with `roleKey='pro'` |
| Enquiries | Reuses Front Office admission enquiry screens under `/pro/enquiries` |
| Communication Reports / Settings | **Pending** honest shells |
| News & Media | **Not implemented** — not fabricated |
| FO extras (gate pass, TC, collections, admission list) | Not in PRO sidebar; backend FO/admissions perms unchanged for existing workflows |
| Demo seed | `pro@qmis.edu` / `pro12345` when `seed_demo_accounts` is on |
| Out of scope | File Room/CCTV changes, Irulappan accounts, AWS, commit/push/deploy |

### Final role / sidebar

- **Role:** `pro` / label PRO
- **Home:** `/pro/dashboard`
- **Layout:** `ProLayout` + `ProRoutes` (PRM remains on `PRMLayout` + `/front-office`)

| Menu | Status |
|------|--------|
| Dashboard | **Live** — enquiry / announcement / activity counts from APIs |
| Announcements & Circulars | **Live read-only** — list/view; no Add button |
| Events & School Activities | **Live read-only** — hub + cultural/sports/competitions lists |
| Parent & Community Communication | **Live** — communication inbox |
| Enquiries & Follow-ups | **Live** — shared admission enquiry screens |
| Communication Reports | **Pending** |
| Settings | **Pending** |

### Authorization

- Matrix grants for `pro` reused (admissions/FO + auto `announcements.read`, `activities.read`, communication).
- Confirmed **no** `announcements.write` / `activities.write` / `users.write`.
- API denials: POST announcements / activities → 403; admin users → 403.
- Campus isolation unchanged on shared services.
- Direct `/front-office/*` while PRO → redirect to `/pro/dashboard`.

### Key files changed

- Backend: `config.py` (pro seed), `seed.py`, matrix comment
- Frontend: `AuthContext` home path; `App.jsx` PRO vs PRM split; `ProLayout` / `ProRoutes`; `proSidebarLinks`; TitleMappings; profile/role selection; announcement/communication/activity configs; enquiry path helpers for `/pro`; ActivityListView read-only for PRO; PRO pages (Dashboard, Events, Announcement, Communication, PendingFeature)
- Tests: `test_pro_portal.py`, `test_pro_frontend_static.py`

### Tests / build

| Check | Result |
|-------|--------|
| `pytest` PRO + File Room + CCTV portal suites | **30 passed** |
| `npm run build` | **PASS** |

### Browser UAT (`:5173` → `:8000`, `pro@qmis.edu`)

| Screen / check | Result |
|----------------|--------|
| Login → `/pro/dashboard` + 7-item PR sidebar | **PASS** — live counts (28 enquiries, 0 announcements, 10 activities) |
| Announcements list read-only (no Add) | **PASS** |
| Enquiries list (28 entries) + Add Enquiry link | **PASS** |
| Communication inbox loads | **PASS** |
| Cultural activities list (6) without Add | **PASS** |
| Communication Reports pending banner | **PASS** |
| Direct `/front-office/admission-enquiry` while PRO | **PASS** — redirected to `/pro/dashboard` |
| PRM login still → `/front-office/admission-enquiry` with FO sidebar | **PASS** |

### Outstanding gaps

- Communication Reports / Settings APIs
- News & Media module (not started)
- Optional deeper FO screens under PRO (intentionally out of PR sidebar)
- Irulappan accounts (Phase 7)
- Not committed / pushed / deployed

### No production migration

Permission rows are matrix-seeded; no schema change. Demo seed only when `seed_demo_accounts` is enabled.
