"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, name, password);
      router.push(`/login?registered=true&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      const details = err.response?.data?.details;
      if (details && details.length > 0) {
        setError(details.map((d: any) => d.message).join(", "));
      } else {
        setError(err.response?.data?.error || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-3 font-black text-xl shadow-md">
            K
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Applicant Registration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create an account to submit and verify KYC &amp; loan documents
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Legal Name (as on Govt ID)
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="applicant@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <span className="text-[11px] text-slate-400">Min 10 characters</span>
            </div>
            <input
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700 block mb-0.5">Applicant Access Scope:</span>
            Your account grants secure access to create applications, upload personal KYC documents, and monitor verification status.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow disabled:opacity-50 mt-2"
          >
            {loading ? "Creating Account..." : "Create Applicant Account"}
          </button>
        </form>

        {/* Security & Staff Notice */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-800 leading-relaxed mb-4">
            <strong className="block text-amber-900 mb-0.5">Staff &amp; Internal Personnel Notice:</strong>
            Loan officers, branch managers, fraud analysts, and auditors cannot register publicly. Staff credentials must be provisioned by a platform administrator.
          </div>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign In to Platform
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
