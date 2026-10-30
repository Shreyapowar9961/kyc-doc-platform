# ml/service/main.py
"""FastAPI Microservice for Document OCR, 9-Class Classification, and KYC Extraction."""

import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Header, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .ocr import ocr_document, check_tesseract_available
from .classify import ClassifierService
from .extract import extract_fields

app = FastAPI(
    title="KYC Document Processing ML Service",
    version="2.0.0",
    description="Private microservice for document OCR, 9-class categorization and KYC entity extraction."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INTERNAL_KEY = os.environ.get("ML_INTERNAL_KEY", "local-dev-internal-ml-key")

# Instantiate and preload model at service startup
classifier_service = ClassifierService(model_dir="ml/models")

def verify_internal_key(x_internal_key: Optional[str] = Header(None)):
    """Enforces backend-to-ML authentication."""
    if not x_internal_key or x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Invalid internal service key")

class ExtractRequest(BaseModel):
    text: str
    doc_class: Optional[str] = None

@app.get("/health")
def health():
    """Health status and capability report."""
    tesseract_ok = check_tesseract_available()
    return {
        "status": "ok",
        "model_loaded": classifier_service.loaded,
        "tesseract_available": tesseract_ok,
        "version": "2.0.0",
        "classes": classifier_service.classes,
        "confidence_threshold": classifier_service.threshold,
        "min_text_chars": classifier_service.min_text_chars,
    }

@app.post("/classify")
async def classify_file(
    file: UploadFile = File(...),
    x_internal_key: Optional[str] = Header(None)
):
    """Processes uploaded PDF or image file: OCR -> Text -> 9-Class Classification."""
    verify_internal_key(x_internal_key)

    filename = file.filename or "unknown.pdf"
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Empty file payload")

    # 1. OCR processing
    try:
        text, ocr_chars = ocr_document(content, filename)
    except Exception as e:
        print(f"OCR failure on {filename}: {e}")
        text, ocr_chars = "", 0

    # 2. Classification
    result = classifier_service.classify(text, ocr_chars)
    # Include extracted raw text internally for Express backend
    result["text"] = text

    return result

@app.post("/extract")
async def extract_document_fields(
    payload: ExtractRequest,
    x_internal_key: Optional[str] = Header(None)
):
    """Extracts KYC fields (PAN, masked Aadhaar, Name, DOB) from provided text."""
    verify_internal_key(x_internal_key)
    fields = extract_fields(payload.text, payload.doc_class)
    return {"fields": fields}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml.service.main:app", host="127.0.0.1", port=8000, reload=False)
