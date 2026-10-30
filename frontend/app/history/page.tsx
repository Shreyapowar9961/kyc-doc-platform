"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getHistory,
  downloadFile,
  ALL_CLASSES,
  CLASS_META,
  OUTCOME_META,
  DocOutcome,
  getCurrentUser,
  User,
} from "@/lib/api";

interface HistoryDocument {
  id: number;
  applicationId?: string;
  originalName: string;
  class: string;
  confidence: number;
  outcome: DocOutcome;
  ocrChars?: number;
  fileSize?: number;
  mimeType?: string;
  uploadDate: string;
  manualOverride?: string | null;
  extractedFields?: Record<string, any>;
  application?: {
    id: string;
    title?: string;
    status: string;
  };
}

export default function HistoryPage() {
  const [docs, setDocs] = useState<HistoryDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [classFilter, setClassFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHistory({
        page,
        limit: 10,
        class: classFilter !== "all" ? classFilter : undefined,
        outcome: outcomeFilter !== "all" ? outcomeFilter : undefined,
        search: search || undefined,
      });

      setDocs(res.documents || []);
      setTotal(res.pagination?.total || 0);
      setPages(res.pagination?.pages || 1);
      setClassCounts(res.classCounts || {});
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [page, classFilter, outcomeFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleDownload = async (docId: number, originalName: string) => {
    try {
      await downloadFile(docId, originalName);
    } catch (err: any) {
      alert("Download failed: " + (err?.response?.data?.error || err.message));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Document History</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Indexed KYC &amp; loan records with OCR extraction and outcome classifications.
          </p>
        </div>
        <Link
          href="/applications"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          View Applications
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* Class Filter Tabs */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Filter by Document Class
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setClassFilter("all"); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                classFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              All Classes ({total})
            </button>
            {ALL_CLASSES.map((cls) => {
              const count = classCounts[cls] || 0;
              const meta = CLASS_META[cls];
              return (
                <button
                  key={cls}
                  onClick={() => { setClassFilter(cls); setPage(1); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    classFilter === cls
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {meta ? meta.label : cls} {count > 0 ? `(${count})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary filters row: Outcome & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-600">Outcome:</label>
            <select
              value={outcomeFilter}
              onChange={(e) => { setOutcomeFilter(e.target.value); setPage(1); }}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Outcomes</option>
              <option value="CLASSIFIED">Classified</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="UNREADABLE">Unreadable</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search filename..."
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-60"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                className="text-xs text-slate-400 hover:text-slate-600 px-1.5"
              >
                Clear
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Document List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading document history...
          </div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No documents found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Extracted Fields</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((d) => {
                  const classMeta = CLASS_META[d.class] || {
                    label: d.class,
                    color: "bg-slate-100 text-slate-700 border-slate-200",
                  };
                  const outcomeMeta = OUTCOME_META[d.outcome] || {
                    label: d.outcome,
                    color: "bg-slate-500 text-white",
                  };

                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={d.originalName}>
                          {d.originalName}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(d.uploadDate).toLocaleString()} · {d.fileSize ? `${Math.round(d.fileSize / 1024)} KB` : "N/A"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${classMeta.color}`}>
                          {classMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">
                            {(d.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${outcomeMeta.color}`}>
                          {outcomeMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {d.extractedFields && Object.keys(d.extractedFields).length > 0 ? (
                          <div className="space-y-0.5 text-xs text-slate-600">
                            {d.extractedFields.name && (
                              <div><span className="text-slate-400">Name:</span> {d.extractedFields.name}</div>
                            )}
                            {d.extractedFields.dob && (
                              <div><span className="text-slate-400">DOB:</span> {d.extractedFields.dob}</div>
                            )}
                            {d.extractedFields.pan && (
                              <div><span className="text-slate-400">PAN:</span> <span className="font-mono">{d.extractedFields.pan}</span></div>
                            )}
                            {d.extractedFields.aadhaar_masked && (
                              <div><span className="text-slate-400">Aadhaar:</span> <span className="font-mono">{d.extractedFields.aadhaar_masked}</span></div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {d.application ? (
                          <Link
                            href={`/applications/${d.application.id}`}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                          >
                            {d.application.title || d.application.id.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">Unattached</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDownload(d.id, d.originalName)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition border border-slate-200"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              Page {page} of {pages} ({total} documents)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}