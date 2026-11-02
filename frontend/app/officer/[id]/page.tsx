"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getApplication,
  recordReview,
  downloadFile,
  getCurrentUser,
  Application,
  CLASS_META,
  OUTCOME_META,
} from "../../../lib/api";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  WARNING: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  INFO: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
};

export default function OfficerReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const applicationId = resolvedParams.id;
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<"APPROVE" | "REJECT" | "NEED_MORE_DOCUMENTS">("APPROVE");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [expandedDocChecks, setExpandedDocChecks] = useState<Record<number, boolean>>({});

  const toggleDocChecks = (docId: number) => {
    setExpandedDocChecks((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const loadData = async () => {
    try {
      setLoading(true);
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
    if (!["OFFICER", "MANAGER", "FRAUD_ANALYST", "ADMIN"].includes(cur.role)) {
      router.push("/applications");
      return;
    }
    loadData();
  }, [applicationId, router]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please provide a reason for your recommendation.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      setSuccessMsg("");
      await recordReview(applicationId, recommendation, reason);
      setSuccessMsg("Recommendation recorded successfully.");
      setReason("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to record recommendation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400">Loading application details & authenticity review...</div>;
  }

  if (!application) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Application not found</h2>
        <Link href="/officer" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
          Return to Queue
        </Link>
      </div>
    );
  }

  const docs = application.documents || [];
  const checks = application.checks || [];
  const reviews = application.reviews || [];
  const dossier = application.dossierVerification;
  const currentUser = getCurrentUser();
  const canReview = Boolean(currentUser && ["OFFICER", "MANAGER"].includes(currentUser.role));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/officer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
          &larr; Back to Verification Queue
        </Link>
      </div>

      {/* Header Profile */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{application.title}</h1>
            <span className="text-xs uppercase font-extrabold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {application.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Applicant: <strong>{application.applicant?.name || "Applicant"}</strong> ({application.applicant?.email})
            &bull; Submitted on: {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {successMsg}
        </div>
      )}

      {/* Dossier Authenticity & Health Banner */}
      {dossier && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-6 shadow-md mb-6 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Dossier Authenticity Assessment
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
                Officer Authenticity Score: {dossier.overallScore} / 100
              </h2>
            </div>

            <div className="w-12 h-12 rounded-full border-2 border-indigo-400 flex items-center justify-center font-bold text-sm bg-indigo-900/50">
              {dossier.overallScore}%
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
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
          <p className="text-xs text-slate-300">
            Evaluated {dossier.totalDocuments} document(s) against official seals, checksum syntax, and OCR density.
          </p>
        </div>
      )}

      {/* Cross-Check Verification Flags (R2) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Automated Cross-Check Flags (R2)</span>
            <span className="text-xs font-normal text-slate-500">&bull; Multi-Document Identity &amp; Income Verification</span>
          </h2>
        </div>

        {checks.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            No cross-check flags generated. (Requires at least 2 documents with extracted fields).
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {checks.map((chk) => {
              const style = SEVERITY_STYLES[chk.severity] || SEVERITY_STYLES.INFO;
              return (
                <div key={chk.id} className={`p-4 rounded-lg border ${style.bg} ${style.border}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {chk.check} ({chk.reasonCode})
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${style.text} bg-white shadow-xs`}>
                      {chk.severity}
                    </span>
                  </div>
                  <p className={`text-sm font-semibold ${style.text}`}>{chk.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submitted Documents & Extracted Fields */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Submitted Documents &amp; Authenticity Audits ({docs.length})</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {docs.map((doc) => {
            const meta = CLASS_META[doc.class] || CLASS_META.other_unknown;
            const outcomeMeta = doc.outcome ? OUTCOME_META[doc.outcome] : null;
            const verification = doc.verification || doc.extractedFields?.verification;
            const authScore = verification?.authenticityScore ?? Math.round(doc.confidence * 85);
            const isExpanded = !!expandedDocChecks[doc.id];

            return (
              <div key={doc.id} className="p-5 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{doc.originalName}</span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                        {meta.label}
                      </span>
                      {outcomeMeta && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${outcomeMeta.color}`}>
                          {outcomeMeta.label}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {Math.round(doc.confidence * 100)}% Confidence
                      </span>
                    </div>

                    {/* Authenticity Score Tag */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Authenticity:
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded border ${
                          authScore >= 80
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : authScore >= 60
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {authScore}% {authScore >= 80 ? "Verified Authentic" : authScore >= 60 ? "Requires Scrutiny" : "Suspicious"}
                      </span>
                    </div>

                    {/* Extracted Fields */}
                    {doc.extractedFields && Object.keys(doc.extractedFields).length > 0 && (
                      <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {doc.extractedFields.name && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">NAME</span>
                            <strong className="text-slate-900">{doc.extractedFields.name}</strong>
                          </div>
                        )}
                        {doc.extractedFields.dob && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">DOB</span>
                            <strong className="text-slate-900">{doc.extractedFields.dob}</strong>
                          </div>
                        )}
                        {doc.extractedFields.pan && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">PAN</span>
                            <strong className="text-slate-900 font-mono">
                              {typeof doc.extractedFields.pan === "string" && doc.extractedFields.pan.length === 10
                                ? `${doc.extractedFields.pan.slice(0, 5)}****${doc.extractedFields.pan.slice(9)}`
                                : doc.extractedFields.pan}
                            </strong>
                          </div>
                        )}
                        {doc.extractedFields.aadhaar_masked && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">AADHAAR</span>
                            <strong className="text-slate-900 font-mono">{doc.extractedFields.aadhaar_masked}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => downloadFile(doc.id, doc.originalName)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
                  >
                    Download File
                  </button>
                </div>

                {/* Granular Authenticity Checklist Toggle */}
                {verification && verification.checks && verification.checks.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleDocChecks(doc.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                    >
                      <span>{isExpanded ? "▼ Hide" : "► View"} Authenticity Audit Checklist</span>
                      <span className="text-slate-400 font-normal">({verification.checks.length} checks)</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-slate-600 italic mb-2 border-b border-slate-200 pb-1.5">
                          {verification.summary}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {verification.checks.map((chk: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-2 rounded border text-xs ${
                                chk.passed
                                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                                  : "bg-amber-50/70 border-amber-200 text-amber-900"
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold mb-0.5">
                                <span>{chk.passed ? "✅" : "⚠️"} {chk.name}</span>
                                <span className="font-mono text-[10px]">{chk.score}/{chk.maxScore} pts</span>
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
      </div>

      {/* Review Recommendations History */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-3">Previous Reviews</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1 font-semibold text-slate-700">
                  <span>Recommendation: <strong className="text-indigo-600">{r.recommendation}</strong></span>
                  <span className="text-slate-400">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-600">&quot;{r.reason}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Review Recommendation Form (OFFICER and MANAGER only, FRAUD_ANALYST read-only) */}
      {canReview ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">Record Officer Recommendation</h2>
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Decision
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="APPROVE">APPROVE — Loan documents verified and authentic</option>
                <option value="REJECT">REJECT — High fraud risk or unverified documents</option>
                <option value="NEED_MORE_DOCUMENTS">NEED_MORE_DOCUMENTS — Additional KYC verification required</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Officer Notes &amp; Rationale
              </label>
              <textarea
                required
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Identity documents cross-checked against Income Tax database and Aadhaar masked format. Income proof verified against salary slips."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow disabled:opacity-50"
            >
              {submitting ? "Saving Recommendation..." : "Submit Recommendation"}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-center text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Investigation View (Read-Only):</span> As a {currentUser?.role || "Fraud Analyst"}, you can inspect application files and cross-check flags. Recording official loan approval recommendations is reserved exclusively for credit officers and managers.
        </div>
      )}
    </div>
  );
}
