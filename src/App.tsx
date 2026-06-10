/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import GameEngine from "./components/GameEngine";

export default function App() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-8 font-sans selection:bg-yellow-200">
      {/* Background blobs for aesthetic */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-sky-200/40 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-yellow-100/40 blur-[120px]" />
      </div>

      <main className="w-full max-w-5xl flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-3">
              Sequel Edition v2.0
            </span>
            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase">
              Super Aaryan<br />Adventure 2
            </h1>
          </div>
          
          <div className="text-right flex flex-col items-end">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Developed By</span>
            <div className="flex gap-2">
              <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm font-bold text-slate-700 text-sm">
                Aaryan Murty
              </div>
              <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm font-bold text-slate-700 text-sm">
                Aarav Baveja
              </div>
            </div>
          </div>
        </header>

        <GameEngine />

        <footer className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Movement</h3>
            <div className="flex flex-wrap gap-1.5">
              <kbd className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black border-b-2 border-slate-300">ARROWS</kbd>
              <span className="text-slate-400 text-xs font-bold self-center">/</span>
              <kbd className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black border-b-2 border-slate-300">WASD</kbd>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Jump & Glide</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <kbd className="px-3 py-1 bg-slate-100 rounded text-[10px] font-black border-b-2 border-slate-300">SPACE</kbd>
              <span className="text-slate-400 text-[10px] font-medium">(Tap twice to Air-Jump)</span>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Cyber Dash</h3>
            <div className="flex flex-wrap items-center gap-1">
              <kbd className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black border-b-2 border-slate-300">SHIFT</kbd>
              <span className="text-slate-400 text-xs font-medium">/</span>
              <kbd className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black border-b-2 border-slate-300">C</kbd>
              <kbd className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black border-b-2 border-slate-300">K</kbd>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm col-span-1">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Sector Key Goal</h3>
            <p className="text-slate-500 text-[10px] font-semibold leading-normal">
              Grab the rotating <span className="text-amber-500 font-bold">Gold Key 🔑</span> before reaching the flag to escape!
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
