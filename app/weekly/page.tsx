// app/weekly/page.tsx
"use client";

import { useMemo, useState } from "react";
import AppNav from "../_components/AppNav";
import { mondayOfThisWeekISO } from "../_lib/tasksStore";

type WeeklyRating = "bad" | "ok" | "good" | "excellent";

export default function WeeklyPage() {
  const weekStartISO = mondayOfThisWeekISO();

  const [rating, setRating] = useState<WeeklyRating>("ok");
  const [note, setNote] = useState("");

  const label = useMemo(() => {
    const map: Record<WeeklyRating, string> = {
      bad: "Bad",
      ok: "OK",
      good: "Good",
      excellent: "Excellent",
    };
    return map[rating];
  }, [rating]);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Weekly</h1>
          <p className="mt-1 text-slate-600">
            Week starting <span className="font-medium">{weekStartISO}</span>
          </p>
        </div>

        <AppNav />
      </header>

      <section className="rounded-2xl border bg-white p-6 space-y-6">
        <div>
          <div className="text-sm font-semibold text-slate-900">How was your week?</div>
          <p className="mt-1 text-sm text-slate-600">
            (For now, manual — later we can compute this from tasks.)
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {(["bad", "ok", "good", "excellent"] as WeeklyRating[]).map((v) => {
            const active = rating === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {v.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
          Selected: <span className="font-semibold">{label}</span>
        </div>

        <div>
          <div className="text-xs text-slate-500">Notes (optional)</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
            rows={5}
            placeholder="What worked, what didn’t, what you’ll change next week..."
          />
        </div>

        <div className="text-xs text-slate-500">
          Next step: link this page to Tasks + KRs to generate a weekly “speedometer”.
        </div>
      </section>
    </div>
  );
}
