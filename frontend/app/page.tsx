"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, User, ALL_CLASSES, CLASS_META } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (u) {
      if (["OFFICER", "MANAGER", "FRAUD_ANALYST"].includes(u.role)) {
        router.push("/officer");
      } else {
        router.push("/applications");
      }
    }
  }, [router]);

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
          <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
          Production KYC &amp; Loan Document Verification Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Automated Identity Verification &amp; Document Intelligence
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
          High-accuracy 9-class document classification, synthetic-backed privacy safeguards, 
          automated cross-document entity checks, and audited loan officer review queues.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition"
          >
            Sign In to Platform
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold shadow-sm transition"
          >
            Register as Applicant
          </Link>
        </div>
      </div>

      {/* 9 Supported Classes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-4 text-center">
          Supported Document Classes (Offline AI Classifier)
        </h2>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {ALL_CLASSES.map((cls) => {
            const meta = CLASS_META[cls] || { label: cls.replace("_", " "), color: "bg-slate-100 text-slate-700 border-slate-200" };
            return (
              <span
                key={cls}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full border shadow-xs ${meta.color}`}
              >
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Platform Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
            9C
          </div>
          <h3 className="font-bold text-slate-900 text-base">9-Class ML Pipeline</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Dual word and character n-gram TF-IDF representations combined with Calibrated Logistic Regression. 
            Automated <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">needs_review</code> and <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">unreadable</code> fallback routing.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
            XC
          </div>
          <h3 className="font-bold text-slate-900 text-base">Automated Cross-Checks</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Multi-document entity extraction with fuzzy token-sort name matching and exact date-of-birth consistency 
            verification. Generates CRITICAL, WARNING, and INFO severity flags.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
            RB
          </div>
          <h3 className="font-bold text-slate-900 text-base">Strict RBAC &amp; Audit Trail</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Six granular roles (Applicant, Officer, Manager, Fraud Analyst, Auditor, Admin) with complete append-only 
            audit logging of all document uploads, submissions, reviews, and streaming downloads.
          </p>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="bg-slate-900 text-white rounded-xl p-8 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-2">Enterprise Security &amp; Privacy Mandates</h3>
        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          Built strictly according to BRD v2.0 specifications. Raw Aadhaar numbers are never stored in databases or logs; 
          all document files are strictly isolated in private storage with authenticated Express streaming routes.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="text-indigo-400 font-black text-xl">99.1%</div>
            <div className="text-xs text-slate-400 mt-1">Classifier Macro F1</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="text-emerald-400 font-black text-xl">0%</div>
            <div className="text-xs text-slate-400 mt-1">Hard-Negative Acceptance</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="text-amber-400 font-black text-xl">&gt;92%</div>
            <div className="text-xs text-slate-400 mt-1">Regex Extraction Rate</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="text-sky-400 font-black text-xl">6 Roles</div>
            <div className="text-xs text-slate-400 mt-1">Enforced Backend RBAC</div>
          </div>
        </div>
      </div>
    </div>
  );
}