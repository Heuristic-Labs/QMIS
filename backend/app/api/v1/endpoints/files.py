from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import bearer, get_current_user, permission_codes_for, require_any, require_permission
from app.models import User
from app.services.errors import fail
from app.services.files import delete_library_file, get_file, list_files, save_upload, upload_library_file

router = APIRouter(prefix="/api/v1/files", tags=["files"])

# File Management screen: Admin/Super Admin/MD (users.write) or File Room (documents.library.*).


@router.get("")
def list_files_route(
    search: str = Query(""),
    kind: str = Query("", description="'' all, 'library' File Management uploads, 'module' other modules"),
    db: Session = Depends(get_db),
    user: User = Depends(require_any("users.write", "documents.library.read")),
) -> list[dict]:
    return list_files(db, user, search=search, kind=kind)


@router.post("/library", status_code=201)
async def upload_library_route(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_any("users.write", "documents.library.write")),
) -> dict:
    return upload_library_file(db, user, file)


@router.delete("/{file_id}")
def delete_file_route(
    file_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_any("users.write", "documents.library.write")),
) -> dict:
    return delete_library_file(db, user, file_id)


def _can_upload_resource(db: Session, user: User, resource_type: str) -> bool:
    codes = set(permission_codes_for(db, user))
    if codes.intersection({"hr.write", "hr.employees.write", "admissions.write"}):
        return True
    # Star of the Month evidence docs: teachers/ops with write may attach files.
    if str(resource_type or "").startswith("som-") and codes.intersection({"ops.write", "academics.write"}):
        return True
    return False


@router.post("", status_code=201)
async def upload_file_route(
    file: UploadFile = File(...),
    resource_type: str = Form("attachment"),
    resource_id: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not _can_upload_resource(db, user, resource_type):
        fail(403, "forbidden", "You do not have permission to upload this file.")
    return save_upload(db, user, file, resource_type=resource_type, resource_id=resource_id)


@router.get("/{file_id}/download")
def download_file_route(
    file_id: UUID,
    request: Request,
    token: str | None = Query(None),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    auth = credentials
    if auth is None and token:
        auth = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    user = get_current_user(request, auth, db)
    row, path = get_file(db, user, file_id)
    return FileResponse(path, media_type=row.content_type, filename=row.original_name)
