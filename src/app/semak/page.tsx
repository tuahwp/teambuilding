"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Bed, Users, ShieldCheck, ArrowLeft, AlertCircle } from "lucide-react";

type ParticipantResult = {
  name: string;
  size: string;
  room: {
    name: string;
    roommates: string[];
  } | null;
  team: {
    name: string;
    color: string;
    teammates: string[];
  } | null;
  remarks?: string | null;
};

export default function SemakPage() {
  const [icInput, setIcInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ParticipantResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icInput.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch("/api/public/semak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ic: icInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "IC tak dijumpai. Semak semula atau hubungi urusetia.");
      } else {
        setResult(data.participant);
      }
    } catch {
      setErrorMsg("Masalah sambungan rangkaian. Sila cuba sebentar lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl mx-auto pt-4 sm:pt-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Laman Utama</span>
        </Link>

        {/* Card Semakan */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="text-center">
            <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
              SEMAKAN STATUS PESERTA
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              Semak Bilik & Kumpulan
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              Masukkan nombor Kad Pengenalan anda untuk melihat maklumat agihan bilik, rakan sebilik, dan kumpulan aktiviti.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div>
              <label
                htmlFor="ic"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Nombor Kad Pengenalan (IC)
              </label>
              <div className="relative">
                <input
                  id="ic"
                  type="text"
                  placeholder="Contoh: 950102105555 atau 950102-10-5555"
                  value={icInput}
                  onChange={(e) => setIcInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !icInput.trim()}
                  className="absolute right-2 top-2 bottom-2 rounded-lg bg-blue-600 px-4 font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center text-sm"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-1.5 hidden sm:inline" />
                      <span>Semak</span>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Boleh ditaip dengan tanda sempang (-) atau tanpa sempang.
              </p>
            </div>
          </form>

          {/* Ralat / Mesej Tidak Dijumpai */}
          {errorMsg && (
            <div className="mt-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Makluman:</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Keputusan Semakan */}
          {result && (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-5 sm:p-6 transition-all">
              <div className="flex items-center justify-between pb-4 border-b border-blue-100">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Maklumat Peserta
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {result.name}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Saiz Baju</span>
                  <span className="inline-block mt-0.5 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                    {result.size}
                  </span>
                </div>
              </div>

              {/* Bilik */}
              <div className="mt-5 rounded-xl bg-white p-4 border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Bed className="h-4 w-4" />
                  </div>
                  <span>Bilik Penginapan</span>
                </div>

                <div className="mt-2.5">
                  {result.room ? (
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        {result.room.name}
                      </div>

                      {result.room.roommates.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                            Rakan Sebilik ({result.room.roommates.length} orang):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.room.roommates.map((name, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">
                          (Tiada rakan sebilik lain yang diagihkan ke bilik ini lagi)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2.5 text-xs text-amber-800">
                      Belum ditetapkan (dalam proses susunan urusetia).
                    </div>
                  )}
                </div>
              </div>

              {/* Kumpulan / Team */}
              <div className="mt-4 rounded-xl bg-white p-4 border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <span>Kumpulan Aktiviti</span>
                </div>

                <div className="mt-2.5">
                  {result.team ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full inline-block shrink-0 shadow-sm"
                          style={{ backgroundColor: result.team.color }}
                        />
                        <span className="text-base font-semibold text-slate-900">
                          {result.team.name}
                        </span>
                      </div>

                      {result.team.teammates.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                            Rakan Se-kumpulan ({result.team.teammates.length} orang):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.team.teammates.map((name, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">
                          (Tiada rakan sekumpulan lain yang diagihkan lagi)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2.5 text-xs text-amber-800">
                      Belum ditetapkan (dalam proses susunan urusetia).
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks if any */}
              {result.remarks && (
                <div className="mt-4 rounded-xl bg-white/80 p-3.5 border border-slate-200/60 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Catatan: </span>
                  {result.remarks}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          <span>Privasi dijamin: Nombor IC dan data peribadi rakan lain tidak dipaparkan.</span>
        </div>
      </div>

      <div className="text-center py-6 text-xs text-slate-400">
        Room & Team Allocation • Event Logistics System
      </div>
    </div>
  );
}
