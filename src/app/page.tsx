"use client";

import { useState } from "react";
import { Search, Bed, Users, AlertCircle, ShieldCheck, ArrowRight, RotateCcw } from "lucide-react";

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

export default function ParticipantCheckPage() {
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

  const handleReset = () => {
    setIcInput("");
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto my-auto pt-4 pb-6">
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          {/* Header */}
          <div className="text-center">
            <span className="inline-block text-[11px] font-bold tracking-widest text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full mb-2">
              EVENT LOGISTICS
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Room & Team Allocation
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Semak bilik penginapan, rakan sebilik, dan kumpulan aktiviti anda.
            </p>
          </div>

          {!result ? (
            /* Form Semakan */
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="ic"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                >
                  Nombor Kad Pengenalan (IC)
                </label>
                <div className="relative">
                  <input
                    id="ic"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Contoh: 950102105555"
                    value={icInput}
                    onChange={(e) => setIcInput(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base sm:text-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[52px]"
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Boleh dimasukkan dengan atau tanpa tanda sempang (-).
                </p>
              </div>

              {errorMsg && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200/90 p-4 text-sm text-rose-800 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-900">Carian Tidak Ditemui</p>
                    <p className="mt-0.5 text-xs text-rose-700 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !icInput.trim()}
                className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center text-base min-h-[48px]"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Semak Agihan Saya</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>
            </form>
          ) : (
            /* Result View */
            <div className="mt-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Header Info */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 border border-blue-100 flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                    Nama Peserta
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5 leading-snug">
                    {result.name}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Saiz Baju
                  </span>
                  <span className="inline-block mt-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-xs">
                    {result.size}
                  </span>
                </div>
              </div>

              {/* Kad Bilik */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-xs">
                <div className="flex items-center gap-2.5 text-slate-800 font-bold text-sm pb-2 border-b border-slate-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <Bed className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Penginapan</span>
                    <span>Bilik</span>
                  </div>
                </div>

                <div className="mt-3">
                  {result.room ? (
                    <div>
                      <div className="text-base font-bold text-slate-900">
                        {result.room.name}
                      </div>

                      {result.room.roommates.length > 0 ? (
                        <div className="mt-3">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Rakan Sebilik ({result.room.roommates.length} orang):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {result.room.roommates.map((name, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400 italic">
                          (Tiada rakan sebilik lain yang diagihkan lagi)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 font-medium">
                      Belum ditetapkan (dalam proses susunan urusetia).
                    </div>
                  )}
                </div>
              </div>

              {/* Kad Team */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-xs">
                <div className="flex items-center gap-2.5 text-slate-800 font-bold text-sm pb-2 border-b border-slate-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Aktiviti</span>
                    <span>Kumpulan (Team)</span>
                  </div>
                </div>

                <div className="mt-3">
                  {result.team ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full inline-block shrink-0 shadow-xs"
                          style={{ backgroundColor: result.team.color }}
                        />
                        <span className="text-base font-bold text-slate-900">
                          {result.team.name}
                        </span>
                      </div>

                      {result.team.teammates.length > 0 ? (
                        <div className="mt-3">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Rakan Sekumpulan ({result.team.teammates.length} orang):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {result.team.teammates.map((name, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400 italic">
                          (Tiada rakan sekumpulan lain yang diagihkan lagi)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 font-medium">
                      Belum ditetapkan (dalam proses susunan urusetia).
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan jika ada */}
              {result.remarks && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  <span className="font-bold text-slate-700">Catatan: </span>
                  {result.remarks}
                </div>
              )}

              {/* Butang Semak IC Lain */}
              <button
                onClick={handleReset}
                className="w-full mt-4 rounded-2xl border-2 border-slate-200 bg-white py-3 font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm min-h-[48px]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Semak IC Lain</span>
              </button>
            </div>
          )}

          {/* Privacy Note */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="text-center">Privasi dilindungi: Maklumat IC rakan lain tidak dipaparkan.</span>
          </div>
        </div>
      </div>

      <footer className="text-center py-4 text-xs text-slate-400">
        Room & Team Allocation • Event Logistics System
      </footer>
    </main>
  );
}
