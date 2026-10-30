#!/usr/bin/env python3
"""
ml/evaluate.py
Smart Document Classifier — Model Evaluation & Reporting

Usage:
  python evaluate.py                        # Use processed/classification.csv
  python evaluate.py --data path/to/csv
  python evaluate.py --confusion-matrix     # Show confusion matrix plot
"""

import os
import json
import pickle
import argparse
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, classification_report,
    confusion_matrix, roc_auc_score
)
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings("ignore")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(SCRIPT_DIR, "models")
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data", "processed")
CLASSES = ["resume", "invoice", "research_paper", "lab_report", "college_notes"]

parser = argparse.ArgumentParser()
parser.add_argument("--data", default=os.path.join(DATA_DIR, "classification.csv"))
parser.add_argument("--confusion-matrix", action="store_true")
parser.add_argument("--output-dir", default=MODELS_DIR)
args = parser.parse_args()

print(f"\n{'='*60}")
print("📊 Smart Document Classifier — Evaluation Report")
print(f"{'='*60}\n")

# ─── Load model ───────────────────────────────────────────────────────────────
clf_path = os.path.join(MODELS_DIR, "classifier.pkl")
tfidf_path = os.path.join(MODELS_DIR, "tfidf.pkl")

if not (os.path.exists(clf_path) and os.path.exists(tfidf_path)):
    print("❌ No trained model found. Run: python train.py first\n")
    exit(1)

with open(tfidf_path, "rb") as f: tfidf = pickle.load(f)
with open(clf_path, "rb") as f: clf = pickle.load(f)
print("✅ Model loaded from models/")

# Load metadata
meta_path = os.path.join(MODELS_DIR, "metadata.json")
if os.path.exists(meta_path):
    with open(meta_path) as f: meta = json.load(f)
    print(f"   Model type: {meta.get('model_type', 'unknown')}")
    print(f"   Vocab size: {meta.get('vocab_size', '?'):,}")
    print(f"   Trained on: {meta.get('train_samples', '?')} samples\n")

# ─── Load data ────────────────────────────────────────────────────────────────
if not os.path.exists(args.data):
    print(f"❌ Data not found: {args.data}\n")
    exit(1)

df = pd.read_csv(args.data)
df = df[df["label"].isin(CLASSES)].dropna(subset=["text", "label"])
df["text"] = df["text"].astype(str)
df = df[df["text"].str.len() > 20]

print(f"📊 Dataset: {len(df)} samples")
for cls in CLASSES:
    count = (df["label"] == cls).sum()
    bar = "█" * (count // 5) 
    print(f"   {cls:<20}: {count:>4} {bar}")
print()

X, y = df["text"].values, df["label"].values
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ─── Predictions ──────────────────────────────────────────────────────────────
X_test_tfidf = tfidf.transform(X_test)
y_pred = clf.predict(X_test_tfidf)
y_proba = clf.predict_proba(X_test_tfidf)

# ─── Metrics ──────────────────────────────────────────────────────────────────
acc = accuracy_score(y_test, y_pred)
report = classification_report(y_test, y_pred, target_names=CLASSES, zero_division=0, output_dict=True)
report_str = classification_report(y_test, y_pred, target_names=CLASSES, zero_division=0)

print(f"🎯 Overall Accuracy: {acc:.4f} ({acc*100:.1f}%)")
print()
print("📋 Per-Class Report:")
print(report_str)

# ─── Per-class detail ─────────────────────────────────────────────────────────
print("📈 Per-Class Summary:")
print(f"{'Class':<22} {'Precision':>10} {'Recall':>8} {'F1':>6} {'Support':>9}")
print("─" * 60)
for cls in CLASSES:
    if cls in report:
        r = report[cls]
        bar_f1 = "▓" * int(r['f1-score'] * 20)
        print(f"  {cls:<20} {r['precision']:>9.3f} {r['recall']:>8.3f} {r['f1-score']:>6.3f} {int(r['support']):>9} {bar_f1}")

print()
print(f"  {'Macro avg':<20} {report['macro avg']['precision']:>9.3f} "
      f"{report['macro avg']['recall']:>8.3f} "
      f"{report['macro avg']['f1-score']:>6.3f}")
print(f"  {'Weighted avg':<20} {report['weighted avg']['precision']:>9.3f} "
      f"{report['weighted avg']['recall']:>8.3f} "
      f"{report['weighted avg']['f1-score']:>6.3f}")

# ─── Error analysis ───────────────────────────────────────────────────────────
print(f"\n🔍 Error Analysis ({len(y_test) - sum(y_test == y_pred)} misclassified of {len(y_test)}):")
errors = [(y_test[i], y_pred[i], X_test[i][:100]) for i in range(len(y_test)) if y_test[i] != y_pred[i]]
if errors:
    for true, pred, text in errors[:5]:
        print(f"   True: {true:<20} → Pred: {pred}")
        print(f"   Text: {text!r}...\n")
else:
    print("   🎉 No errors on test set!\n")

# ─── Confusion matrix plot ────────────────────────────────────────────────────
if args.confusion_matrix:
    cm = confusion_matrix(y_test, y_pred, labels=CLASSES)
    short_labels = [c[:8] for c in CLASSES]
    
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=short_labels, yticklabels=short_labels, ax=ax)
    ax.set_xlabel("Predicted", fontsize=12)
    ax.set_ylabel("True", fontsize=12)
    ax.set_title(f"Confusion Matrix (Accuracy: {acc*100:.1f}%)", fontsize=14)
    plt.tight_layout()
    
    plot_path = os.path.join(args.output_dir, "confusion_matrix.png")
    plt.savefig(plot_path, dpi=150, bbox_inches="tight")
    print(f"\n📊 Confusion matrix saved: {plot_path}")
    plt.close()

# ─── Save eval report ─────────────────────────────────────────────────────────
eval_data = {
    "accuracy": round(acc, 4),
    "per_class": {cls: report[cls] for cls in CLASSES if cls in report},
    "macro_f1": round(report["macro avg"]["f1-score"], 4),
    "weighted_f1": round(report["weighted avg"]["f1-score"], 4),
    "test_samples": len(X_test),
    "errors": len(errors),
}
with open(os.path.join(args.output_dir, "eval_report.json"), "w") as f:
    json.dump(eval_data, f, indent=2)

print(f"\n💾 Eval report saved: models/eval_report.json")

# ─── Verdict ──────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
if acc >= 0.92:
    print(f"🏆 EXCELLENT! Accuracy = {acc*100:.1f}% — Production ready!")
elif acc >= 0.85:
    print(f"✅ GOOD. Accuracy = {acc*100:.1f}% — Add more data to improve.")
elif acc >= 0.75:
    print(f"⚠️  FAIR. Accuracy = {acc*100:.1f}% — Needs more training data.")
else:
    print(f"❌ LOW. Accuracy = {acc*100:.1f}% — Run generate_samples.py with --samples 200")
print(f"{'='*60}\n")
