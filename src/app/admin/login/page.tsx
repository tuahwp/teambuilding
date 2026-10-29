"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, AlertCircle, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Kata laluan admin tidak sah.");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      setErrorMsg("Ralat sambungan. Sila cuba sebentar lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto pt-8 sm:pt-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Laman Utama</span>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-4">
              Log Masuk Urusetia
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Sila masukkan kata laluan urusetia untuk mengakses panel pengurusan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Kata Laluan Admin
              </label>
              <input
                id="password"
                type="password"
                placeholder="Masukkan kata laluan..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-sm text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span>Buka Panel Urusetia</span>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <Link
              href="/semak"
              className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              Bukan urusetia? Pergi ke Semakan Status Peserta →
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          <span>Sesi disimpan selamat dalam cookie httpOnly bertandatangan</span>
        </div>
      </div>

      <div className="text-center py-6 text-xs text-slate-400">
        Team Building Event Management • Admin Security
      </div>
    </div>
  );
}

