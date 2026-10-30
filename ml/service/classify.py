# ml/service/classify.py
"""Nine-Class KYC Classifier runtime inference module."""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import numpy as np

class ClassifierService:
    """Manages model loading and prediction lifecycle."""

    def __init__(self, model_dir: str = "ml/models"):
        self.model_dir = Path(model_dir)
        self.pipeline = None
        self.metadata = {}
        self.classes = []
        self.threshold = 0.65
        self.min_text_chars = 20
        self.loaded = False
        self.load_model()

    def load_model(self):
        model_file = self.model_dir / "classifier.joblib"
        meta_file = self.model_dir / "metadata.json"

        if not model_file.exists() or not meta_file.exists():
            print(f"Warning: Model artifacts not found in {self.model_dir}")
            self.loaded = False
            return

        try:
            self.pipeline = joblib.load(model_file)
            with open(meta_file, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

            self.classes = self.metadata.get("classes", [])
            self.threshold = float(os.environ.get(
                "CONFIDENCE_THRESHOLD",
                self.metadata.get("default_confidence_threshold", 0.65)
            ))
            self.min_text_chars = int(os.environ.get(
                "MIN_TEXT_CHARS",
                self.metadata.get("min_text_chars", 20)
            ))
            self.loaded = True
            print(f"Loaded 9-class classifier model v{self.metadata.get('model_version')} with threshold {self.threshold}")
        except Exception as e:
            print(f"Error loading classifier model: {e}")
            self.loaded = False

    def classify(self, text: str, ocr_chars: int) -> Dict[str, Any]:
        """Classifies extracted document text adhering strictly to BRD outcomes:
        - UNREADABLE: if ocr_chars < MIN_TEXT_CHARS
        - NEEDS_REVIEW: if max confidence < CONFIDENCE_THRESHOLD
        - CLASSIFIED: if confident prediction above threshold
        """
        if ocr_chars < self.min_text_chars:
            return {
                "class": None,
                "confidence": 0.0,
                "outcome": "UNREADABLE",
                "ocr_chars": ocr_chars,
            }

        if not self.loaded or self.pipeline is None:
            raise RuntimeError("Classifier model is not loaded")

        probs = self.pipeline.predict_proba([text])[0]
        max_idx = int(np.argmax(probs))
        max_conf = float(probs[max_idx])
        pred_class = str(self.pipeline.classes_[max_idx])

        if max_conf < self.threshold:
            return {
                "class": None,
                "confidence": round(max_conf, 4),
                "outcome": "NEEDS_REVIEW",
                "ocr_chars": ocr_chars,
            }

        return {
            "class": pred_class,
            "confidence": round(max_conf, 4),
            "outcome": "CLASSIFIED",
            "ocr_chars": ocr_chars,
        }
