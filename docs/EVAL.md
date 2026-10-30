# MODEL EVALUATION REPORT (BRD v2.0 - GATE 2)

**Evaluation Date:** 2026-10-30 15:24:07  
**Model Version:** 2.0.0  
**Algorithm:** Scikit-learn Pipeline (Word TF-IDF + Char-wb TF-IDF + Calibrated Logistic Regression)  
**Trained Classes:** Exactly 9 classes  
**Confidence Threshold:** 0.65  
**Min Text Chars (Unreadable rule):** 20  

---

## 1. Executive Summary & BRD Objective Compliance

| BRD Objective | Target | Achieved Result | Status |
| :--- | :--- | :--- | :--- |
| **O1: Macro F1 on Held-out Test Set** | $\ge 0.85$ | **0.9914** | **PASSED** |
| **O2: Hard-Negative Acceptance Rate** | $\le 10\%$ | **0.0\%** | **PASSED** |
| **O3: Low-Confidence Handling** | Returns `needs_review` | Validated below threshold (0.65) | **PASSED** |
| **O4: Overall Accuracy** | Benchmark reference | **99.15\%** | **PASSED** |
| **O5: Unreadable Documents (< 20 chars)** | Pre-model rule | Returns `unreadable` | **PASSED** |

---

## 2. Dataset Split & Template-Held-Out Distribution

All templates in the test split are strictly held out from training and validation to guarantee unbiased generalization measurement:

| Split | Number of Templates | Number of Samples | Share | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Train** | 27 (3 per class) | 270 | 60% | Model parameter learning |
| **Validation** | 9 (1 per class) | 63 | 15% | Threshold tuning |
| **Test (Held-out)** | 18 (2 per class) | 117 | 25% | Final evaluation only |
| **Total** | 54 templates | 450 | 100% | Full synthetic corpus |

---

## 3. Per-Class Classification Performance (Test Split)

| Class | Precision | Recall | F1-Score | Support |
| :--- | :--- | :--- | :--- | :--- |
| `aadhaar_card` | 0.929 | 1.000 | 0.963 | 13 |
| `pan_card` | 1.000 | 0.923 | 0.960 | 13 |
| `passport` | 1.000 | 1.000 | 1.000 | 13 |
| `voter_id` | 1.000 | 1.000 | 1.000 | 13 |
| `driving_licence` | 1.000 | 1.000 | 1.000 | 13 |
| `bank_statement` | 1.000 | 1.000 | 1.000 | 13 |
| `salary_slip` | 1.000 | 1.000 | 1.000 | 13 |
| `income_proof` | 1.000 | 1.000 | 1.000 | 13 |
| `other_unknown` | 1.000 | 1.000 | 1.000 | 13 |

**Summary Metrics:**
- **Macro Average F1:** 0.9914
- **Weighted Average F1:** 0.9914
- **Overall Accuracy:** 0.9915
- **Test Needs Review Rate:** 34.2%

---

## 4. Confusion Matrix

| Class | aadhaa | pan_ca | passpo | voter_ | drivin | bank_s | salary | income | other_ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **aadhaar_card** | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **pan_card** | 1 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **passport** | 0 | 0 | 13 | 0 | 0 | 0 | 0 | 0 | 0 |
| **voter_id** | 0 | 0 | 0 | 13 | 0 | 0 | 0 | 0 | 0 |
| **driving_licence** | 0 | 0 | 0 | 0 | 13 | 0 | 0 | 0 | 0 |
| **bank_statement** | 0 | 0 | 0 | 0 | 0 | 13 | 0 | 0 | 0 |
| **salary_slip** | 0 | 0 | 0 | 0 | 0 | 0 | 13 | 0 | 0 |
| **income_proof** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 | 0 |
| **other_unknown** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 |

---

## 5. End-to-End OCR Pipeline Verification (Rendered Documents)

| Filename | Expected | Predicted | Confidence | Outcome | OCR Chars | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `aadhaar_card_kyc_00001.png` | `aadhaar_card` | `aadhaar_card` | 0.8957 | `CLASSIFIED` | 143 | PASS |
| `aadhaar_card_kyc_00002.png` | `aadhaar_card` | `aadhaar_card` | 0.8649 | `CLASSIFIED` | 229 | PASS |
| `aadhaar_card_kyc_00003.png` | `aadhaar_card` | `aadhaar_card` | 0.8689 | `CLASSIFIED` | 226 | PASS |
| `aadhaar_card_kyc_00004.png` | `aadhaar_card` | `aadhaar_card` | 0.8522 | `CLASSIFIED` | 261 | PASS |
| `aadhaar_card_kyc_00005.png` | `aadhaar_card` | `aadhaar_card` | 0.8469 | `CLASSIFIED` | 265 | PASS |
| `bank_statement_kyc_00251.png` | `bank_statement` | `bank_statement` | 0.8956 | `CLASSIFIED` | 334 | PASS |
| `bank_statement_kyc_00252.png` | `bank_statement` | `bank_statement` | 0.8695 | `CLASSIFIED` | 283 | PASS |
| `bank_statement_kyc_00253.png` | `bank_statement` | `bank_statement` | 0.8932 | `CLASSIFIED` | 620 | PASS |
| `bank_statement_kyc_00254.png` | `bank_statement` | `bank_statement` | 0.8874 | `CLASSIFIED` | 619 | PASS |
| `bank_statement_kyc_00255.png` | `bank_statement` | `bank_statement` | 0.8878 | `CLASSIFIED` | 279 | PASS |

---

## 6. Model Governance & Retirement of Legacy Classifier

1. The new 9-class model achieves **Macro F1 of 0.9914**, exceeding the 0.85 requirement.
2. The legacy 5-class classifier is archived in `ml/legacy/` for backward reference.
3. Historical records with legacy class labels map to `other_unknown` or equivalent class without silent relabelling.
4. Model artifacts are persisted at `ml/models/classifier.joblib` with approved metadata at `ml/models/metadata.json`.
