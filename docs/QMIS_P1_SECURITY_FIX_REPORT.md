# QMIS – P1 Security and Data Isolation Fix Report

**Date:** 11 November 2026 (IST)  
**Source of truth:** `docs/QMIS_FINAL_BUG_CLOSURE_REPORT.md`  
**Scope:** Bugs **#55**, **#31**, **#34**, **#58a** only  
**Constraints honored:** No production DB changes; no real staff credential changes. Commit/push only when explicitly approved.  

Status vocabulary used here (separate, cumulative):

| Status | Meaning |
|--------|---------|
| **IMPLEMENTED** | Code change landed for the control |
| **TEST PASSED** | Focused backend pytest (incl. negative cases) green |
| **API VERIFIED** | Live local API proved unauthorized requests rejected |
| **BROWSER VERIFIED** | Local UI checked for the role/path in scope |

A bug is **RESOLVED** only when all four statuses above are recorded as passed for that ID.

---

## 1. Executive matrix

| ID | Title | IMPLEMENTED | TEST PASSED | API VERIFIED | BROWSER VERIFIED | RESOLVED? |
|----|-------|:-----------:|:-----------:|:------------:|:----------------:|:---------:|
| **#55** | Server-side timetable filtering (teacher allocation / coordinator band) | Yes | Yes | Yes | Yes | **Yes** |
| **#31** | Process vs Quality audit stream isolation (reports / obs / ATR) | Yes | Yes | Yes | Yes | **Yes** |
| **#34** | Role-based Delete FE + BE | Yes | Yes | Yes | Yes* | **Yes*** |
| **#58a** | CA/RCA role + ownership across APIs/screens | Yes | Yes | Yes | Yes | **Yes** |

\*Teacher Delete is gated centrally (`canShowDeleteOption` + `DeleteRequestModal`) and on Teacher list pages; empty Extra Class / Timetable screens confirm no unauthorized Delete chrome. Teachers may still delete **own** CA/RCT rows via ownership-scoped Unit Tests UI (approved ownership rule).

---

## 2. Permission audit (before change)

| Surface | Prior behaviour | Risk |
|---------|-----------------|------|
| `GET /api/v1/academics/class-timetables` | Staff (teacher/coordinator) received **full campus** list; phase3a asserted that | Client filter ≠ authorization |
| `GET/PUT /api/v1/campus-audit/{process-\|quality-\*}` | `_READ_ALL_AUDIT` let Process and Quality **cross-read** | Cross-stream confidentiality |
| Quality FE seeds | Used `OBS-PA` / `AUD-PA` / `ATR-PA` IDs | Wrong-stream demo bleed |
| Delete UI | `canShowDeleteOption` only on a few screens; modal still offered “Send Request…” | Unauthorized Delete affordance |
| Ops / campus-audit writes | Already write-gated | Keep; add negatives |
| `unit-tests` (CA/RCT) | Teacher/coordinator could list/write campus-wide via academics PUT | Ownership gap |

Client-approved rules followed:

- Teachers: allocation / class-teacher roster only.  
- Coordinators: grade-band supervision only.  
- Leadership/admin: campus-wide.  
- Process vs Quality: no cross-stream read/write; JD config shared.  
- Delete: hidden for teacher/parent/student/driver/auditor personas; ops wipe still 403.  
- CA: teacher/coordinator only for owned classes; RCA campus-audit collections denied to teacher.

---

## 3. Implementation summary

### #55 – Timetable server-side scoping
- File: `backend/app/services/academics_collections.py`
- Staff list filter via `_teacher_roster_scope` (teacher) and coordinator grade band.
- Scoped whole-list PUT merges out-of-scope rows so teachers/coordinators cannot wipe others’ timetables/content.
- Tests updated in `test_academic_access_phase3a.py`, `test_academic_access_phase2.py`; new negatives in `test_p1_security_isolation.py`.

### #31 – Audit stream isolation
- File: `backend/app/services/campus_audit_collections.py`
- Process collections: Process Auditor + JD Audit + oversight — **not** Quality Auditor.
- Quality collections: Quality Auditor + JD Audit + oversight — **not** Process Auditor.
- Shared `audit-*` config remains readable by both.
- Writes stamp `auditStream`; cross-stream ID prefixes rejected (`422`).
- FE: Quality Auditor seeds remapped to `OBS-QA` / `AUD-QA` / `ATR-QA` / `SCH-QA`; loaders filter foreign stream.

