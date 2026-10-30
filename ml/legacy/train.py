#!/usr/bin/env python3
"""
ml/train.py
Smart Document Classifier — Model Training Script

Usage:
  python train.py                         # Use data/processed/classification.csv
  python train.py --data path/to/data.csv
  python train.py --model distilbert      # Fine-tune DistilBERT (GPU recommended)

Trains:
  - TF-IDF + LogisticRegression (default, fast, CPU)
  - Optional: DistilBERT fine-tune (stretch goal)

Saves:
  models/tfidf.pkl
  models/classifier.pkl
  models/label_encoder.pkl
"""

import os
import sys
import pickle
import json
import argparse
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score
)
from sklearn.preprocessing import LabelEncoder
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings("ignore")

# ─── Config ───────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(SCRIPT_DIR, "models")
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data", "processed")

CLASSES = ["resume", "invoice", "research_paper", "lab_report", "college_notes"]

os.makedirs(MODELS_DIR, exist_ok=True)

# ─── Args ─────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--data", default=os.path.join(DATA_DIR, "classification.csv"))
parser.add_argument("--model", choices=["tfidf_logreg", "distilbert"], default="tfidf_logreg")
parser.add_argument("--test-size", type=float, default=0.2)
args = parser.parse_args()

# ─── Load Data ────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("🤖 Smart Document Classifier — Training Pipeline")
print(f"{'='*60}\n")

if not os.path.exists(args.data):
    print(f"❌ Data file not found: {args.data}")
    print("   Run: python ../data/generate_samples.py first\n")
    sys.exit(1)

df = pd.read_csv(args.data)
print(f"📊 Loaded {len(df)} samples from {args.data}")

# Validate columns
assert "text" in df.columns and "label" in df.columns, \
    "CSV must have 'text' and 'label' columns"

# Filter to valid classes
df = df[df["label"].isin(CLASSES)].dropna(subset=["text", "label"])
df["text"] = df["text"].astype(str).str.strip()
df = df[df["text"].str.len() > 20]  # remove empty texts

print(f"✅ After filtering: {len(df)} valid samples\n")
print("📈 Class distribution:")
print(df["label"].value_counts().to_string())
print()

if len(df) < 10:
    print("❌ Too few samples! Need at least 10. Run generate_samples.py.")
    sys.exit(1)

# ─── Train/Test Split ─────────────────────────────────────────────────────────
X = df["text"].values
y = df["label"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=args.test_size, random_state=42, stratify=y
)

print(f"📦 Train: {len(X_train)} | Test: {len(X_test)}")
print()

