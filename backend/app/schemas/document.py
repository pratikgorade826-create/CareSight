from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

DocumentType = Literal[
    "prescription",
    "lab_report",
    "discharge_summary",
    "doctor_note",
    "medical_certificate",
    "imaging_scan"
]

class DocumentMetadataResponse(BaseModel):
    id: str
    elderly_user_id: str
    uploaded_by_user_id: str
    uploader_name: Optional[str] = None
    title: str
    document_type: DocumentType
    file_name: str
    file_size_bytes: int
    mime_type: str
    ai_summary: Optional[str] = None
    extracted_tags: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

class DocumentSummarizeResponse(BaseModel):
    document_id: str
    title: str
    ai_summary: str
    extracted_tags: List[str] = Field(default_factory=list)