### #34 – Delete permissions
- FE: `approvalGates.canShowDeleteOption` explicitly hides Delete for teacher/parent/student/driver/processauditor/qualityauditor.
- `DeleteRequestModal` refuses to open for unauthorized roles.
- Teacher list pages gated (Extra Class, Online Class, Question Banks, Study Materials, Sample Questions, Competitions, Enter Marks, Create Exam Schedule, Cultural/Sports patterns).
- BE: existing ops write gate kept; negative test teacher library wipe → `403`.

### #58a – CA / RCA ownership
- Academics `unit-tests` (and related class content) scoped like timetables; teacher cannot PUT Grade 8 CA when allocated only to Grade 5-A → `403`.
- Teacher `GET` campus-audit `process-rca` / `quality-rca` / ATR → `403`.
- Teacher CA/RCT UI remains available under Teacher routes; API returns only in-scope rows.

---

## 4. Backend tests

```text
python -m pytest \
  tests/test_p1_security_isolation.py \
  tests/test_ops_and_audit_collections.py \
  tests/test_academic_access_phase3a.py \
  tests/test_academic_access_phase2.py::test_staff_timetable_access_preserved \
  tests/test_academic_access_phase2.py::test_portal_timetables_limited_to_childs_class_and_section \
  tests/test_academic_access_phase2.py::test_unassigned_teacher_cannot_read_or_mark_and_self_declared_duty_does_not_count \
  tests/test_teacher_portal_apis.py \
  -q
```

**Result:** `43 passed` (~27s)

Notable negatives covered in `test_p1_security_isolation.py`:

- Teacher timetable excludes other grades.  
- Coordinator band excludes out-of-band grades.  
- Process ↔ Quality cross-GET → `403`.  
- Quality PUT with `OBS-PA-*` → `422`.  
- Teacher RCA / quality observations → `403`.  
- Teacher ops library wipe → `403`.  
- Teacher unit-test overwrite of other class → `403`.

---

## 5. Frontend build

```text
npm run build
```

**Result:** PASS (Vite production build ~46s; chunk-size warnings only).

---

## 6. Live local API verification

Backend restarted locally on `http://127.0.0.1:8000` with the new code. Script: `backend/scripts/_p1_api_verify.py`.

| Check | Result |
|-------|--------|
| Teacher `GET /academics/class-timetables` | `200`, scoped list (empty when no allocation match) |
| Teacher `PUT /academics/unit-tests` Grade 8 | **`403`** |
| Teacher `GET /campus-audit/process-rca` | **`403`** |
| Teacher `GET /campus-audit/quality-observations` | **`403`** |
| Quality `GET /campus-audit/process-observations` | **`403`** |
| Process `GET /campus-audit/quality-observations` | **`403`** |
| Quality `PUT` with `OBS-PA-*` id | **`422`** |
| Teacher `PUT /ops/library-books` `[]` | **`403`** |

Unauthorized direct API requests are rejected as required.

---

## 7. Browser verification (local seeds only)

| Check | Result |
|-------|--------|
| Teacher `/teacher/unit-tests` (CA/RCT) | Loads; Create available; empty scoped list |
| Teacher `/teacher/class/class-timetable` | “Showing 0 entries” — matches API scope (no campus-wide bleed) |
| Teacher `/teacher/class/extra-class` | List loads; no unauthorized Delete flow without entitlement |
| Quality Auditor `/quality-auditor/observations/open` | Rows show **`OBS-QA-*` / `AUD-QA-*`** (no PA bleed) |

---

## 8. Tracker update guidance

Update the client/internal tracker for these four IDs using the evidence above. Suggested one-liners:

1. **#55** — Resolved: server filters class-timetables by teacher allocation / coordinator grade band; pytest + live API + browser empty scoped list.  
2. **#31** — Resolved: Process/Quality collections isolated; QA seeds use QA IDs; cross-stream GET 403 / PA-id write 422.  
3. **#34** — Resolved: Delete hidden for unauthorized roles (FE gate + modal); teacher ops wipe 403.  
4. **#58a** — Resolved: CA unit-tests ownership scoped; teacher denied RCA audit APIs; CA UI remains teacher/coordinator.

Do **not** weaken permissions to make tests pass. Do **not** treat UI hide alone as closure without the API rows above.

---

## 9. Sign-off

| Question | Answer |
|----------|--------|
| Only the four P1s touched for this pass? | **Yes** (plus supporting tests / seeds / Delete gates) |
| Production DB / credentials changed? | **No** |
| Commit / push / deploy? | **No** |
| All four RESOLVED with IMPLEMENTED + TEST + API + BROWSER? | **Yes** |

**Prepared as:** P1 security implementation + verification against local backend/frontend.
