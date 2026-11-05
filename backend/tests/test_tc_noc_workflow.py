"""TC multi-level NOC workflow: Transport Manager NOC → PRM → MD/Admin final."""

import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["OTP_DEBUG"] = "true"
os.environ["JWT_SECRET"] = "test-secret-qmis-erp-tc-noc"
os.environ["ENVIRONMENT"] = "development"

from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
from app.models import OpsRecord, Student
from tests.conftest import reset_sqlite_memory_schema

ADMIN = (settings.admin_seed_email, settings.admin_seed_password)
TM = ("transportmanager@qmis.edu", "transport123")
TEACHER = (settings.teacher_seed_email, settings.teacher_seed_password)


@pytest.fixture()
def client():
    reset_sqlite_memory_schema()
    with TestClient(app) as test_client:
        yield test_client


def _login(client, email, password):
    from auth_test_helpers import login_headers

    return login_headers(client, email, password)


def _student(client, admin_headers, *, tag: str):
    created = client.post(
        "/api/v1/admissions",
        headers=admin_headers,
        json={
            "first_name": f"TcNoc{tag}",
            "last_name": "Student",
            "mobile_number": "9000011111",
            "class_name": "Grade 5",
            "father_name": "Parent Noc",
            "parent_account_email": f"parent.tcnoc.{tag.lower()}@example.com",
        },
    )
    assert created.status_code in (200, 201), created.text
    admission_id = created.json()["id"]
    enrolled = client.post(
        f"/api/v1/admissions/{admission_id}/enroll",
        headers=admin_headers,
        json={
            "parent_account_email": f"parent.tcnoc.{tag.lower()}@example.com",
            "parent_account_password": "Parent-Test-2026",
        },
    )
    assert enrolled.status_code == 200, enrolled.text
    payload = enrolled.json()
    return str(payload["student_id"]), payload.get("student_code") or payload.get("admission_number")


def _assign_school_transport(student_id: str, _admission_number: str | None):
    with SessionLocal() as db:
        student = db.get(Student, UUID(str(student_id)))
        assert student is not None
        db.add(
            OpsRecord(
                campus_id=student.campus_id,
                collection="transport-student-assignments",
                public_id=f"TSA-{student.admission_number}",
                body={
                    "id": f"TSA-{student.admission_number}",
                    "studentId": str(student.id),
                    "admissionNumber": student.admission_number,
                    "studentName": student.full_name,
                    "routeName": "Route 1",
                },
            )
        )
        db.commit()


def test_without_transport_skips_manager_nocs(client):
    admin = _login(client, ADMIN[0], ADMIN[1])
    student_id, _ = _student(client, admin, tag="A")
    created = client.post(
        "/api/v1/tc-requests",
        headers=admin,
        json={"studentRef": student_id, "reason": "Relocation.", "transferTo": "DPS"},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "Pending PRM Review"
    assert body["nocs"] == []
    forwarded = client.post(f"/api/v1/tc-requests/{body['id']}/forward", headers=admin, json={"remarks": "ok"})
    assert forwarded.status_code == 200
    assert forwarded.json()["status"] == "Pending Super Admin Approval"
    approved = client.post(
        f"/api/v1/tc-requests/{body['id']}/decide",
        headers=admin,
        json={"decision": "approve", "remarks": "Issue"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "Approved"
    assert approved.json()["tcNumber"].startswith("TC/")


def test_transport_student_routes_to_transport_manager_noc(client):
    admin = _login(client, ADMIN[0], ADMIN[1])
    tm = _login(client, TM[0], TM[1])
    teacher = _login(client, TEACHER[0], TEACHER[1])
    student_id, admission = _student(client, admin, tag="B")
    _assign_school_transport(student_id, admission)

    created = client.post(
        "/api/v1/tc-requests",
        headers=admin,
        json={"studentRef": student_id, "reason": "Moving city.", "transferTo": "NPS"},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "Pending Manager NOCs"
    assert len(body["nocs"]) == 1
    assert body["nocs"][0]["roleCode"] == "transportmanager"
    assert body["nocs"][0]["status"] == "Pending"

    # Teacher cannot NOC or decide.
    assert client.post(
        f"/api/v1/tc-requests/{body['id']}/noc",
        headers=teacher,
        json={"decision": "approve"},
    ).status_code == 403
    assert client.post(
        f"/api/v1/tc-requests/{body['id']}/decide",
        headers=admin,
        json={"decision": "approve"},
    ).status_code == 409

    # PRM cannot forward while NOCs pending.
    assert client.post(
        f"/api/v1/tc-requests/{body['id']}/forward",
        headers=admin,
        json={"remarks": "early"},
    ).status_code == 409

    # Transport Manager sees the request and approves NOC.
    listed = client.get("/api/v1/tc-requests", headers=tm)
    assert listed.status_code == 200
    assert any(row["id"] == body["id"] for row in listed.json())
    noc = client.post(
        f"/api/v1/tc-requests/{body['id']}/noc",
        headers=tm,
        json={"decision": "approve", "remarks": "Bus dues cleared."},
    )
    assert noc.status_code == 200, noc.text
    assert noc.json()["status"] == "Pending PRM Review"
    assert noc.json()["nocs"][0]["status"] == "Approved"
    assert noc.json()["nocs"][0]["remarks"] == "Bus dues cleared."

    # Duplicate NOC blocked.
    assert client.post(
        f"/api/v1/tc-requests/{body['id']}/noc",
        headers=tm,
        json={"decision": "approve"},
    ).status_code == 409

    forwarded = client.post(
        f"/api/v1/tc-requests/{body['id']}/forward",
        headers=admin,
        json={"remarks": "All clearances done."},
    )
    assert forwarded.status_code == 200
    assert forwarded.json()["status"] == "Pending Super Admin Approval"

    # Unauthorized cannot generate TC.
    assert client.post(
        f"/api/v1/tc-requests/{body['id']}/decide",
        headers=tm,
        json={"decision": "approve"},
    ).status_code == 403
    assert client.post(
        f"/api/v1/tc-requests/{body['id']}/decide",
        headers=teacher,
        json={"decision": "approve"},
    ).status_code == 403

    approved = client.post(
        f"/api/v1/tc-requests/{body['id']}/decide",
        headers=admin,
        json={"decision": "approve", "remarks": "Final issue TC."},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "Approved"
    assert approved.json()["tcNumber"].startswith("TC/")
    assert approved.json()["superAdminRemarks"] == "Final issue TC."


def test_manager_noc_rejection_closes_request(client):
    admin = _login(client, ADMIN[0], ADMIN[1])
    tm = _login(client, TM[0], TM[1])
    student_id, admission = _student(client, admin, tag="C")
    _assign_school_transport(student_id, admission)
    created = client.post(
        "/api/v1/tc-requests",
        headers=admin,
        json={"studentRef": student_id, "reason": "Leave.", "transferTo": "Other"},
    )
    assert created.status_code == 201
    ref = created.json()["id"]
    refused = client.post(
        f"/api/v1/tc-requests/{ref}/noc",
        headers=tm,
        json={"decision": "reject"},
    )
    assert refused.status_code == 422
    rejected = client.post(
        f"/api/v1/tc-requests/{ref}/noc",
        headers=tm,
        json={"decision": "reject", "remarks": "Transport dues outstanding."},
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "Rejected"
    assert rejected.json()["tcNumber"] == ""
