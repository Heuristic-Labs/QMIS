# QMIS ERP — PRO Portal Build Guide

**Purpose:** Hand-off brief to continue or extend the dedicated PRO portal.  
**Date:** 2026-11-02  
**Branch:** `feature/class-section-catalog-consistency`  
**Role code:** `pro` (do not invent a new code)

Related audit: `docs/QMIS_FileRoom_CCTV_PRO_Portal_Audit.md` (§1–§14).

---

## 1. Status at a glance

| Area | Status |
|------|--------|
| Dedicated `/pro/*` portal (layout, routes, sidebar) | **Already implemented** (Phase 4) |
| Split from PRM Front Office shell | **Done** — PRM stays on `/front-office/*` |
| Demo login | `pro@qmis.edu` / `pro12345` (when `seed_demo_accounts` is on) |
| Announcements / activities write | **Denied** (read-only by design) |
| Communication Reports / Settings / News & Media | **Not built** (pending / missing APIs) |
| Commit / push / deploy / Irulappan accounts | **Not done** |

**Do not rebuild the portal from scratch.** Extend what exists; keep PRM, File Room, and CCTV intact.

---

## 2. Required behavior (product contract)

### PRO (`pro`)

- Landing: `/pro/dashboard`
- Own layout + PR-focused sidebar + protected `/pro/*` routes
- Must **not** land in general PRM `/front-office` when dedicated routes exist
- Announcements: **read-only** (no `announcements.write`, not in `CREATOR_ROLE_KEYS`)
- Activities / events: **read-only** UI + API (`activities.read` only)
- Unsupported menus: honest **“Not yet available”** — no fake saves or invented metrics
- Reuse existing APIs; do not invent endpoints or approval workflows
- Do not grant Admin / Super Admin privileges

### PRM (`prm`) — must stay unbroken

- Landing: `/front-office/admission-enquiry` (existing `ROLE_HOME_PATHS`)
- Layout: `PRMLayout` + Front Office sidebar
- Must be blocked from `/pro/*` (App guard redirects to FO home)

---

## 3. Sidebar (target menu)

| # | Menu | Route | Backend | Build action |
|---|------|-------|---------|--------------|
| 1 | Dashboard | `/pro/dashboard` | Enquiries + announcements + activities list APIs | **Live — keep** |
| 2 | Announcements & Circulars | `/pro/announcements` | `GET /announcements` | **Live read-only — keep** |
| 3 | Events & School Activities | `/pro/events` (+ cultural/sports/competitions) | `GET /activities` | **Live read-only — keep** |
| 4 | Parent & Community Communication | `/pro/communication/inbox` | Communication APIs | **Live — keep** |
| 5 | Enquiries & Follow-ups | `/pro/enquiries` | Admissions enquiry APIs | **Live — keep** |
| 5b | Government Liaison Cases | `/pro/government-cases` | `ops` collection `pro-gov-cases` | **Live** (Non-Academics §9.2) |
| 6 | Communication Reports | `/pro/reports` | **No API** | Pending shell only until API exists |
| 7 | Settings | `/pro/settings` | **No API** | Pending shell only until specified |
| — | News & Media | — | **Not implemented** | Do **not** fabricate a working module |

Gate pass, TC, admission list, collections: **not** in PRO sidebar unless product explicitly requires them. Backend FO/admissions perms for `pro` may still exist — do not silently strip valid APIs from other workflows.

---

## 4. Key files (already in tree)

### Frontend

| File | Role |
|------|------|
| `src/Layout/ProLayout.jsx` | Shell (header + sidebar + breadcrumb) |
| `src/Routes/ProRoutes.jsx` | `/pro/*` route table |
| `src/Pages/Pro/**` | Dashboard, Announcement, Events, Communication, PendingFeature |
| `src/Common/CommonSidebar/Components/sidebarLinks.js` | `proSidebarLinks` |
| `src/Common/CommonSidebar/CommonSidebar.jsx` | Path `/pro` → PRO sidebar |
| `src/App.jsx` | `ROLES.PRO` → `ProLayout`; `ROLES.PRM` → `PRMLayout` |
| `src/context/AuthContext.jsx` | `ROLE_HOME_PATHS[PRO] = '/pro/dashboard'` |
| `src/Pages/Authentication/profileOptions.js` | PRO profile tile |
| `src/Pages/Authentication/roleModuleConfig.js` | PRO in Academics module |
| `src/Common/Announcement/announcementConfigs.js` | `pro` routes |
| `src/Common/Communication/communicationRoleConfig.js` | `pro` inbox config |
| `src/Common/Activities/activityConfigs.js` | `proRoutes` |
| `src/Common/Activities/ActivityListView.jsx` | Hides Add/Edit/Delete when `roleKey === 'pro'` |
| `src/Pages/Admin/FrontOffice/AdmissionEnquiry/admissionEnquiryData.js` | `/pro` enquiry path helpers |

### Backend

| File | Role |
|------|------|
| `backend/app/permissions/matrix.py` | `pro` perms (admissions/FO + auto read grants) |
| `backend/app/core/config.py` | `pro_seed_email` / `pro_seed_password` |
| `backend/app/services/seed.py` | Seeds `pro@qmis.edu` when demo seeds on |
| `backend/tests/test_pro_portal.py` | Login, ACL, API allow/deny |
| `backend/tests/test_pro_frontend_static.py` | Static wiring guards |

