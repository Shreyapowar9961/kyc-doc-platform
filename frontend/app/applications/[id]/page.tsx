"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  getApplication,
  uploadDocuments,
  deleteDocument,
  submitApplication,
  downloadFile,
  Application,
  CLASS_META,
  OUTCOME_META,
} from "../../../lib/api";

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const applicationId = resolvedParams.id;

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    loadData();
  }, [applicationId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);
    try {
      setUploading(true);
      setError("");
      await uploadDocuments(applicationId, fileList);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upload and classify document(s)");
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
    if (!confirm("Submit this application for verification? You will no longer be able to add or delete documents.")) return;
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
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400">Loading application details...</div>;
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb & Navigation */}
      <div className="mb-4">
        <Link href="/applications" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
          ← Back to Applications
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
                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
              }`}
            >
              {application.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Application ID: <span className="font-mono">{application.id}</span> • Created on{" "}
            {new Date(application.createdAt).toLocaleDateString()}
          </p>
        </div>

        {isDraft && (
          <button
            onClick={handleSubmit}
            disabled={docs.length === 0 || submitting}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Upload Zone (Visible only while DRAFT) */}
      {isDraft && (
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
              {uploading ? "Uploading, running OCR & classifying..." : "Click to upload KYC documents"}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Supports PDF, PNG, JPG, TIFF (Up to 15 files, max 10MB each)
            </p>
          </label>
        </div>
      )}

      {/* Uploaded Documents List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Uploaded Documents ({docs.length})
          </h2>
          <span className="text-xs text-slate-400">Classified by 9-Class ML Engine</span>
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

              return (
                <div key={doc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                      <span className="text-xs font-medium text-slate-500">
                        {Math.round(doc.confidence * 100)}% Confidence
                      </span>
                    </div>

                    {/* Extracted Fields Summary (R2) */}
                    {doc.extractedFields && Object.keys(doc.extractedFields).length > 0 && (
                      <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-wrap gap-x-4 gap-y-1">
                        {doc.extractedFields.name && (
                          <span>Name: <strong>{doc.extractedFields.name}</strong></span>
                        )}
                        {doc.extractedFields.dob && (
                          <span>DOB: <strong>{doc.extractedFields.dob}</strong></span>
                        )}
                        {doc.extractedFields.pan && (
                          <span>PAN: <strong>{doc.extractedFields.pan}</strong></span>
                        )}
                        {doc.extractedFields.aadhaar_masked && (
                          <span>Aadhaar: <strong>{doc.extractedFields.aadhaar_masked}</strong></span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadFile(doc.id, doc.originalName)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
                    >
                      Download
                    </button>
                    {isDraft && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
