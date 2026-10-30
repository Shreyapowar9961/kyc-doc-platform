// frontend/lib/api.ts
/**
 * API Client & Type Definitions for KYC & Loan Document Platform.
 * Supports token management with sessionStorage fallback, Bearer token injection, and 401 handling.
 */

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

// ─── Token Management ────────────────────────────────────────────────────────
let inMemoryToken: string | null = null;

export function getToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("kyc_token");
  }
  return null;
}

export function setToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      sessionStorage.setItem("kyc_token", token);
    } else {
      sessionStorage.removeItem("kyc_token");
      sessionStorage.removeItem("kyc_user");
    }
  }
}

export function getCurrentUser(): User | null {
  if (typeof window !== "undefined") {
    const raw = sessionStorage.getItem("kyc_user");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (_) {}
    }
  }
  return null;
}

export function setCurrentUser(user: User | null) {
  if (typeof window !== "undefined") {
    if (user) {
      sessionStorage.setItem("kyc_user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("kyc_user");
    }
  }
}

// Attach Bearer token to all requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        setToken(null);
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Type Definitions ────────────────────────────────────────────────────────
export type Role = "APPLICANT" | "OFFICER" | "MANAGER" | "FRAUD_ANALYST" | "AUDITOR" | "ADMIN";
export type ApplicationStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "RECOMMENDED";
export type DocOutcome = "CLASSIFIED" | "NEEDS_REVIEW" | "UNREADABLE";
export type Severity = "INFO" | "WARNING" | "CRITICAL";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  details: string;
}

export interface DocumentVerification {
  authenticityScore: number;
  verificationStatus: "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED";
  statusBadge: string;
  statusText: string;
  checks: VerificationCheck[];
  summary: string;
}

export interface Document {
  id: number;
  applicationId?: string;
  originalName: string;
  class: string;
  confidence: number;
  outcome?: DocOutcome;
  ocrChars?: number;
  extractedFields?: {
    pan?: string;
    aadhaar_masked?: string;
    name?: string;
    dob?: string;
    verification?: DocumentVerification;
    [key: string]: any;
  };
  verification?: DocumentVerification;
  fileSize?: number;
  mimeType?: string;
  uploadDate: string;
}

export interface CheckResult {
  id: number;
  applicationId: string;
  check: string;
  severity: Severity;
  reasonCode: string;
  message: string;
  evidence?: any;
  createdAt: string;
}

export interface Review {
  id: number;
  applicationId: string;
  reviewerId: string;
  recommendation: "APPROVE" | "REJECT" | "NEED_MORE_DOCUMENTS";
  reason: string;
  createdAt: string;
  reviewer?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export interface Application {
  id: string;
  applicantId: string;
  title?: string;
  status: ApplicationStatus;
  createdAt: string;
  submittedAt?: string;
  documents?: Document[];
  checks?: CheckResult[];
  reviews?: Review[];
  applicant?: {
    id: string;
    name: string;
    email: string;
  };
  dossierVerification?: {
    overallScore: number;
    status: "AUTHENTIC" | "NEEDS_REVIEW" | "UNVERIFIED" | "INCOMPLETE";
    totalDocuments: number;
    crossChecks?: any[];
  };
}

// ─── Class & Outcome Badge Colors ────────────────────────────────────────────
export const ALL_CLASSES = [
  "aadhaar_card",
  "pan_card",
  "passport",
  "voter_id",
  "driving_licence",
  "bank_statement",
  "salary_slip",
  "income_proof",
  "other_unknown",
] as const;

export const CLASS_META: Record<string, { label: string; color: string }> = {
  aadhaar_card: { label: "Aadhaar Card", color: "bg-blue-100 text-blue-800 border-blue-200" },
  pan_card: { label: "PAN Card", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  passport: { label: "Passport", color: "bg-purple-100 text-purple-800 border-purple-200" },
  voter_id: { label: "Voter ID", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  driving_licence: { label: "Driving Licence", color: "bg-amber-100 text-amber-800 border-amber-200" },
  bank_statement: { label: "Bank Statement", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  salary_slip: { label: "Salary Slip", color: "bg-teal-100 text-teal-800 border-teal-200" },
  income_proof: { label: "Income Proof", color: "bg-violet-100 text-violet-800 border-violet-200" },
  other_unknown: { label: "Other / Unrelated", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

export const OUTCOME_META: Record<DocOutcome, { label: string; color: string }> = {
  CLASSIFIED: { label: "Classified", color: "bg-emerald-500 text-white" },
  NEEDS_REVIEW: { label: "Needs Review", color: "bg-amber-500 text-white" },
  UNREADABLE: { label: "Unreadable", color: "bg-rose-500 text-white" },
};

// ─── API Methods ─────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  setToken(res.data.token);
  setCurrentUser(res.data.user);
  return res.data;
}

export async function register(email: string, name: string, password: string) {
  const res = await api.post("/auth/register", { email, name, password });
  return res.data;
}

export async function getMe() {
  const res = await api.get("/auth/me");
  setCurrentUser(res.data.user);
  return res.data.user;
}

export async function getApplications(page = 1, limit = 10) {
  const res = await api.get("/applications", { params: { page, limit } });
  return res.data;
}

export async function getApplication(id: string) {
  const res = await api.get(`/applications/${id}`);
  return res.data.application;
}

export async function createApplication(title?: string) {
  const res = await api.post("/applications", { title });
  return res.data.application;
}

export async function uploadDocuments(applicationId: string, files: File[]) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await api.post(`/applications/${applicationId}/documents`, formData);
  return res.data.documents;
}

export async function deleteDocument(applicationId: string, docId: number) {
  const res = await api.delete(`/applications/${applicationId}/documents/${docId}`);
  return res.data;
}

export async function submitApplication(applicationId: string) {
  const res = await api.post(`/applications/${applicationId}/submit`);
  return res.data.application;
}

export async function recordReview(
  applicationId: string,
  recommendation: "APPROVE" | "REJECT" | "NEED_MORE_DOCUMENTS",
  reason: string
) {
  const res = await api.post(`/applications/${applicationId}/review`, { recommendation, reason });
  return res.data;
}

export async function getHistory(params: any = {}) {
  const res = await api.get("/history", { params });
  return res.data;
}

export async function getAdminUsers(page = 1, limit = 20) {
  const res = await api.get("/admin/users", { params: { page, limit } });
  return res.data;
}

export async function provisionUser(data: { email: string; name?: string; password: string; role: Role }) {
  const res = await api.post("/admin/users", data);
  return res.data.user;
}

export async function updateRole(userId: string, role: Role) {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return res.data.user;
}

export async function getAdminAudit(params: any = {}) {
  const res = await api.get("/admin/audit", { params });
  return res.data;
}

export async function downloadFile(docId: number, filename: string) {
  const res = await api.get(`/documents/${docId}/file`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
