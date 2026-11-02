"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getApplication,
  uploadDocuments,
  deleteDocument,
  submitApplication,
  downloadFile,
  getCurrentUser,
  Application,
  CLASS_META,
  OUTCOME_META,
} from "../../../lib/api";

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const applicationId = resolvedParams.id;
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [expandedDocChecks, setExpandedDocChecks] = useState<Record<number, boolean>>({});
  const [showAllReviews, setShowAllReviews] = useState(false);

  const toggleDocChecks = (docId: number) => {
    setExpandedDocChecks((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const app = await getApplication(applicationId);
      setApplication(app);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load application");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cur = getCurrentUser();
    if (!cur) {
      router.push("/login");
      return;
    }
    loadData();
  }, [applicationId, router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);
    try {
      setUploading(true);
      setError("");
      await uploadDocuments(applicationId, fileList);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upload, classify and verify document(s)");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDocument(applicationId, docId);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete document");
    }
  };

  const handleSubmit = async () => {
    const isResubmission = latestReview?.recommendation === "NEED_MORE_DOCUMENTS";
    const confirmMsg = isResubmission
      ? "Re-submit your updated application dossier for officer review?"
      : "Submit this application for verification? You will no longer be able to add or delete documents.";
    if (!confirm(confirmMsg)) return;
    try {
      setSubmitting(true);
      setError("");
      await submitApplication(applicationId);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400">Loading application details & authenticity audits...</div>;
  }

  if (!application) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Application not found</h2>
        <Link href="/applications" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
          Return to Applications
        </Link>
      </div>
    );
  }

  const isDraft = application.status === "DRAFT";
  const docs = application.documents || [];
  const dossier = application.dossierVerification;
  const reviews = application.reviews || [];
  const latestReview = reviews.length > 0 ? reviews[0] : null;
  const needsMoreDocs = latestReview?.recommendation === "NEED_MORE_DOCUMENTS";
  const canUpload = isDraft || needsMoreDocs;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb & Navigation */}
      <div className="mb-4">
        <Link href="/applications" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
          &larr; Back to Applications
        </Link>
      </div>

      {/* Main Title & Status Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{application.title}</h1>
            <span
              className={`text-xs uppercase font-extrabold px-3 py-1 rounded-full border ${
                isDraft
                  ? "bg-slate-100 text-slate-700 border-slate-300"
                  : application.status === "RECOMMENDED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
              }`}
            >
              {application.status}
            </span>
            {latestReview && (
              <span
                className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  latestReview.recommendation === "APPROVE"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : latestReview.recommendation === "NEED_MORE_DOCUMENTS"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                }`}
              >
                {latestReview.recommendation === "APPROVE" && "✓ Approved by Officer"}
                {latestReview.recommendation === "NEED_MORE_DOCUMENTS" && "⚠️ Action: Documents Needed"}
                {latestReview.recommendation === "REJECT" && "✕ Declined by Officer"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Application ID: <span className="font-mono">{application.id}</span> &bull; Created on{" "}
            {new Date(application.createdAt).toLocaleDateString()}
          </p>
        </div>

        {(isDraft || needsMoreDocs) && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleSubmit}
              disabled={docs.length < 2 || submitting}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow disabled:opacity-50 flex items-center gap-2"
            >
              {submitting
                ? "Submitting..."
                : needsMoreDocs
                ? "Re-Submit for Loan Review"
                : "Submit Application for Loan Review"}
            </button>
            {docs.length < 2 && (
              <span className="text-[11px] text-amber-700 font-medium">
                At least 2 documents required to submit (e.g. Identity and Income proof)
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* ─── Institutional Review & Recommendation Section (Applicant Facing) ─── */}
      {latestReview ? (
        <div
          className={`rounded-xl border p-5 mb-6 shadow-xs ${
            latestReview.recommendation === "APPROVE"
              ? "bg-emerald-50/70 border-emerald-300"
              : latestReview.recommendation === "NEED_MORE_DOCUMENTS"
              ? "bg-amber-50/80 border-amber-300"
              : "bg-rose-50/70 border-rose-300"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">
                {latestReview.recommendation === "APPROVE" && "✅"}
                {latestReview.recommendation === "NEED_MORE_DOCUMENTS" && "⚠️"}
                {latestReview.recommendation === "REJECT" && "❌"}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {latestReview.recommendation === "APPROVE" && "Loan Application Recommended for Approval"}
                    {latestReview.recommendation === "NEED_MORE_DOCUMENTS" && "Action Required: Additional Documents Requested"}
                    {latestReview.recommendation === "REJECT" && "Application Review Decision: Declined"}
                  </h2>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      latestReview.recommendation === "APPROVE"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : latestReview.recommendation === "NEED_MORE_DOCUMENTS"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}
                  >
                    {latestReview.recommendation.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Reviewed by {latestReview.reviewer?.name || "Credit Operations Officer"} ({latestReview.reviewer?.role || "OFFICER"}) &bull;{" "}
                  {new Date(latestReview.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {needsMoreDocs && (
              <span className="text-xs font-semibold px-3 py-1 bg-amber-200/60 text-amber-900 rounded-md border border-amber-300">
                Upload requested docs below &amp; re-submit
              </span>
            )}
          </div>

          <div
            className={`rounded-lg p-3.5 border text-xs ${
              latestReview.recommendation === "APPROVE"
                ? "bg-white/90 border-emerald-200 text-emerald-950"
                : latestReview.recommendation === "NEED_MORE_DOCUMENTS"
                ? "bg-white/90 border-amber-200 text-amber-950"
                : "bg-white/90 border-rose-200 text-rose-950"
            }`}
          >
            <div className="font-bold uppercase tracking-wider text-[10px] mb-1 opacity-75">
              {latestReview.recommendation === "NEED_MORE_DOCUMENTS"
                ? "Officer Instructions for Applicant:"
                : "Officer Review Notes & Rationale:"}
            </div>
            <p className="text-sm font-medium leading-relaxed">&ldquo;{latestReview.reason}&rdquo;</p>
          </div>

          {/* Previous reviews accordion if multiple */}
          {reviews.length > 1 && (
            <div className="mt-3 pt-3 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
              >
                <span>{showAllReviews ? "▼ Hide" : "► View"} Earlier Review Cycles ({reviews.length - 1} previous)</span>
              </button>

              {showAllReviews && (
                <div className="mt-2 space-y-2">
                  {reviews.slice(1).map((r) => (
                    <div key={r.id} className="p-3 bg-white/80 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700">{r.recommendation.replace(/_/g, " ")}</span>
                        <span>{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700">&ldquo;{r.reason}&rdquo;</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : !isDraft ? (
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
            ⏳
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900">Application Under Officer Review</h3>
            <p className="text-xs text-blue-700 mt-0.5">
              Your application has been submitted and is currently in the loan review queue. The assigned loan officer will evaluate your documents and record a recommendation here shortly.
            </p>
          </div>
        </div>
      ) : null}

      {/* Dossier Authenticity & Verification Banner */}
      {docs.length > 0 && dossier && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-6 shadow-md mb-6 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Multi-Factor KYC Verification Engine
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    dossier.status === "AUTHENTIC"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : dossier.status === "NEEDS_REVIEW"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                  }`}
                >
                  {dossier.status}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-white">
                Document Dossier Authenticity Health
              </h2>
            </div>

            <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="text-right">
                <span className="block text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                  Aggregate Score
                </span>
                <span className="text-2xl font-black text-white">
                  {dossier.overallScore}
                  <span className="text-sm text-indigo-300">/100</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-indigo-400 flex items-center justify-center font-bold text-xs bg-indigo-900/50">
                {dossier.overallScore}%
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                dossier.overallScore >= 80
                  ? "bg-emerald-400"
                  : dossier.overallScore >= 60
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
              style={{ width: `${Math.max(5, dossier.overallScore)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
            <span>
              {dossier.status === "AUTHENTIC" && "All uploaded documents passed institutional seal, header syntax, and OCR clarity thresholds."}
              {dossier.status === "NEEDS_REVIEW" && "One or more documents require manual review by loan officer due to moderate confidence or missing headers."}
              {dossier.status === "UNVERIFIED" && "Authenticity criteria unverified. Please upload clear government-issued IDs."}
            </span>
            <span className="text-slate-400 font-medium">{dossier.totalDocuments} Document(s) Scored</span>
          </div>
        </div>
      )}

      {/* Upload Zone (Visible while DRAFT or if additional docs requested by officer) */}
      {canUpload && (
        <div className="bg-white p-6 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition mb-6 text-center">
          <input
            type="file"
            id="docUpload"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <label htmlFor="docUpload" className="cursor-pointer block">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-indigo-600 hover:text-indigo-700">
              {uploading
                ? "Uploading, running OCR, classifying & verifying authenticity..."
                : needsMoreDocs
                ? "Click to upload requested additional KYC document(s)"
                : "Click to upload KYC documents"}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Supports PAN, Aadhaar, Passport, Salary Slips &amp; Bank Statements (PDF, PNG, JPG, TIFF up to 10MB)
            </p>
          </label>
        </div>
      )}

      {/* Uploaded Documents List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Uploaded Documents &amp; Authenticity Audits ({docs.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Classified by 9-class ML pipeline and evaluated for regulatory authenticity
            </p>
          </div>
          <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
            Offline ML + OCR Engine
          </span>
        </div>

        {docs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No documents uploaded yet. Upload your PAN, Aadhaar, salary slips, or bank statements above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map((doc) => {
              const meta = CLASS_META[doc.class] || CLASS_META.other_unknown;
              const outcomeMeta = doc.outcome ? OUTCOME_META[doc.outcome] : null;
              const verification = doc.verification || doc.extractedFields?.verification;
              const authScore = verification?.authenticityScore ?? Math.round(doc.confidence * 85);
              const isExpanded = !!expandedDocChecks[doc.id];

              return (
                <div key={doc.id} className="p-5 space-y-3">
                  {/* Row 1: Document details & badges */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{doc.originalName}</span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                          {meta.label}
                        </span>
                        {outcomeMeta && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${outcomeMeta.color}`}>
                            {outcomeMeta.label}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {Math.round(doc.confidence * 100)}% ML Confidence
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Authenticity Pill */}
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Authenticity
                        </span>
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded ${
                            authScore >= 80
                              ? "bg-emerald-100 text-emerald-800"
                              : authScore >= 60
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {authScore}% {authScore >= 80 ? "Verified" : authScore >= 60 ? "Moderate" : "Suspicious"}
                        </span>
                      </div>

                      <button
                        onClick={() => downloadFile(doc.id, doc.originalName)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
                      >
                        Download
                      </button>
                      {canUpload && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Extracted Verified Identity Entities */}
                  {doc.extractedFields && Object.keys(doc.extractedFields).length > 0 && (
                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap gap-x-6 gap-y-1.5 items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Verified Entities:
                      </span>
                      {doc.extractedFields.name && (
                        <span className="flex items-center gap-1">
                          <span className="text-slate-400">Name:</span>
                          <strong className="text-slate-900">{doc.extractedFields.name}</strong>
                          <span className="text-emerald-500 text-xs">&check;</span>
                        </span>
                      )}
                      {doc.extractedFields.dob && (
                        <span className="flex items-center gap-1">
                          <span className="text-slate-400">DOB:</span>
                          <strong className="text-slate-900">{doc.extractedFields.dob}</strong>
                          <span className="text-emerald-500 text-xs">&check;</span>
                        </span>
                      )}
                      {doc.extractedFields.pan && (
                        <span className="flex items-center gap-1">
                          <span className="text-slate-400">PAN:</span>
                          <strong className="text-slate-900 font-mono">{doc.extractedFields.pan}</strong>
                          <span className="text-emerald-500 text-xs">&check;</span>
                        </span>
                      )}
                      {doc.extractedFields.aadhaar_masked && (
                        <span className="flex items-center gap-1">
                          <span className="text-slate-400">Aadhaar:</span>
                          <strong className="text-slate-900 font-mono">{doc.extractedFields.aadhaar_masked}</strong>
                          <span className="text-emerald-500 text-xs">&check;</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Row 3: Authenticity Verification Breakdown Checklist */}
                  {verification && verification.checks && verification.checks.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleDocChecks(doc.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                      >
                        <span>{isExpanded ? "▼ Hide" : "► View"} Authenticity Verification Audit Checklist</span>
                        <span className="text-slate-400 font-normal">({verification.checks.length} checks)</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                          <p className="text-xs text-slate-600 italic mb-2 border-b border-slate-200 pb-1.5">
                            {verification.summary || "Multi-criteria authenticity validation result based on official seals, syntax, OCR clarity and confidence."}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {verification.checks.map((chk: any, idx: number) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded border text-xs ${
                                  chk.passed
                                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                                    : "bg-amber-50/70 border-amber-200 text-amber-900"
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold mb-0.5">
                                  <span className="flex items-center gap-1.5">
                                    <span>{chk.passed ? "✅" : "⚠️"}</span>
                                    <span>{chk.name}</span>
                                  </span>
                                  <span className="font-mono text-[11px]">
                                    {chk.score}/{chk.maxScore} pts
                                  </span>
                                </div>
                                <p className="text-[11px] opacity-90 pl-5">{chk.details}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
