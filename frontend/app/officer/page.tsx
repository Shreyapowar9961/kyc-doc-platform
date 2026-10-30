"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApplications, Application } from "../../lib/api";

const STATUS_BADGES: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  RECOMMENDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function OfficerQueuePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setLoading(true);
        const data = await getApplications();
        setApplications(data.applications || []);
      } catch (err) {
        console.error("Failed to load officer queue:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueue();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Officer Verification Queue (R2)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review submitted KYC applications, verify cross-check alerts, and record loan recommendations.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading submitted applications...</div>
      ) : applications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <h3 className="text-base font-semibold text-slate-800">Queue is empty</h3>
          <p className="text-sm text-slate-500 mt-1">There are no pending submitted applications to review.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-6 py-3.5">Application</th>
                <th className="px-6 py-3.5">Applicant</th>
                <th className="px-6 py-3.5">Submitted</th>
                <th className="px-6 py-3.5">Documents</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900">{app.title}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <div>{app.applicant?.name || "Applicant"}</div>
                    <div className="text-xs text-slate-400">{app.applicant?.email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "Pending"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {(app as any)._count?.documents ?? app.documents?.length ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        STATUS_BADGES[app.status] || "bg-slate-100"
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/officer/${app.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition shadow"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
