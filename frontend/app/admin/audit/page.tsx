"use client";

import { useEffect, useState, useCallback } from "react";
import { getAdminAudit, getCurrentUser } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuditLogEntry {
  id: number;
  userId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700 border-blue-200",
  REGISTER: "bg-emerald-100 text-emerald-700 border-emerald-200",
  APP_CREATE: "bg-indigo-100 text-indigo-700 border-indigo-200",
  DOC_UPLOAD: "bg-teal-100 text-teal-700 border-teal-200",
  DOC_DELETE: "bg-rose-100 text-rose-700 border-rose-200",
  DOC_DOWNLOAD: "bg-cyan-100 text-cyan-700 border-cyan-200",
  APP_SUBMIT: "bg-amber-100 text-amber-700 border-amber-200",
  APP_REVIEW: "bg-purple-100 text-purple-700 border-purple-200",
  ROLE_CHANGE: "bg-orange-100 text-orange-700 border-orange-200",
};

const COMMON_ACTIONS = [
  "ALL",
  "LOGIN",
  "REGISTER",
  "APP_CREATE",
  "DOC_UPLOAD",
  "DOC_DELETE",
  "DOC_DOWNLOAD",
  "APP_SUBMIT",
  "APP_REVIEW",
  "ROLE_CHANGE",
];

export default function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminAudit({
        page,
        limit: 25,
        action: actionFilter !== "ALL" ? actionFilter : undefined,
      });
      setLogs(res.logs || []);
      setPages(res.pagination?.pages || 1);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        router.push("/applications");
      } else {
        setError(err?.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, router]);

  useEffect(() => {
    const cur = getCurrentUser();
    if (cur && !["AUDITOR", "ADMIN"].includes(cur.role)) {
      router.push("/applications");
      return;
    }
    loadAuditLogs();
  }, [loadAuditLogs, router]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Append-only compliance log recording all system events, authentication, and file interactions.
          </p>
        </div>
        <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border font-semibold">
          Total Events: {total}
        </div>
      </div>

      {/* Action Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Filter Event Action
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_ACTIONS.map((act) => (
            <button
              key={act}
              onClick={() => { setActionFilter(act); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                actionFilter === act
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading audit events...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const badgeColor =
                    ACTION_COLORS[log.action] || "bg-slate-100 text-slate-700 border-slate-200";
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          {log.user?.name || log.user?.email || "System"}
                        </div>
                        {log.user?.email && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {log.user.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {log.user?.role || "SYSTEM"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-[280px]">
                        {isExpanded ? (
                          <pre className="text-[11px] bg-slate-900 text-emerald-400 p-2.5 rounded-lg overflow-x-auto font-mono">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          <span className="truncate block font-mono text-[11px] text-slate-500">
                            {JSON.stringify(log.details)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              Page {page} of {pages}
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