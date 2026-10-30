# start-dev.ps1
# Automated Windows PowerShell Launcher for KYC & Loan Document Platform
# Starts ML Microservice (FastAPI), Express Backend API, and Next.js Frontend.

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   KYC & Loan Document Platform - Development Launcher   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check prerequisites
Write-Host "`n[1/4] Checking prerequisites..." -ForegroundColor Yellow

$nodeVer = node -v 2>$null
if (-not $nodeVer) {
    Write-Error "Node.js is not found in PATH. Please install Node.js (v20+)."
    exit 1
}
Write-Host "  + Node.js: $nodeVer" -ForegroundColor Green

$pythonVer = python --version 2>$null
if (-not $pythonVer) {
    Write-Error "Python is not found in PATH. Please install Python 3.11+."
    exit 1
}
Write-Host "  + Python: $pythonVer" -ForegroundColor Green

$tesseractVer = tesseract --version 2>$null
if ($tesseractVer) {
    Write-Host "  + Tesseract OCR: $($tesseractVer[0])" -ForegroundColor Green
} else {
    Write-Host "  ! Tesseract OCR not detected in PATH. OCR fallback modes will apply." -ForegroundColor Yellow
}

# 2. Check Backend Environment
Write-Host "`n[2/4] Verifying configuration..." -ForegroundColor Yellow
$backendEnvPath = Join-Path $PSScriptRoot "backend\.env"
if (-not (Test-Path $backendEnvPath)) {
    Write-Host "  ! backend\.env not found. Creating local development template..." -ForegroundColor Yellow
    @"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kyc_db"
JWT_SECRET="dev_insecure_jwt_secret_key_change_in_production_min_32_chars"
ML_SERVICE_URL="http://localhost:8000"
ML_SERVICE_KEY="dev-secret-internal-key"
PORT=4000
NODE_ENV="development"
"@ | Out-File -FilePath $backendEnvPath -Encoding UTF8
    Write-Host "  + backend\.env initialized." -ForegroundColor Green
} else {
    Write-Host "  + backend\.env found." -ForegroundColor Green
}

$frontendEnvPath = Join-Path $PSScriptRoot "frontend\.env.local"
if (-not (Test-Path $frontendEnvPath)) {
    @"
NEXT_PUBLIC_API_URL="http://localhost:4000"
"@ | Out-File -FilePath $frontendEnvPath -Encoding UTF8
    Write-Host "  + frontend\.env.local initialized." -ForegroundColor Green
}

# 3. Check ML Model Weights
$modelPath = Join-Path $PSScriptRoot "ml\models\classifier.joblib"
if (-not (Test-Path $modelPath)) {
    Write-Host "  ! Trained classifier model not found. Training model now..." -ForegroundColor Yellow
    python ml\train.py
}
Write-Host "  + ML model weights verified." -ForegroundColor Green

# 4. Launch Services in separate PowerShell processes
Write-Host "`n[3/4] Launching microservices..." -ForegroundColor Yellow

# A. ML Service (FastAPI) on port 8000
$mlCmd = "cd '$PSScriptRoot'; python -m uvicorn ml.service.main:app --host 0.0.0.0 --port 8000"
$mlProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting ML Microservice (FastAPI :8000)...' -ForegroundColor Magenta; $mlCmd" -PassThru
Write-Host "  -> ML Service started (PID: $($mlProc.Id)) on http://localhost:8000" -ForegroundColor Magenta

Start-Sleep -Seconds 2

# B. Express Backend API on port 4000
$backendCmd = "cd '$PSScriptRoot\backend'; node server.js"
$backendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Express Backend API (:4000)...' -ForegroundColor Green; $backendCmd" -PassThru
Write-Host "  -> Backend API started (PID: $($backendProc.Id)) on http://localhost:4000" -ForegroundColor Green

Start-Sleep -Seconds 2

# C. Next.js Frontend on port 3000
$frontendCmd = "cd '$PSScriptRoot\frontend'; npm run dev"
$frontendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Next.js Frontend (:3000)...' -ForegroundColor Cyan; $frontendCmd" -PassThru
Write-Host "  -> Frontend Portal started (PID: $($frontendProc.Id)) on http://localhost:3000" -ForegroundColor Cyan

Write-Host "`n[4/4] Platform is running!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Access Frontend Portal:  http://localhost:3000" -ForegroundColor White
Write-Host "  Access Backend API:      http://localhost:4000" -ForegroundColor White
Write-Host "  Access ML Microservice:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "To stop the platform, close the spawned PowerShell windows or run:" -ForegroundColor Yellow
Write-Host "  Stop-Process -Id $($mlProc.Id), $($backendProc.Id), $($frontendProc.Id)" -ForegroundColor Yellow
