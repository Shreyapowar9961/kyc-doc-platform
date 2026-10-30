"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApplications, getCurrentUser, User, Application } from "../../lib/api";

const STATUS_BADGES: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  RECOMMENDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function OfficerQueuePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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
    setCurrentUser(cur);

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
  }, [router]);

  const filteredApps = useMemo(() => {
    if (statusFilter === "ALL") return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: applications.length,
      submitted: applications.filter((a) => a.status === "SUBMITTED").length,
      underReview: applications.filter((a) => a.status === "UNDER_REVIEW").length,
      recommended: applications.filter((a) => a.status === "RECOMMENDED").length,
    };
  }, [applications]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title & Role Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Officer Verification Queue</h1>
            {currentUser && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentUser.role.replace("_", " ")} VIEW
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Review submitted KYC applications, verify document authenticity, and record loan recommendations.
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Queue</span>
            <span className="text-sm font-black text-slate-900">{counts.all}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-center shadow-xs">
            <span className="text-[10px] font-bold text-blue-500 block uppercase">Pending</span>
            <span className="text-sm font-black text-blue-600">{counts.submitted}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-center shadow-xs">
            <span className="text-[10px] font-bold text-emerald-500 block uppercase">Reviewed</span>
            <span className="text-sm font-black text-emerald-600">{counts.recommended}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {["ALL", "SUBMITTED", "UNDER_REVIEW", "RECOMMENDED"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === tab
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading review queue...</div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-800">Queue is empty</h3>
          <p className="text-sm text-slate-500 mt-1">There are no applications matching the selected criteria.</p>
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
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900">{app.title}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="font-medium text-slate-900">{app.applicant?.name || "Applicant"}</div>
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
