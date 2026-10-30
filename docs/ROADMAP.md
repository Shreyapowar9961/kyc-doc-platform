# Release 3 (R3) & Future Architecture Roadmap

**Platform:** KYC & Loan Document Platform  
**Specification:** BRD v2.0  
**Status:** Deferred / Out-of-Scope for R1 & R2  

---

## 1. Executive Summary

While **Release 1 (R1)** delivered the 9-class ML classification pipeline, synthetic data generator, private bucket storage, and core application workflows, and **Release 2 (R2)** delivered regex extraction, multi-document cross-checks, and officer review queues, this document outlines the future capabilities designed for **Release 3 (R3)** and subsequent enterprise phases.

These capabilities are strictly deferred in accordance with the BRD v2.0 scope boundaries and constraints.

---

## 2. R3 Roadmap Initiatives

### 2.1 Forgery & Document Tampering Detection
* **Objective:** Detect visual, pixel-level, and structural manipulation of identity documents.
* **Architecture:**
  - **Copy-Move & Splicing Analysis:** Deep CNN / Error Level Analysis (ELA) to detect digital photo or signature substitutions.
  - **Font & Text Inconsistency:** Detect differing font metrics, character kerning anomalies, and mismatched DPI indicative of pasted numbers or altered birth dates.
  - **Metadata & EXIF Inspection:** Flag PDF generation signatures from photo-editing software (e.g., Photoshop, Canva) vs scanner hardware outputs.
* **Integration:** Emits `FORGERY_SUSPECTED` flag into `CheckResult` with `CRITICAL` severity, blocking automated loan processing.

---

### 2.2 Fraud Rings & Identity Clustering (Graph Analytics)
* **Objective:** Identify syndicated fraud rings submitting multiple loan applications across fictitious or borrowed identities.
* **Architecture:**
  - **Graph Database:** Implement Neo4j or Amazon Neptune to build relationship graphs linking applicant entities.
  - **Edge Features:** Shared bank account numbers, duplicate phone numbers, identical employer GSTINs, shared IP subnets, or matching document checksums across distinct `Application` records.
  - **Clustering Algorithms:** Connected Components and Louvain Community Detection to flag coordinated ring submissions.
* **Role View:** Dedicated dashboard for `FRAUD_ANALYST` displaying interactive entity-graph visualizations.

---

### 2.3 Conversational AI Loan Assistant
* **Objective:** Guide applicants through KYC documentation requirements and self-correction.
* **Architecture:**
  - LLM-powered RAG pipeline (Retrieval-Augmented Generation) trained on lending policies and document submission guidelines.
  - Real-time pre-submission guidance: explains why a document was tagged `needs_review` or `unreadable` and gives actionable instructions (e.g., "Ensure all four corners of your PAN card are visible and free of flash glare").
* **Privacy Controls:** Zero document images or raw PII transmitted to third-party LLM endpoints. Runs through on-premise or VPC-hosted lightweight models.

---

### 2.4 Multi-Lingual OCR Expansion (Hindi & Marathi)
* **Objective:** Native support for vernacular state identity documents and regional land revenue records (e.g., 7/12 extracts).
* **Architecture:**
  - Train and bundle Tesseract Devanagari models (`hin.traineddata`, `mar.traineddata`).
  - Pre-processing pipeline with adaptive binarization tuned for non-Latin script ligatures.
  - Bi-directional name transliteration (Devanagari $\leftrightarrow$ Latin) enabling cross-checks between English PAN cards and Hindi/Marathi voter ID or ration cards.

---

### 2.5 Cryptographic Hash-Chain Verification
* **Objective:** Provide tamper-evident, verifiable immutability for the `AuditLog` table.
* **Architecture:**
  - Each `AuditLog` record includes `previousHash` and `currentHash` computed via SHA-256 over `(id, timestamp, action, userId, details, previousHash)`.
  - Periodic merkle root publication to external timestamping services or internal verifiable ledgers.
  - Automated integrity verifier allowing `AUDITOR` to prove that no log entries have been inserted, updated, or purged out of sequence.

---

### 2.6 Multi-Page Document Bundle Splitting
* **Objective:** Automatically segment and classify merged multi-page loan dossiers.
* **Architecture:**
  - Applicants frequently scan all documents into a single 20-page PDF.
  - Multi-page boundary detection uses visual page transitions and OCR content cues to identify document boundaries.
  - Splits the single PDF into discrete `Document` records (e.g., Pages 1–2: Bank Statement; Page 3: PAN Card; Pages 4–6: Salary Slips) before running individual classification and extraction pipelines.

---

### 2.7 Zero-Shot Category Onboarding
* **Objective:** Dynamically ingest new loan document types without requiring model retraining.
* **Architecture:**
  - Vision-Language Models (e.g., CLIP / LayoutLMv3) paired with vector similarity embeddings.
  - Administrators can define a new class by providing 3–5 representative examples and textual descriptions, onboarding new financial products in minutes.

---

## 3. Prioritization Matrix

| Capability | Complexity | Business Impact | Target Phase |
| :--- | :---: | :---: | :---: |
| Bundle Splitting | Medium | High | R3.1 |
| Hindi / Marathi OCR | Medium | High | R3.1 |
| Forgery & ELA Detection | High | High | R3.2 |
| Hash-Chain Audit Immutability | Low | Medium | R3.2 |
| Fraud Ring Graph Analytics | High | Critical | R3.3 |
| Conversational AI Assistant | Medium | Medium | R3.3 |
| Zero-Shot Category Onboarding | High | High | R3.4 |
