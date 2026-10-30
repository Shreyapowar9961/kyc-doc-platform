# Architectural & Technical Decision Record (ADR)

**Project:** KYC & Loan Document Platform  
**Target Architecture:** BRD v2.0  
**Date:** October 30, 2026  
**Status:** Approved & Enforced

---

## 1. Context & Overview

The KYC & Loan Document Platform provides automated document intake, 9-class offline machine learning classification, regex field extraction, multi-document cross-checks, officer review queues, and enterprise RBAC/audit compliance.

This document records the architectural, security, and algorithmic decisions implemented during execution.

---

## 2. Key Architecture Decisions

### ADR-001: Three-Tier Service Separation
* **Decision:** Decouple the browser client (Next.js), Express API (Node 22), and ML Microservice (FastAPI + Python 3.11).
* **Rationale:** OCR processing (Tesseract) and scikit-learn inference are CPU-bound and best managed in a dedicated Python microservice with internal bearer authentication (`X-Internal-Key`). The Express backend remains lightweight, non-blocking, and dedicated to business logic, authorization, database transactions, and file streaming.
* **Security:** The Python ML service is strictly internal; no direct browser access is permitted.

### ADR-002: Additive-Only Database Evolution
* **Decision:** Enforce strictly additive migrations (`20261030151500_add_applications`). Prohibit and remove destructive commands (`db:reset`, `prisma migrate reset`, `prisma db push`, `DROP`, `TRUNCATE`).
* **Rationale:** Preserves existing production records (`User`, legacy `Document`, `AuditLog`) while adding foreign keys, `Application`, `CheckResult`, `Review`, and new role enums.
* **Rollback Plan:** Forward-only additive migrations.

### ADR-003: Private Storage & Authenticated Express Streaming
* **Decision:** Replace the static `/uploads` Express directory with private bucket storage (Supabase JS client with service-role key) and local encrypted filesystem fallback. Downloads are streamed strictly through authenticated Express route `GET /documents/:id/file`.
* **Rationale:** Publicly accessible upload URLs allow unauthenticated enumeration and KYC data leakage. Streaming through Express enforces JWT authentication, role verification, and applicant ownership checks before sending any bytes.
* **Audit:** Every file streaming download triggers an append-only `DOC_DOWNLOAD` audit entry.

### ADR-004: Strict Privacy & Masked Aadhaar Retention
* **Decision:** Zero raw 12-digit Aadhaar numbers are persisted in database records, API responses, terminal logs, or audit trail entries.
* **Rationale:** Complies with Indian Aadhaar regulations and BRD v2.0 Section 2.
* **Implementation:** The regex extractor masks the first 8 digits as `XXXX-XXXX-` retaining only the final 4 digits (`XXXX-XXXX-1234`). Only synthetic test fixtures are used in development and automated testing.

### ADR-005: 9-Class Classifier with Calibrated Thresholding
* **Decision:** Use a dual TF-IDF FeatureUnion (Word n-grams 1–2 + Character word-boundary n-grams 3–5) combined with Calibrated Logistic Regression.
* **Confidence & Fallbacks:**
  - If OCR extracted characters $< 30$: categorized as `unreadable` with `UNREADABLE` outcome.
  - If prediction probability $< 0.70$: flagged as `needs_review` with `NEEDS_REVIEW` outcome.
  - If prediction probability $\ge 0.70$: categorized with `CLASSIFIED` outcome.
* **Evaluation Result:** Macro F1 = 0.9914, Test Accuracy = 99.15%, Hard-Negative Acceptance = 0.0% (see `docs/EVAL.md`).

### ADR-006: Automated Cross-Checks (Fuzzy Name & Exact DOB)
* **Decision:** Compare extracted entities across all submitted documents in an application.
  - **Name Match:** Token-sort fuzzy comparison (threshold 80). Discrepancies generate a `CRITICAL` severity check (`NAME_MISMATCH`).
  - **DOB Match:** Normalized exact match (`YYYY-MM-DD`). Discrepancies generate a `CRITICAL` severity check (`DOB_MISMATCH`).
  - **Completeness:** If fewer than 2 identity documents are uploaded, a `WARNING` severity check (`MISSING_CROSS_CHECK`) is registered.

### ADR-007: 6-Role Role-Based Access Control (RBAC) Matrix
* **Decision:** Support exact 6 roles: `APPLICANT`, `OFFICER`, `MANAGER`, `FRAUD_ANALYST`, `AUDITOR`, `ADMIN`.
* **Permission Enforcement:**
  - Route middleware `authenticate` verifies JWT.
  - Ownership middleware restricts `APPLICANT` to their own applications/documents, returning `404 Not Found` (rather than `403 Forbidden`) on unauthorized IDs to prevent enumeration.
  - `OFFICER`, `MANAGER`, `FRAUD_ANALYST` access submitted queues and submit reviews.
  - `AUDITOR` and `ADMIN` access system audit trails. `ADMIN` alone updates user roles.
