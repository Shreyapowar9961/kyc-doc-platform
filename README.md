# KYC & Loan Document Platform (BRD v2.0)

[![Build & Tests](https://img.shields.io/badge/tests-22%2F22%20passing-brightgreen)](#)
[![Macro F1](https://img.shields.io/badge/ML%20Macro%20F1-0.9914-blue)](#)
[![Extraction Accuracy](https://img.shields.io/badge/PAN%20%2F%20Aadhaar%20Extraction-%3E92%25-teal)](#)
[![RBAC](https://img.shields.io/badge/RBAC-6%20Roles%20Enforced-indigo)](#)

Enterprise loan onboarding and identity document verification platform built strictly according to **BRD v2.0**. Features a 9-class offline machine learning document classifier, automated regex entity extraction, multi-document fuzzy cross-checks, officer review queues, private cloud storage with authenticated streaming, and an append-only audit trail.

---

## 🏛️ System Architecture

The platform follows a three-tier decoupled architecture:

```
[ Next.js 16 Client ]
       │  (Bearer JWT)
       ▼
[ Express API Server (Node 22) ] ──── [ PostgreSQL via Prisma ORM ]
       │                    │
       │ (Private Token)    │ (Service Key)
       ▼                    ▼
[ FastAPI ML Service ]   [ Supabase Private Storage ]
  • Tesseract OCR          • Authenticated Express Streaming
  • 9-Class Classifier     • No Public URL Exposure
  • Regex Extraction
```

---

## 🚀 Key Capabilities

### 1. 9-Class Offline Document Classifier (Release 1)
* **Pipeline:** Dual Word (1–2 n-grams) & Character-wb (3–5 n-grams) TF-IDF representations with Calibrated Logistic Regression.
* **Classes:**
  1. `aadhaar_card`
  2. `pan_card`
  3. `passport`
  4. `voter_id`
  5. `driving_licence`
  6. `bank_statement`
  7. `salary_slip`
  8. `income_proof`
  9. `other_unknown`
* **Performance:** **Macro F1 = 0.9914** (BRD threshold $\ge 0.85$), **Hard-Negative Acceptance = 0.0%** ($\le 10\%$). Full report in [`docs/EVAL.md`](docs/EVAL.md).
* **Outcome Routing:** Low OCR character count ($<30$) routes to `unreadable`. Low confidence ($<0.70$) routes to `needs_review`. High confidence routes to `classified`.

### 2. Privacy & Data Protection Safeguards
* **Zero Raw Aadhaar:** Raw 12-digit Aadhaar numbers are never persisted in the database, API responses, or logs. Strictly masked format `XXXX-XXXX-1234` is enforced.
* **Private Storage Streaming:** Replaced legacy static `/uploads` with private Supabase bucket storage (with local fallback). Files are streamed exclusively through authenticated Express route `GET /documents/:id/file` with full ownership verification.
* **Credential Masking:** Database connection URLs are masked in logs; sensitive environment variables are strictly protected.

### 3. Automated Cross-Checks & Severity Flags (Release 2)
* **Regex Extraction:** PAN (94.8% accuracy), Masked Aadhaar (92.0% accuracy), Full Name, and Date of Birth (DOB).
* **Cross-Document Consistency:**
  - **Fuzzy Name Matching:** Token-sort fuzzy comparison (threshold 80). Discrepancies generate a `CRITICAL` severity check (`NAME_MISMATCH`).
  - **Exact DOB Matching:** Normalized `YYYY-MM-DD` comparison. Mismatches generate a `CRITICAL` severity check (`DOB_MISMATCH`).
  - **Document Completeness:** Lack of minimum identity pairs generates a `WARNING` severity check.

### 4. Officer Review Workflow & Queues
* Staff portal (`OFFICER`, `MANAGER`, `FRAUD_ANALYST`) to inspect submitted applications, view high-resolution document previews, inspect severity check flags, and record auditable recommendations:
  - `APPROVE`
  - `REJECT`
  - `NEED_MORE_DOCUMENTS`

### 5. Role-Based Access Control (RBAC) Matrix
Six granular roles enforced strictly in backend middleware:
* `APPLICANT`: Draft and submit loan applications, upload 1–15 documents, view own files.
* `OFFICER`: Review submitted applications, inspect flags, make recommendations.
* `MANAGER`: Higher-tier review access across department queues.
* `FRAUD_ANALYST`: Specialized review of flagged applications and identity mismatches.
* `AUDITOR`: Read-only access to system-wide append-only audit trail and document metadata.
* `ADMIN`: Manage user roles and system privileges.

---

## 💻 Windows PowerShell Quickstart

### Prerequisites
* **Node.js:** v20.x or v22.x
* **Python:** 3.11.x
* **Tesseract OCR:** 5.x in Windows PATH
* **Git:** Windows Git

### 1-Click Dev Launcher
```powershell
# Clone and enter repo
git clone https://github.com/Shreyapowar9961/kyc-doc-platform.git
cd kyc-doc-platform

# Run the automated dev launcher (starts ML Service, Express API, Next.js frontend)
.\start-dev.ps1
```

Once running, navigate to:
* **Frontend Portal:** [http://localhost:3000](http://localhost:3000)
* **Backend API:** [http://localhost:4000](http://localhost:4000)
* **ML Microservice Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Automated Test Suites

### Backend API & Security Tests (Jest / Supertest)
```powershell
cd backend
npm test
```
*Result: 22 / 22 test suites passed.*

### Python Generator & Extraction Tests (Pytest)
```powershell
pytest tests/ -v
```
*Result: All generator and extraction tests passed.*

---

## 📁 Repository Structure

```
├── backend/                  # Node 22 + Express API + Prisma ORM
│   ├── lib/                  # Storage, ML client, Audit, Cross-check engine
│   ├── middleware/           # JWT Auth & 6-Role RBAC Ownership
│   ├── prisma/               # Schema & Additive Migration (add_applications)
│   ├── routes/               # /auth, /applications, /documents, /history, /admin
│   └── tests/                # 22-test automated regression & security suite
├── frontend/                 # Next.js 16 (React 18, Tailwind CSS, TypeScript)
│   ├── app/                  # App Router: /, /login, /register, /applications, /officer, /history, /admin
│   ├── components/           # Role-based Header and UI elements
│   └── lib/api.ts            # Type-safe API client & token storage
├── ml/                       # Python 3.11 ML Service & Classification Pipeline
│   ├── config/               # Class registry & Purpose mapping
│   ├── models/               # Trained pipeline (classifier.joblib)
│   └── service/              # FastAPI runtime: OCR, Classification, Extraction
├── data/                     # Synthetic KYC Generator
│   ├── kyc_gen/              # Generator engine: templates, fake identities, noise
│   └── generate_kyc_samples.py # CLI for generating synthetic splits
├── docs/                     # Engineering Deliverables
│   ├── EVAL.md               # Gate 2: ML Evaluation Report (F1 = 0.9914)
│   ├── STATUS.md             # Gate 3: BRD Compliance & Requirements Matrix
│   ├── DECISIONS.md          # Architectural Decision Records (ADRs)
│   └── ROADMAP.md            # Gate 5: R3 & Future Enhancements
└── start-dev.ps1             # Automated Windows PowerShell startup script
```

---

## 📖 Key Documentation Links

* [`docs/EVAL.md`](docs/EVAL.md) — 9-Class ML Evaluation, F1 Scores, Confusion Matrix & Confidence Calibration.
* [`docs/STATUS.md`](docs/STATUS.md) — BRD v2.0 Compliance Matrix, Implemented vs Deferred Features.
* [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architecture & Privacy Decision Records (ADRs).
* [`docs/ROADMAP.md`](docs/ROADMAP.md) — Out-of-Scope R3 Specifications (Forgery, Graph Fraud Rings, AI Assistant).
* [`SETUP.md`](SETUP.md) — Step-by-step Windows setup and environment configuration.
