# tests/test_ml_service.py
"""Unit tests for FastAPI ML Microservice."""

import io
import sys
from pathlib import Path
import pytest

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from PIL import Image

from ml.service.main import app, INTERNAL_KEY

@pytest.fixture
def client():
    return TestClient(app)

def test_ml_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["tesseract_available"] is True
    assert len(data["classes"]) == 9

def test_classify_auth_required(client):
    res = client.post("/classify")
    assert res.status_code in (401, 422)

def test_classify_pan_image(client):
    img_path = Path("data/kyc/demo_set/clean_pan.png")
    if not img_path.exists():
        pytest.skip("Rendered PAN demo image not found")

    with open(img_path, "rb") as f:
        res = client.post(
            "/classify",
            files={"file": ("clean_pan.png", f, "image/png")},
            headers={"x-internal-key": INTERNAL_KEY}
        )
    assert res.status_code == 200
    data = res.json()
    assert data["outcome"] == "CLASSIFIED"
    assert data["class"] == "pan_card"
    assert data["confidence"] >= 0.65
    assert data["ocr_chars"] > 50

def test_classify_unreadable_outcome(client):
    # Blank image with no text -> < 20 chars -> UNREADABLE
    blank = Image.new("RGB", (200, 200), (255, 255, 255))
    buf = io.BytesIO()
    blank.save(buf, format="PNG")
    buf.seek(0)

    res = client.post(
        "/classify",
        files={"file": ("blank.png", buf, "image/png")},
        headers={"x-internal-key": INTERNAL_KEY}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["outcome"] == "UNREADABLE"
    assert data["class"] is None

def test_extract_fields(client):
    text = (
        "INCOME TAX DEPARTMENT\nGOVT. OF INDIA\n"
        "Permanent Account Number Card\nABCDE1234F\n"
        "Name: SURESH GUPTA\n"
        "Date of Birth: 14/08/1990\n"
    )
    res = client.post(
        "/extract",
        json={"text": text, "doc_class": "pan_card"},
        headers={"x-internal-key": INTERNAL_KEY}
    )
    assert res.status_code == 200
    fields = res.json()["fields"]
    assert fields["pan"] == "ABCDE1234F"
    assert fields["name"] == "SURESH GUPTA"
    assert fields["dob"] == "1990-08-14"
