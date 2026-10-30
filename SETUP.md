# Setup & Deployment Guide (Windows PowerShell)

**Platform:** KYC & Loan Document Platform (BRD v2.0)  
**Target Environment:** Windows 10 / 11, PowerShell 5.1 or 7+

---

## 1. System Prerequisites

Before running the application, ensure the following tools are installed on your Windows machine:

1. **Node.js (v20+ or v22+):**  
   Download from [nodejs.org](https://nodejs.org/) or install via winget:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```

2. **Python (3.11.x):**  
   Download from [python.org](https://www.python.org/) or install via winget:
   ```powershell
   winget install Python.Python.3.11
   ```

3. **Tesseract OCR (v5.x):**  
   Download the Windows installer from [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) and ensure `C:\Program Files\Tesseract-OCR` is added to your system `PATH`.
   ```powershell
   # Verify in PowerShell:
   tesseract --version
   ```

---

## 2. Initial Setup

### Step A: Clone the Repository
```powershell
git clone https://github.com/Shreyapowar9961/kyc-doc-platform.git
cd kyc-doc-platform
```

### Step B: Python Dependencies & Model Initialization
```powershell
# 1. Install required Python packages
pip install -r ml/requirements.txt
# or install individually:
pip install fastapi uvicorn scikit-learn pytesseract pdf2image pillow python-multipart pytest

# 2. Train and evaluate the 9-class ML classifier
python ml/train.py
python ml/evaluate.py
```

### Step C: Backend API & Database Setup
```powershell
cd backend

# 1. Install Node.js packages
npm install

# 2. Configure environment file (backend/.env)
# Create backend/.env with your Neon PostgreSQL URL or local database:
@"
DATABASE_URL="postgresql://user:password@ep-something.neon.tech/kyc_db?sslmode=require"
JWT_SECRET="production_or_dev_secret_key_minimum_32_characters_long"
ML_SERVICE_URL="http://localhost:8000"
ML_SERVICE_KEY="dev-secret-internal-key"
PORT=4000
NODE_ENV="development"
"@ | Out-File -FilePath .env -Encoding UTF8

# 3. Generate Prisma Client
npx prisma generate

# 4. Apply the additive migration to your database:
npx prisma migrate deploy

# 5. Run automated backend tests to verify health:
npm test
cd ..
```

### Step D: Frontend Setup
```powershell
cd frontend

# 1. Install frontend dependencies
npm install

# 2. Build production assets
npm run build
cd ..
```

---

## 3. Running the Platform

### Option 1: Automated 1-Click Launcher (Recommended)
From the root repository directory:
```powershell
.\start-dev.ps1
```
This script launches the Python ML microservice (port 8000), the Express API (port 4000), and the Next.js development server (port 3000) in separate PowerShell processes.

### Option 2: Manual Multi-Terminal Startup

#### Terminal 1 — Python ML Microservice
```powershell
python -m uvicorn ml.service.main:app --host 0.0.0.0 --port 8000
```

#### Terminal 2 — Express API Server
```powershell
cd backend
node server.js
```

#### Terminal 3 — Next.js Frontend
```powershell
cd frontend
npm run dev
```

---

## 4. Default Seed & Demo User Accounts

When testing the platform, you can register via `/register` as an applicant, or promote existing accounts to other roles using `/admin/users`:

| Role | Default Email | Initial Capabilities |
| :--- | :--- | :--- |
| `APPLICANT` | applicant@demo.local | Upload KYC files, view classification badges, submit application |
| `OFFICER` | officer@demo.local | View submitted queue, review cross-check flags, submit recommendation |
| `MANAGER` | manager@demo.local | Staff queue overview and escalation review |
| `FRAUD_ANALYST`| fraud@demo.local | Inspect identity discrepancies and flagged cross-checks |
| `AUDITOR` | auditor@demo.local | Read-only access to immutable audit log |
| `ADMIN` | admin@demo.local | Manage user roles and system privileges |

---

## 5. Security & Verification Checks

Before pushing or deploying:
```powershell
# 1. Verify zero secrets leaked in git tracking:
git status --short | Select-String "\.env$|\.db|uploads/|venv/|\.bak|\.backup"

# 2. Run backend regression and RBAC test suite:
cd backend
npm test

# 3. Run Python unit tests:
cd ..
pytest tests/ -v
```
