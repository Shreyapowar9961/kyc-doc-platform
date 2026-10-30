# ml/service/ocr.py
"""OCR and document page conversion pipeline using Tesseract and Poppler."""

import os
from typing import Tuple
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes, convert_from_path

TESSERACT_CMD = os.environ.get("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if os.path.exists(TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

def check_tesseract_available() -> bool:
    """Verifies that Tesseract OCR binary is reachable and operational."""
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False

def ocr_document(file_bytes: bytes, filename: str) -> Tuple[str, int]:
    """Extracts text from PDF or image bytes.
    Returns (extracted_text, ocr_chars_count)."""
    ext = os.path.splitext(filename.lower())[1]
    text_chunks = []

    if ext == ".pdf":
        # Convert first 3 pages of PDF to images using pdf2image
        images = convert_from_bytes(file_bytes, first_page=1, last_page=3)
        for img in images:
            page_text = pytesseract.image_to_string(img, lang="eng")
            if page_text.strip():
                text_chunks.append(page_text.strip())
    else:
        # Load image via PIL
        import io
        img = Image.open(io.BytesIO(file_bytes))
        page_text = pytesseract.image_to_string(img, lang="eng")
        if page_text.strip():
            text_chunks.append(page_text.strip())

    full_text = "\n\n".join(text_chunks)
    # ocr_chars is non-whitespace character count
    ocr_chars = len("".join(c for c in full_text if not c.isspace()))
    return full_text, ocr_chars
