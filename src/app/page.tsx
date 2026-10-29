import Link from "next/link";
import { Users, Search, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-inset ring-blue-500/20 mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          <span>EVENT LOGISTICS</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Room & Team Allocation
        </h1>
        <p className="mt-3 text-base text-slate-600 max-w-lg mx-auto">
          Sistem agihan penginapan bilik, kumpulan aktiviti, dan saiz baju rasmi bagi program Team Building.
        </p>

        {/* Action Cards */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
          {/* Public Check */}
          <Link
            href="/semak"
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Search className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Semak Status Anda
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                Untuk semua peserta: Masukkan nombor IC untuk semak bilik, kumpulan dan senarai rakan sebilik.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:underline">
              <span>Buat semakan sekarang</span>
              <span>→</span>
            </div>
          </Link>

          {/* Admin Portal */}
          <Link
            href="/admin"
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-400 hover:shadow-md"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Portal Urusetia (Admin)
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                Log masuk untuk urus agihan bilik, kumpulan, direktori peserta, dan muat turun senarai CSV.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-slate-700 group-hover:underline">
              <span>Log masuk admin</span>
              <span>→</span>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-xs text-slate-400">
          Team Building Event Management • Responsive Web App
        </div>
      </div>
    </div>
  );
}