### Local demo login

```
email:    pro@qmis.edu
password: pro12345
```

Only when local/demo seed is enabled — never for production CI as a real staff account.

---

## 5. Authorization rules (do not weaken)

| Permission | PRO |
|------------|-----|
| `announcements.read` | Yes |
| `announcements.write` | **No** |
| `activities.read` | Yes |
| `activities.write` / `activities.approve` | **No** |
| `admissions.write` / FO read+write | Yes (existing matrix) |
| `communication.read` / `.write` | Yes (inbox) |
| `users.write` / admin users | **No** |

Enforce on **API** as well as frontend. Campus/tenant isolation must stay.

**Known gap for Irulappan / live staff:** Super Admin creatable roles include `fileroom` / `cctv` but **`pro` is still not creatable** via Admin User Creation API. Staff with designation PRO already map to `pro` in `staff_designation_map.py`; provisioning path for new PRO logins needs an explicit product decision before Phase 7 accounts.

---

## 6. Safe next build steps (recommended order)

Use this when continuing work. Each step should stay narrow.

### A. Harden what already exists (before new features)

1. Fix `/pro` path prefix collision risk: `pathname.startsWith("/pro")` also matches `/process-auditor`. Prefer exact segment checks (`=== '/pro' || startsWith('/pro/')`) in `App.jsx`, sidebar, and enquiry helpers.
2. Register PRO in `breadcrumbMappings.js` (`prefix: '/pro'`, `proSidebarLinks`) so breadcrumb home is `/pro/dashboard`.
3. Re-run browser UAT: login, refresh, logout, direct `/pro/*`, direct `/front-office` while PRO, PRM blocked from `/pro`.
4. Confirm API errors on dashboard/inbox show inline error text — no blank screen / uncaught exception.

### B. Only if product asks for more FO under PRO

- Mount specific FO screens under `/pro/...` with clear menu entries.
- Do **not** dump the full PRM sidebar into PRO.

### C. Pending modules — wait for real APIs

- Communication Reports → keep `PendingFeature` until a reporting API exists.
- Settings → keep pending until requirements exist.
- News & Media → do not stub “successful” publish/upload flows.

### D. After portal UAT sign-off

- Irulappan / directory PRO accounts (env approval).
- Decide whether Super Admin may create `pro` via `/admin/users`.
- Commit / push / deploy only when explicitly requested.

---

## 7. How to run locally

```bash
# Backend (from backend/)
# Ensure demo seed / ENVIRONMENT allows seed_demo_accounts
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend (from repo root)
# VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
# VITE_USE_API_AUTH=true
npm run dev -- --host 127.0.0.1 --port 5173
```

Login as `pro@qmis.edu` → expect `/pro/dashboard`.  
Login as `prm@qmis.edu` → expect `/front-office/admission-enquiry`.

### Focused tests

```bash
cd backend
python -m pytest tests/test_pro_portal.py tests/test_pro_frontend_static.py -q

# From repo root
npm run build
```

---

## 8. Boundaries (always)

- Preserve File Room (`fileroom`) and CCTV (`cctv`) portals.
- Preserve PRM Front Office behavior.
- No fake API data, no invented success toasts for pending screens.
- No production DB writes, migrations, AWS/secrets changes, or Irulappan account creation unless explicitly approved.
- No commit / push / merge / deploy / branch reset unless asked.

---

## 9. Cursor continuation prompt (copy/paste)

```text
Continue QMIS ERP PRO portal work using docs/QMIS_PRO_Portal_Build_Guide.md
and docs/QMIS_FileRoom_CCTV_PRO_Portal_Audit.md §14.

The dedicated /pro portal already exists (role pro, home /pro/dashboard).
Do not rebuild from scratch. Harden path guards (/pro vs /process-auditor),
breadcrumb for /pro, and error handling. Keep announcements/activities
read-only. Keep PRM on /front-office. Do not invent Reports/News APIs.
Do not touch File Room/CCTV, AWS, production data, or commit/push unless asked.
Verify with pytest PRO suites, npm run build, and browser UAT for PRO + PRM.
```

---

## 10. Acceptance checklist (before calling PRO “done”)

- [ ] `pro` login → `/pro/dashboard` with 7-item PR sidebar  
- [ ] Refresh on a deep `/pro/...` route keeps session and page  
- [ ] Logout returns to sign-in; clean re-login works  
- [ ] Announcements: list/view only — no Add  
- [ ] Events: list/view only — no Add/Edit/Delete  
- [ ] Communication inbox loads without crash  
- [ ] Enquiries list works under `/pro/enquiries`  
- [ ] Reports / Settings show “Not yet available”  
- [ ] PRO hitting `/front-office/*` → redirect to `/pro/dashboard`  
- [ ] PRM hitting `/pro/*` → stays on / redirected to Front Office  
- [ ] API: announcement/activity POST → 403 for PRO  
- [ ] PRM Front Office sidebar unchanged  
- [ ] `pytest` PRO suites + `npm run build` pass  
