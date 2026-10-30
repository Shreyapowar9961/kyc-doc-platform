"use client";

import { useEffect, useState, useCallback } from "react";
import { getAdminUsers, updateRole, provisionUser, Role, getCurrentUser } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

const ROLES: Role[] = ["APPLICANT", "OFFICER", "MANAGER", "FRAUD_ANALYST", "AUDITOR", "ADMIN"];
const STAFF_ROLES: Role[] = ["OFFICER", "MANAGER", "FRAUD_ANALYST", "AUDITOR", "ADMIN"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Staff Provisioning Modal State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionEmail, setProvisionEmail] = useState("");
  const [provisionName, setProvisionName] = useState("");
  const [provisionPassword, setProvisionPassword] = useState("");
  const [provisionRole, setProvisionRole] = useState<Role>("OFFICER");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers(page, 20);
      setUsers(res.users || []);
      setPages(res.pagination?.pages || 1);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        router.push("/applications");
      } else {
        setStatusMsg({ text: err?.response?.data?.error || err.message, error: true });
      }
    } finally {
      setLoading(false);
    }
  }, [page, router]);

  useEffect(() => {
    const cur = getCurrentUser();
    if (!cur) {
      router.push("/login");
      return;
    }
    if (cur.role !== "ADMIN") {
      router.push("/applications");
      return;
    }
    loadUsers();
  }, [loadUsers, router]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingId(userId);
    setStatusMsg(null);
    try {
      const updated = await updateRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      );
      setStatusMsg({ text: `Updated user role to ${updated.role}` });
    } catch (err: any) {
      setStatusMsg({
        text: err?.response?.data?.error || "Failed to update role",
        error: true,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleProvisionStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError("");
    setProvisioning(true);
    try {
      await provisionUser({
        email: provisionEmail.trim(),
        name: provisionName.trim() || undefined,
        password: provisionPassword,
        role: provisionRole,
      });
      setShowProvisionModal(false);
      setProvisionEmail("");
      setProvisionName("");
      setProvisionPassword("");
      setProvisionRole("OFFICER");
      setStatusMsg({ text: `Staff account provisioned successfully with role ${provisionRole}` });
      loadUsers();
    } catch (err: any) {
      setProvisionError(err?.response?.data?.error || "Failed to provision staff account");
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">User Administration</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage user roles and provision authorized staff accounts (Admin only).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg border font-semibold">
            Total Users: {total}
          </div>
          <button
            onClick={() => setShowProvisionModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <span>+</span> Provision Staff Account
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-lg text-sm border font-medium ${
            statusMsg.error
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No registered users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4 text-right">Modify Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {u.name || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                      {u.email}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-bold uppercase px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
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

      {/* Staff Account Provisioning Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Provision Staff Account</h3>
            <p className="text-xs text-slate-500 mb-4">
              Authorized admin provisioning for loan officers, managers, fraud analysts, and auditors.
            </p>

            {provisionError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {provisionError}
              </div>
            )}

            <form onSubmit={handleProvisionStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Staff Role
                </label>
                <select
                  value={provisionRole}
                  onChange={(e) => setProvisionRole(e.target.value as Role)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={provisionName}
                  onChange={(e) => setProvisionName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={provisionEmail}
                  onChange={(e) => setProvisionEmail(e.target.value)}
                  placeholder="priya.sharma@bank.local"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temporary Password (Min 10 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={provisionPassword}
                  onChange={(e) => setProvisionPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {provisioning ? "Provisioning..." : "Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
