"use client";
import AppNav from "../_components/AppNav";

export default function TractionChannelsPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Traction Channels</h1>
          <p className="mt-1 text-slate-600">Track marketing channels (MVP soon)</p>
        </div>
        <AppNav />
      </header>

      <section className="rounded-2xl border bg-white p-6">
        <div className="text-sm text-slate-600">
          Later: list channels, weekly experiments, results, and notes.
        </div>
      </section>
    </div>
  );
}
