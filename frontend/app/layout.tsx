// frontend/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "KYC & Loan Document Platform",
  description:
    "Enterprise KYC and loan document processing platform with 9-class offline classification, multi-document cross-checks, and officer review queues.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 mt-16 py-6 text-center text-xs text-slate-400">
          KYC &amp; Loan Document Platform · BRD v2.0 Compliance Architecture · Next.js · Express · FastAPI · Tesseract OCR
        </footer>
      </body>
    </html>
  );
}