#!/usr/bin/env python3
"""
backend/scripts/classify.py
Smart Document Classifier - ML Pipeline (Optimized)
"""

import sys
import os
import json
import argparse
import traceback
import warnings
warnings.filterwarnings("ignore")

import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# ----------------------------------------------------------------
# CLI Arguments
# ----------------------------------------------------------------
parser = argparse.ArgumentParser(description="Classify a document")
parser.add_argument("file_path", help="Path to PDF or image file")
parser.add_argument("--manual-class", help="Override predicted class", default=None)
args = parser.parse_args()

FILE_PATH = args.file_path
MANUAL_CLASS = args.manual_class

VALID_CLASSES = ["resume", "invoice", "research_paper", "lab_report", "college_notes"]
MODELS_DIR = os.path.join(os.path.dirname(__file__), "../../ml/models")
POPPLER_PATH = r"C:\Program Files\poppler-25.12.0\Library\bin"

# ----------------------------------------------------------------
# Pre-load heavy models at startup (once per process)
# ----------------------------------------------------------------
_tfidf = None
_clf = None
_embedder = None

def load_models():
    global _tfidf, _clf, _embedder

    # Load TF-IDF + classifier
    classifier_path = os.path.join(MODELS_DIR, "classifier.pkl")
    tfidf_path = os.path.join(MODELS_DIR, "tfidf.pkl")
    if os.path.exists(classifier_path) and os.path.exists(tfidf_path):
        try:
            import pickle
            with open(tfidf_path, "rb") as f:
                _tfidf = pickle.load(f)
            with open(classifier_path, "rb") as f:
                _clf = pickle.load(f)
        except Exception:
            pass

    # Load BERT embedding model
    try:
        from sentence_transformers import SentenceTransformer
        cache_dir = os.path.join(MODELS_DIR, "sentence_transformer")
        if os.path.exists(cache_dir):
            _embedder = SentenceTransformer(cache_dir)
        else:
            _embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    except Exception:
        pass

# Load everything immediately at script start
load_models()


def output_error(msg: str):
    print(json.dumps({
        "class": "college_notes",
        "confidence": 0.0,
        "text": "",
        "embedding": [0.0] * 384,
        "page_count": 1,
        "error": msg
    }))
    sys.exit(0)


# ----------------------------------------------------------------
# Step 1: OCR - Extract Text
# ----------------------------------------------------------------
def extract_text(file_path: str):
    ext = os.path.splitext(file_path)[1].lower()
    page_count = 1

    try:
        if ext == ".pdf":
            # ✅ Try pdfplumber FIRST (instant for digital PDFs, no OCR needed)
            try:
                import pdfplumber
                with pdfplumber.open(file_path) as pdf:
                    page_count = len(pdf.pages)
                    texts = [p.extract_text() or "" for p in pdf.pages[:5]]  # max 5 pages
                combined = "\n\n".join(texts).strip()
                if len(combined) > 100:  # Digital PDF with real text
                    return combined, page_count
                # Fall through to OCR if no text found (scanned PDF)
            except Exception:
                pass

            # Fallback: OCR with reduced DPI for speed
            try:
                from pdf2image import convert_from_path
                from PIL import Image
                pages = convert_from_path(
                    file_path,
                    dpi=150,           # ✅ Reduced from 200 → 150 (much faster)
                    poppler_path=POPPLER_PATH,
                    first_page=1,
                    last_page=3,       # ✅ Max 3 pages instead of 10
                    thread_count=2,    # ✅ Use 2 threads
                )
                page_count = len(pages)
                texts = []
                for page in pages:
                    # ✅ Resize large pages before OCR
                    w, h = page.size
                    if w > 1200:
                        page = page.resize((1200, int(h * 1200 / w)))
                    text = pytesseract.image_to_string(page, config="--psm 3 --oem 1")
                    texts.append(text)
                return "\n\n".join(texts), page_count

            except ImportError:
                return output_error("pdf2image/pdfplumber not installed.")

        else:
            # Image file
            from PIL import Image
            img = Image.open(file_path)
            # ✅ Resize large images before OCR
            w, h = img.size
            if w > 1200:
                img = img.resize((1200, int(h * 1200 / w)))
            text = pytesseract.image_to_string(img, config="--psm 3 --oem 1")
            return text, 1

    except Exception as e:
        return output_error(f"OCR failed: {e}")


