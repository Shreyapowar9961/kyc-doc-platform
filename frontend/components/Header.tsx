"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, setToken, User } from "../lib/api";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const isStaff = user && ["OFFICER", "MANAGER", "FRAUD_ANALYST", "ADMIN"].includes(user.role);
  const isAdmin = user?.role === "ADMIN";
  const isAuditor = user && ["AUDITOR", "ADMIN"].includes(user.role);

  const roleColors: Record<string, string> = {
    APPLICANT: "bg-blue-900/60 text-blue-200 border-blue-700",
    OFFICER: "bg-emerald-900/60 text-emerald-200 border-emerald-700",
    MANAGER: "bg-purple-900/60 text-purple-200 border-purple-700",
    FRAUD_ANALYST: "bg-amber-900/60 text-amber-200 border-amber-700",
    AUDITOR: "bg-cyan-900/60 text-cyan-200 border-cyan-700",
    ADMIN: "bg-rose-900/60 text-rose-200 border-rose-700",
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link href="/applications" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xl shadow">
              K
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">
                KYC & Loan Platform
              </span>
              <span className="text-xs text-indigo-400 font-medium hidden sm:block">
                Automated Verification & Fraud Checks
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/applications"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    pathname.startsWith("/applications")
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Applications
                </Link>

                {isStaff && (
                  <Link
                    href="/officer"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      pathname.startsWith("/officer")
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Officer Review
                  </Link>
                )}

                <Link
                  href="/history"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    pathname === "/history"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  History
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      pathname === "/admin/users"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Users
                  </Link>
                )}

                {isAuditor && (
                  <Link
                    href="/admin/audit"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      pathname === "/admin/audit"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Audit Log
                  </Link>
                )}

                {/* User & Role Badge */}
                <div className="ml-3 pl-3 border-l border-slate-700 flex items-center gap-3">
                  <div className="text-right hidden md:block">
                    <p className="text-xs font-semibold text-white leading-none">{user.name || user.email}</p>
                    <span className={`inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${roleColors[user.role] || "bg-indigo-900/60 text-indigo-200 border-indigo-700"}`}>
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 transition"
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-300 hover:text-white"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition shadow"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