# ─── Train TF-IDF + LogisticRegression ───────────────────────────────────────
if args.model == "tfidf_logreg":
    print("🏋️  Training TF-IDF + LogisticRegression...")
    
    tfidf = TfidfVectorizer(
        max_features=20000,
        ngram_range=(1, 2),        # unigrams + bigrams
        sublinear_tf=True,         # log scaling
        min_df=2,
        max_df=0.95,
        strip_accents="unicode",
        analyzer="word",
        token_pattern=r"\b[a-zA-Z]{2,}\b",
    )
    
    clf = LogisticRegression(
    C=5.0,
    max_iter=1000,
    solver="lbfgs",
    random_state=42,
    class_weight="balanced",
)
    
    # Fit TF-IDF
    X_train_tfidf = tfidf.fit_transform(X_train)
    X_test_tfidf = tfidf.transform(X_test)
    
    # Cross-validation
    pipeline = Pipeline([("tfidf", tfidf), ("clf", clf)])
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X, y, cv=cv, scoring="accuracy")
    print(f"   5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    
    # Train final model
    clf.fit(X_train_tfidf, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test_tfidf)
    test_acc = accuracy_score(y_test, y_pred)
    
    print(f"\n📊 Test Accuracy: {test_acc:.4f} ({test_acc*100:.1f}%)")
    print(f"\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=CLASSES, zero_division=0))
    
    print("📊 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred, labels=CLASSES)
    cm_df = pd.DataFrame(cm, index=CLASSES, columns=[f"pred_{c[:4]}" for c in CLASSES])
    print(cm_df.to_string())
    
    # Save models
    with open(os.path.join(MODELS_DIR, "tfidf.pkl"), "wb") as f:
        pickle.dump(tfidf, f)
    with open(os.path.join(MODELS_DIR, "classifier.pkl"), "wb") as f:
        pickle.dump(clf, f)
    
    # Save metadata
    meta = {
        "model_type": "tfidf_logreg",
        "test_accuracy": round(test_acc, 4),
        "cv_accuracy_mean": round(cv_scores.mean(), 4),
        "cv_accuracy_std": round(cv_scores.std(), 4),
        "classes": CLASSES,
        "vocab_size": len(tfidf.vocabulary_),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
    }
    with open(os.path.join(MODELS_DIR, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)
    
    print(f"\n✅ Models saved to {MODELS_DIR}/")
    print(f"   tfidf.pkl ({len(tfidf.vocabulary_):,} vocab features)")
    print(f"   classifier.pkl (LogisticRegression)")
    print(f"   metadata.json\n")
    
    if test_acc < 0.80:
        print("⚠️  Accuracy < 80%. Try generating more training data.")
    elif test_acc >= 0.90:
        print("🎉 Excellent! Accuracy ≥ 90% achieved.")
    else:
        print("👍 Good accuracy. More data will improve further.")

# ─── Optional: DistilBERT Fine-tuning (Stretch Goal) ────────────────────────
elif args.model == "distilbert":
    print("🤗 Fine-tuning DistilBERT...")
    print("   Note: GPU strongly recommended. CPU will be very slow.")
    
    try:
        from transformers import (
            DistilBertTokenizer, DistilBertForSequenceClassification,
            TrainingArguments, Trainer
        )
        from torch.utils.data import Dataset
        import torch
        
        class DocDataset(Dataset):
            def __init__(self, texts, labels, tokenizer, label2id, max_len=256):
                self.texts = texts
                self.labels = [label2id[l] for l in labels]
                self.tokenizer = tokenizer
                self.max_len = max_len
            
            def __len__(self): return len(self.texts)
            
            def __getitem__(self, idx):
                enc = self.tokenizer(
                    self.texts[idx], max_length=self.max_len,
                    padding="max_length", truncation=True, return_tensors="pt"
                )
                return {
                    "input_ids": enc["input_ids"].squeeze(),
                    "attention_mask": enc["attention_mask"].squeeze(),
                    "labels": torch.tensor(self.labels[idx], dtype=torch.long),
                }
        
        label2id = {cls: i for i, cls in enumerate(CLASSES)}
        id2label = {i: cls for i, cls in enumerate(CLASSES)}
        
        tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
        model = DistilBertForSequenceClassification.from_pretrained(
            "distilbert-base-uncased", num_labels=len(CLASSES),
            id2label=id2label, label2id=label2id
        )
        
        train_ds = DocDataset(X_train.tolist(), y_train.tolist(), tokenizer, label2id)
        test_ds = DocDataset(X_test.tolist(), y_test.tolist(), tokenizer, label2id)
        
        bert_model_dir = os.path.join(MODELS_DIR, "distilbert")
        
        training_args = TrainingArguments(
            output_dir=bert_model_dir,
            num_train_epochs=3,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=16,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            logging_dir=os.path.join(MODELS_DIR, "logs"),
        )
        
        trainer = Trainer(
            model=model, args=training_args,
            train_dataset=train_ds, eval_dataset=test_ds,
        )
        
        trainer.train()
        model.save_pretrained(bert_model_dir)
        tokenizer.save_pretrained(bert_model_dir)
        print(f"\n✅ DistilBERT saved to {bert_model_dir}/")
        
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   pip install transformers torch")

print(f"\n{'='*60}")
print("Training complete! Run classify.py to test inference.")
print(f"{'='*60}\n")