# ----------------------------------------------------------------
# Step 2: Classify Text
# ----------------------------------------------------------------
def classify_text(text: str):
    if MANUAL_CLASS and MANUAL_CLASS in VALID_CLASSES:
        return MANUAL_CLASS, 1.0

    # Use pre-loaded models
    if _tfidf is not None and _clf is not None:
        try:
            clean_text = text.strip()[:5000]
            X = _tfidf.transform([clean_text])
            pred = _clf.predict(X)[0]
            proba = _clf.predict_proba(X)[0]
            confidence = float(proba.max())
            return pred, confidence
        except Exception:
            pass

    # Fallback: keyword rules
    text_lower = text.lower()
    scores = {
        "resume": 0.0,
        "invoice": 0.0,
        "research_paper": 0.0,
        "lab_report": 0.0,
        "college_notes": 0.0,
    }

    resume_kw = ["experience", "education", "skills", "objective", "summary",
                 "employment", "work history", "curriculum vitae", "cv", "linkedin",
                 "references", "achievements", "certifications", "gpa", "internship"]
    invoice_kw = ["invoice", "bill to", "payment due", "total amount", "subtotal",
                  "tax", "gst", "qty", "quantity", "unit price", "invoice no",
                  "purchase order", "vendor", "billing address", "amount due"]
    research_kw = ["abstract", "introduction", "methodology", "conclusion", "references",
                   "literature review", "hypothesis", "experiment", "results", "discussion",
                   "doi", "published", "journal", "conference", "arxiv", "ieee"]
    lab_kw = ["lab report", "experiment", "procedure", "observation", "result",
              "apparatus", "materials", "hypothesis", "data table", "graph",
              "error analysis", "conclusion", "aim", "objective", "practical"]
    notes_kw = ["chapter", "unit", "lecture", "notes", "definition", "example",
                "theorem", "proof", "assignment", "homework", "syllabus",
                "topic", "module", "semester", "class notes"]

    for kw in resume_kw:
        if kw in text_lower: scores["resume"] += 1
    for kw in invoice_kw:
        if kw in text_lower: scores["invoice"] += 1
    for kw in research_kw:
        if kw in text_lower: scores["research_paper"] += 1
    for kw in lab_kw:
        if kw in text_lower: scores["lab_report"] += 1
    for kw in notes_kw:
        if kw in text_lower: scores["college_notes"] += 1

    best_class = max(scores, key=scores.get)
    total = sum(scores.values()) or 1
    confidence = scores[best_class] / total
    confidence = max(0.45, min(0.95, confidence))
    return best_class, confidence


# ----------------------------------------------------------------
# Step 3: Generate Embedding
# ----------------------------------------------------------------
def generate_embedding(text: str):
    # Use pre-loaded embedder
    if _embedder is not None:
        try:
            clean_text = text.strip()[:512]
            embedding = _embedder.encode(clean_text, normalize_embeddings=True)
            return embedding.tolist()
        except Exception:
            pass

    # Fallback: TF-IDF based embedding
    if _tfidf is not None:
        try:
            import numpy as np
            vec = _tfidf.transform([text[:5000]]).toarray()[0]
            if len(vec) >= 384:
                return vec[:384].tolist()
            else:
                padded = np.zeros(384)
                padded[:len(vec)] = vec
                return padded.tolist()
        except Exception:
            pass

    # Last resort: deterministic random
    import hashlib
    import numpy as np
    seed = int(hashlib.md5(text[:200].encode()).hexdigest(), 16) % (2**32)
    rng = np.random.default_rng(seed)
    return rng.normal(0, 0.1, 384).tolist()


# ----------------------------------------------------------------
# Main
# ----------------------------------------------------------------
def main():
    if not os.path.exists(FILE_PATH):
        return output_error(f"File not found: {FILE_PATH}")

    text, page_count = extract_text(FILE_PATH)

    if not text or len(text.strip()) < 20:
        text = "[No readable text found - image may be low quality or blank]"

    doc_class, confidence = classify_text(text)
    embedding = generate_embedding(text)

    result = {
        "class": doc_class,
        "confidence": round(confidence, 4),
        "text": text.strip()[:10000],
        "embedding": embedding,
        "page_count": page_count,
        "error": None,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        output_error(f"Unexpected error: {traceback.format_exc()}")