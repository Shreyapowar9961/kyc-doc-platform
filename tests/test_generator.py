# tests/test_generator.py
"""Unit tests for KYC synthetic data generator."""

import csv
import json
import random
import re
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from data.kyc_gen.fake import (
    SyntheticDataGenerator,
    compute_verhoeff_checksum,
    validate_verhoeff_checksum,
)
from data.kyc_gen.registry import CLASSES, TEMPLATE_REGISTRY

def test_verhoeff_checksum():
    """Verify Verhoeff checksum algorithm correctness."""
    # Test valid calculation
    num = "01234567890"
    c = compute_verhoeff_checksum(num)
    assert 0 <= c <= 9
    assert validate_verhoeff_checksum(f"{num}{c}") is True
    # Test mutation detection
    assert validate_verhoeff_checksum(f"{num}{(c + 1) % 10}") is False

def test_synthetic_data_fictional_rules():
    """Verify strictly fictional IFSC, fictional Aadhaar, and valid PAN formats."""
    rng = random.Random(1234)
    fake = SyntheticDataGenerator(rng)

    for _ in range(50):
        # 1. Fictional IFSC check
        ifsc = fake.ifsc_code()
        assert ifsc.startswith("FAKE000"), f"IFSC code must start with FAKE000: {ifsc}"
        assert len(ifsc) == 11

        # 2. Synthetic Aadhaar check (must start with 0 or 1)
        raw_aadhaar, masked_aadhaar = fake.synthetic_aadhaar()
        assert raw_aadhaar[0] in ('0', '1'), f"Synthetic Aadhaar must start with 0 or 1: {raw_aadhaar}"
        assert len(raw_aadhaar) == 12
        assert validate_verhoeff_checksum(raw_aadhaar) is True
        assert masked_aadhaar.startswith("XXXX-XXXX-")
        assert len(masked_aadhaar) == 14

        # 3. PAN regex check
        pan = fake.pan_number()
        assert re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", pan), f"Invalid PAN format: {pan}"

def test_generator_determinism():
    """Verify generator output is 100% deterministic with the same seed."""
    rng1 = random.Random(42)
    fake1 = SyntheticDataGenerator(rng1)
    sample1 = [fake1.full_name(), fake1.pan_number(), fake1.synthetic_aadhaar()]

    rng2 = random.Random(42)
    fake2 = SyntheticDataGenerator(rng2)
    sample2 = [fake2.full_name(), fake2.pan_number(), fake2.synthetic_aadhaar()]

    assert sample1 == sample2

def test_dataset_split_and_template_isolation():
    """Verify generated dataset split balance and strict template isolation."""
    csv_path = Path("data/kyc/processed/kyc_classification.csv")
    if not csv_path.exists():
        pytest.skip("Dataset CSV not generated yet")

    with open(csv_path, encoding="utf-8") as f:
        reader = list(csv.DictReader(f))

    assert len(reader) > 0

    train_templates = set()
    val_templates = set()
    test_templates = set()
    class_counts = {}

    for row in reader:
        cls = row["label"]
        tmpl = row["template_id"]
        split = row["split"]

        class_counts[cls] = class_counts.get(cls, 0) + 1

        if split == "train":
            train_templates.add(tmpl)
        elif split == "val":
            val_templates.add(tmpl)
        elif split == "test":
            test_templates.add(tmpl)

    # Verify all 9 classes present and balanced
    for cls in CLASSES:
        assert cls in class_counts, f"Missing class {cls}"
        assert class_counts[cls] == class_counts[CLASSES[0]], f"Imbalanced class counts for {cls}"

    # Strict template hold-out verification: test templates must NEVER appear in train or val
    test_in_train = test_templates.intersection(train_templates)
    test_in_val = test_templates.intersection(val_templates)
    train_in_val = train_templates.intersection(val_templates)

    assert len(test_in_train) == 0, f"Leak detected! Held-out test templates in train: {test_in_train}"
    assert len(test_in_val) == 0, f"Leak detected! Held-out test templates in val: {test_in_val}"
    assert len(train_in_val) == 0, f"Leak detected! Train templates in val: {train_in_val}"
