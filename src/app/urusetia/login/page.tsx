"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, ShieldCheck } from "lucide-react";

export default function UrusetiaLoginPage() {
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
        setErrorMsg(data.error || "Kata laluan urusetia tidak sah.");
      } else {
        router.push("/urusetia");
        router.refresh();
      }
    } catch {
      setErrorMsg("Ralat sambungan. Sila cuba sebentar lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto my-auto pt-4 pb-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-4">
              Portal Urusetia
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Masukkan kata laluan penganjur untuk mengakses panel agihan bilik & kumpulan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Kata Laluan Urusetia
              </label>
              <input
                id="password"
                type="password"
                placeholder="Masukkan kata laluan..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[50px]"
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200/90 p-4 text-sm text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-base font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span>Buka Panel Urusetia</span>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4" />
          <span>Sesi disahkan secara selamat pada pelayan</span>
        </div>
      </div>

      <footer className="text-center py-4 text-xs text-slate-400">
        Team Building Event Management • Urusetia Portal
      </footer>
    </main>
  );
}
