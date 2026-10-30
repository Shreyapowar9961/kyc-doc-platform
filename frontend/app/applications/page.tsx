"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApplications, createApplication, Application } from "../../lib/api";

const STATUS_BADGES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-300",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  RECOMMENDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const data = await getApplications();
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await createApplication(title.trim() || undefined);
      setTitle("");
      setShowCreateModal(false);
      fetchApps();
    } catch (err) {
      console.error("Failed to create application:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Loan & KYC Applications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your document submissions and track review status
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Application
        </button>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-800">No applications created yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Click &quot;New Application&quot; to create your first application and upload KYC documents.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900 text-base">{app.title}</h3>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      STATUS_BADGES[app.status] || "bg-slate-100"
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                  <span>Created: {new Date(app.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>
                    {(app as any)._count?.documents ?? app.documents?.length ?? 0} Documents
                  </span>
                </div>
              </div>
              <div className="text-slate-400 group-hover:text-indigo-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Create Loan Application</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter a title or reference name for this application (e.g. Home Loan March 2026).
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Personal Loan Application"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
