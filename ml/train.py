#!/usr/bin/env python3
"""Nine-Class KYC Document Classifier Training Pipeline.

Architecture per BRD v2.0 Section 16:
- Word TF-IDF (1 to 2 grams) + Character n-gram TF-IDF (3 to 5 grams, char_wb)
- Logistic Regression with probability calibration (CalibratedClassifierCV)
- Persisted to ml/models/classifier.joblib with ml/models/metadata.json
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion, Pipeline


def train_model(
    data_csv: str = "data/kyc/processed/kyc_classification.csv",
    output_dir: str = "ml/models",
    config_dir: str = "ml/config",
):
    print(f"Loading training data from {data_csv}...")
    df = pd.read_csv(data_csv)

    train_df = df[df["split"] == "train"]
    val_df = df[df["split"] == "val"]

    print(f"Loaded {len(train_df)} training samples and {len(val_df)} validation samples.")

    # Read classes from config
    classes_path = Path(config_dir) / "classes.json"
    with open(classes_path, "r", encoding="utf-8") as f:
        target_classes = json.load(f)

    print(f"Classes ({len(target_classes)}): {target_classes}")

    # Build Pipeline
    print("Constructing FeatureUnion (Word TF-IDF + Char-wb TF-IDF)...")
    word_vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=8000,
        sublinear_tf=True,
        strip_accents="unicode",
        lowercase=True,
    )

    char_vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=12000,
        sublinear_tf=True,
        lowercase=True,
    )

    features = FeatureUnion([
        ("word_tfidf", word_vectorizer),
        ("char_tfidf", char_vectorizer),
    ])

    base_clf = LogisticRegression(
        C=2.0,
        max_iter=1000,
        class_weight="balanced",
        solver="lbfgs",
        random_state=42,
    )

    # Wrap in calibrated classifier for reliable probabilities
    calibrated_clf = CalibratedClassifierCV(estimator=base_clf, method="sigmoid", cv=3)

    pipeline = Pipeline([
        ("features", features),
        ("classifier", calibrated_clf),
    ])

    print("Fitting model on training split...")
    X_train = train_df["text"].fillna("")
    y_train = train_df["label"]

    pipeline.fit(X_train, y_train)

    # Evaluate baseline validation accuracy
    X_val = val_df["text"].fillna("")
    y_val = val_df["label"]
    val_acc = pipeline.score(X_val, y_val)
    print(f"Validation Accuracy: {val_acc:.4f}")

    # Ensure output dir exists
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    # Save joblib model
    model_file = out_path / "classifier.joblib"
    joblib.dump(pipeline, model_file)
    print(f"Saved classifier model to {model_file}")

    # Save metadata
    metadata = {
        "model_version": "2.0.0",
        "trained_at": datetime.now().isoformat(),
        "classes": target_classes,
        "default_confidence_threshold": 0.65,
        "min_text_chars": 20,
        "train_samples_count": len(train_df),
        "val_samples_count": len(val_df),
        "validation_accuracy": round(float(val_acc), 4),
    }

    metadata_file = out_path / "metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_file}")


if __name__ == "__main__":
    train_model()
