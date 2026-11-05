"""Ensure TC NOC table + widened status check exist on startup."""

from __future__ import annotations

from sqlalchemy import inspect, text

from app.core.database import engine

_STATUS_CHECK_SQL = (
    "status IN ("
    "'Pending PRM Review', "
    "'Pending Manager NOCs', "
    "'Pending Super Admin Approval', "
    "'Approved', "
    "'Rejected'"
    ")"
)


def ensure_tc_schema() -> None:
    try:
        inspector = inspect(engine)
        if not inspector.has_table("tc_request_nocs"):
            from app.models import Base

            table = Base.metadata.tables.get("tc_request_nocs")
            if table is not None:
                Base.metadata.create_all(bind=engine, tables=[table])

        if engine.dialect.name == "postgresql" and inspector.has_table("tc_requests"):
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE tc_requests DROP CONSTRAINT IF EXISTS ck_tc_requests_status"))
                conn.execute(
                    text(
                        "ALTER TABLE tc_requests ADD CONSTRAINT ck_tc_requests_status "
                        f"CHECK ({_STATUS_CHECK_SQL})"
                    )
                )
    except Exception:
        # Never block API startup; Alembic 0024 covers the same change formally.
        pass
