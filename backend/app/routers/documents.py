import os
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.connection import get_db
from app.database import collections
from app.middleware.auth_middleware import get_current_user
from app.services.document_service import DocumentService
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/api/documents", tags=["Medical Vault"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    document_type: str = Form(...),
    elderly_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    return await DocumentService.upload_document(
        db=db,
        current_user=current_user,
        file=file,
        title=title,
        document_type=document_type,
        elderly_id_str=elderly_id
    )

@router.get("")
async def list_documents(
    elderly_id: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    target_id = elderly_id or str(current_user["_id"])
    return await DocumentService.list_documents(db, current_user, target_id, document_type)

@router.get("/{id}")
async def get_document_details(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid document ID")
    doc_oid = ObjectId(id)
    doc = await db[collections.HEALTHCARE_DOCUMENTS_COLLECTION].find_one({"_id": doc_oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await PermissionService.verify_access(
        db, current_user, str(doc["elderly_user_id"]),
        required_permission="can_view_documents" if current_user.get("role") != "elderly" else None,
        action_name="GET_DOCUMENT_DETAIL"
    )

    doc["id"] = str(doc["_id"])
    doc["elderly_user_id"] = str(doc["elderly_user_id"])
    doc["uploaded_by_user_id"] = str(doc["uploaded_by_user_id"])
    return doc

@router.get("/{id}/file")
async def download_document_file(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    doc = await DocumentService.get_document_for_download(db, current_user, id)
    file_path = doc.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Underlying document file is missing on storage.")

    return FileResponse(
        path=file_path,
        filename=doc.get("file_name", "document.pdf"),
        media_type=doc.get("mime_type", "application/octet-stream")
    )

@router.delete("/{id}")
async def delete_document(
    id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid document ID")
    doc_oid = ObjectId(id)
    doc = await db[collections.HEALTHCARE_DOCUMENTS_COLLECTION].find_one({"_id": doc_oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    elderly_oid = doc["elderly_user_id"]
    await PermissionService.verify_access(
        db, current_user, str(elderly_oid),
        required_permission="can_upload_documents" if current_user.get("role") != "elderly" else None,
        action_name="DELETE_DOCUMENT"
    )

    file_path = doc.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    await db[collections.HEALTHCARE_DOCUMENTS_COLLECTION].delete_one({"_id": doc_oid})
    return {"message": "Document deleted successfully"}
