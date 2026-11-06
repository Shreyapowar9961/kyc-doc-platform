"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, setToken } from "../../lib/api";

type LoginPortal = "APPLICANT" | "STAFF";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const registeredEmail = searchParams.get("email");

  const [portal, setPortal] = useState<LoginPortal>("APPLICANT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (registeredEmail) {
      setEmail(registeredEmail);
      setPortal("APPLICANT");
    }
  }, [registeredEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email.trim(), password);
      const verifiedRole = data.user.role;

      // ─── Enforce strict role-category validation ───────────────────────────
      // The server identity is authoritative. Verify portal selection against server role.
      if (portal === "APPLICANT") {
        if (verifiedRole !== "APPLICANT") {
          // Invalidate session immediately on role category mismatch
          setToken(null);
          setError("Staff credentials detected. Please switch to the Staff Login portal to access your dashboard.");
          setLoading(false);
          return;
        }
        router.push("/applications");
      } else {
        // portal === "STAFF"
        if (verifiedRole === "APPLICANT") {
          // Invalidate session immediately on role category mismatch
          setToken(null);
          setError("Access Denied: Applicant accounts cannot access the Staff Portal. Please use the Applicant Login tab.");
          setLoading(false);
          return;
        }

        // Navigate staff to authorized role dashboard
        if (verifiedRole === "ADMIN") {
          router.push("/admin/users");
        } else if (verifiedRole === "AUDITOR") {
          router.push("/admin/audit");
        } else if (["OFFICER", "MANAGER", "FRAUD_ANALYST"].includes(verifiedRole)) {
          router.push("/officer");
        } else {
          router.push("/applications");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid email or password. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white mb-3 font-black text-xl shadow-md">
            K
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">KYC &amp; Loan Platform</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise document verification and identity compliance
          </p>
        </div>

        {/* Portal Selector Tabs (Applicant vs Staff) */}
        <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50 mb-6">
          <button
            type="button"
            onClick={() => {
              setPortal("APPLICANT");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              portal === "APPLICANT"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Applicant Login
          </button>
          <button
            type="button"
            onClick={() => {
              setPortal("STAFF");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              portal === "STAFF"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Staff &amp; Officer Login
          </button>
        </div>

        {/* Registration Success Banner */}
        {registered && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <span className="font-bold">&check;</span>
            <span>Registration successful! Please sign in with your credentials.</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={portal === "APPLICANT" ? "applicant@example.com" : "officer@bank.local"}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
            />
          </div>

          {portal === "STAFF" && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700 block mb-0.5">Authorized Personnel Only:</span>
              Includes Loan Officers, Branch Managers, Fraud Analysts, Auditors, and Platform Administrators. Access is continuously audited.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition shadow disabled:opacity-50 mt-2 ${
              portal === "APPLICANT"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            {loading ? "Authenticating..." : portal === "APPLICANT" ? "Sign In as Applicant" : "Sign In to Staff Portal"}
          </button>
        </form>

        {/* Footer Area: Registration Link ONLY for Applicant */}
        {portal === "APPLICANT" ? (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>Need an applicant account? </span>
            <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
              Register as Applicant &rarr;
            </Link>
          </div>
        ) : (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Staff registration is disabled. Accounts are provisioned by an administrator.
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
