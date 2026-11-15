import os
import shutil
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase
import pypdf

from app.config.settings import settings
from app.database import collections
from app.services.permission_service import PermissionService

logger = logging.getLogger("caresight.documents")

class DocumentService:
    @staticmethod
    def _ensure_upload_dir():
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    @classmethod
    async def upload_document(
        cls,
        db: AsyncIOMotorDatabase,
        current_user: dict,
        file: UploadFile,
        title: str,
        document_type: str,
        elderly_id_str: Optional[str] = None
    ) -> dict:
        cls._ensure_upload_dir()
        current_user_id = str(current_user["_id"])
        user_role = current_user.get("role")
        target_elderly_str = elderly_id_str or current_user_id

        elderly_oid = await PermissionService.verify_access(
            db, current_user, target_elderly_str,
            required_permission="can_upload_documents" if user_role != "elderly" else None,
            action_name="UPLOAD_DOCUMENT"
        )

        # Generate secure unique file name
        safe_filename = f"{ObjectId()}_{file.filename}"
        destination_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(destination_path)

        # Attempt text extraction for PDF
        extracted_text = ""
        if file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf"):
            try:
                reader = pypdf.PdfReader(destination_path)
                for page in reader.pages[:5]:
                    extracted_text += page.extract_text() or ""
            except Exception as e:
                logger.warning(f"Could not extract text from PDF: {e}")

        # Generate initial summary with Gemini or fallback
        ai_summary = await cls._generate_document_summary(title, document_type, extracted_text)

        uploader_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
        doc_record = {
            "elderly_user_id": elderly_oid,
            "uploaded_by_user_id": ObjectId(current_user_id),
            "uploader_name": uploader_name,
            "title": title.strip(),
            "document_type": document_type,
            "file_name": file.filename,
            "file_path": destination_path,
            "storage_type": "local_secure",
            "file_size_bytes": file_size,
            "mime_type": file.content_type or "application/octet-stream",
            "ai_summary": ai_summary,
            "extracted_tags": [document_type.replace('_', ' ').title(), "Medical Record"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        res = await db[collections.HEALTHCARE_DOCUMENTS_COLLECTION].insert_one(doc_record)
        doc_record["_id"] = res.inserted_id
        doc_record["id"] = str(res.inserted_id)
        doc_record["elderly_user_id"] = str(elderly_oid)
        doc_record["uploaded_by_user_id"] = current_user_id

        await PermissionService.log_audit_event(
            db, current_user_id, str(elderly_oid), "DOCUMENT_UPLOADED",
            "healthcare_documents", str(res.inserted_id), {"title": title, "type": document_type}
        )

        return doc_record

    @classmethod
    async def list_documents(
        cls,
        db: AsyncIOMotorDatabase,
        current_user: dict,
        elderly_id_str: str,
        doc_type: Optional[str] = None
    ) -> List[dict]:
        elderly_oid = await PermissionService.verify_access(
            db, current_user, elderly_id_str,
            required_permission="can_view_documents" if current_user.get("role") != "elderly" else None,
            action_name="LIST_DOCUMENTS"
        )
        query = {"elderly_user_id": elderly_oid}
        if doc_type:
            query["document_type"] = doc_type

        cursor = db[collections.HEALTHCARE_DOCUMENTS_COLLECTION].find(query).sort("created_at", -1)
        documents = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            doc["elderly_user_id"] = str(doc["elderly_user_id"])
            doc["uploaded_by_user_id"] = str(doc["uploaded_by_user_id"])
            documents.append(doc)
        return documents

    @classmethod
    async def get_document_for_download(
        cls,
        db: AsyncIOMotorDatabase,
        current_user: dict,
        document_id_str: str
    ) -> dict:
        if not ObjectId.is_valid(document_id_str):
            raise HTTPException(status_code=400, detail="Invalid document ID")
        doc_oid = ObjectId(document_id_str)

        document = await db[collections.HEALTHCARE_DOCUMENTS_COLLECTION].find_one({"_id": doc_oid})
        if not document:
            raise HTTPException(status_code=404, detail="Medical document not found")

        elderly_oid = document["elderly_user_id"]
        await PermissionService.verify_access(
            db, current_user, str(elderly_oid),
            required_permission="can_view_documents" if current_user.get("role") != "elderly" else None,
            action_name="DOWNLOAD_DOCUMENT"
        )
        return document

    @classmethod
    async def _generate_document_summary(cls, title: str, doc_type: str, text: str) -> str:
        snippet = text[:2000].strip() if text else ""
        if settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_"):
            try:
                from google import genai
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                prompt = f"""
                Summarize this medical document for a senior patient and their family.
                Title: {title}
                Type: {doc_type}
                Text Extract: {snippet or 'No direct text extracted from file; generate a general review checklist.'}

                Provide 2-3 clear, patient-friendly bullet points on the key takeaways and any doctor instructions.
                Do not diagnose or prescribe.
                """
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.error(f"Gemini document summarization failed: {e}")

        # Deterministic structured summary fallback
        return (
            f"• Verified {doc_type.replace('_', ' ').title()}: '{title}' added to digital medical vault.\n"
            f"• File indexed for authorized family care circle review.\n"
            f"• Always follow prescribing physician's guidance regarding clinical reports."
        )
