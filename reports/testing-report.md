# Testing report

**Date:** 2 November 2026  
**Context:** Staff credential list role correction (File Room / CCTV / PRO / TM / Maintenance) + Non-Academics portals. Local only. **No production DB writes. No passwords logged or committed.**

## Latest — credential sheet verify + designation tests

| Suite / check | Result |
|---|---|
| Local login for 8 target staff (CLIENT sheet passwords via TestClient → localhost) | **8/8 HTTP 200** (roles below) |
| PRO Vaiyapuri / Jeyakumar | login OK · DB role `pro` matches sheet |
| Maintenance Kausik (Kowsic) | login OK · DB role `housekeepingmanager` matches sheet |
| Karthick (sheet `transportmanager`) | login OK · DB still `jointdirectorassistant` (mismatch; no DB write) |
| Control Room Vengadeswari / Meena (sheet `cctv`) | login OK · DB still `gatekeeper` (mismatch; no DB write) |
| File Room Shanmugavalli / Sivasankari (sheet `fileroom`) | login OK · DB still `stationerystoremanager` (mismatch; no DB write) |
| `pytest` designation + File/CCTV/PRO map slice | **8 passed** |
| CLIENT xlsx gitignored | **yes** |
| Prep CSVs password column | placeholders only (0 real secrets) |

## Prior same day — Non-Academics ops collections

| Suite / check | Result |
|---|---|
| File/CCTV/PRO portal + static + designation maps | **49 passed** |
| `npm run build` | **PASS** |

## Coverage notes

- Credentials list now aligns with `staff_designation_map` for File Room, CCTV, PRO, Transport Manager, Maintenance→HK.
- Working passwords preserved on the CLIENT sheet; verification script clears password values from memory after each attempt and never prints them.
- DB role remaps intentionally not applied (preserve working portal access until authorized remap).

## Not run / blockers

- AWS / production login re-check not run.
- Full `pytest tests/` not re-run this slice.
