// app/habits/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppNav from "../_components/AppNav";
import {
  type HabitsState,
  loadHabitsState,
  saveHabitsState,
  addHabit,
  renameHabit,
  deleteHabitForever,
  toggleHabitDay,
  mondayOfThisWeekISO,
  getWeekForHabit,
  type DayKey,
} from "../_lib/habitsStore";

const DAYS: { key: DayKey; label: string }[] = [
  { key: "Mon", label: "M" },
  { key: "Tue", label: "T" },
  { key: "Wed", label: "W" },
  { key: "Thu", label: "T" },
  { key: "Fri", label: "F" },
  { key: "Sat", label: "S" },
  { key: "Sun", label: "S" },
];

export default function HabitsPage() {
  const [state, setState] = useState<HabitsState>(() => loadHabitsState());
  const [loaded, setLoaded] = useState(false);

  const [newHabitDraft, setNewHabitDraft] = useState("");
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});

  const focusSinkRef = useRef<HTMLDivElement>(null);
  function blurFieldHard() {
    requestAnimationFrame(() => focusSinkRef.current?.focus());
  }

  const weekStartISO = useMemo(() => mondayOfThisWeekISO(), []);

  useEffect(() => {
    // initial load
    const s = loadHabitsState();
    setState(s);
    setNameDrafts(Object.fromEntries((s.habits ?? []).map((h) => [h.id, h.name])));
    setLoaded(true);

    // cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === "kgrowth:habits.v2") {
        const latest = loadHabitsState();
        setState(latest);
        setNameDrafts(Object.fromEntries((latest.habits ?? []).map((h) => [h.id, h.name])));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveHabitsState(state);
  }, [state, loaded]);

  // completion stats
  const stats = useMemo(() => {
    const habits = state.habits ?? [];
    if (habits.length === 0) return { done: 0, total: 0, pct: 0 };

    let done = 0;
    const total = habits.length * 7;

    for (const h of habits) {
      const wk = getWeekForHabit(state, weekStartISO, h.id);
      for (const d of DAYS) {
        if (wk[d.key]) done += 1;
      }
    }

    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, pct };
  }, [state, weekStartISO]);

  function safeSet(next: HabitsState) {
    setState(next);
  }

  function onAddHabit(raw: string) {
    const name = String(raw ?? "").trim();
    if (!name) return;

    const next = addHabit(name);
    safeSet(next);
    setNewHabitDraft("");

    // habitsStore adds new habit at index 0 (by design). Keep drafts aligned.
    const newId = next.habits?.[0]?.id;
    if (newId) setNameDrafts((prev) => ({ ...prev, [newId]: name }));
  }

  function onRenameHabit(habitId: string, raw: string) {
    const name = String(raw ?? "").trim();
    const currentSaved = state.habits?.find((h) => h.id === habitId)?.name ?? "";

    if (!name) {
      // revert draft if empty
      setNameDrafts((prev) => ({ ...prev, [habitId]: currentSaved }));
      return;
    }
    if (name === currentSaved) return;

    safeSet(renameHabit(habitId, name));
  }

  function onDeleteHabit(habitId: string) {
    const ok = confirm("Delete this habit?");
    if (!ok) return;

    safeSet(deleteHabitForever(habitId));
    setNameDrafts((prev) => {
      const copy = { ...prev };
      delete copy[habitId];
      return copy;
    });
  }

  function onToggle(habitId: string, day: DayKey) {
    safeSet(toggleHabitDay(weekStartISO, habitId, day));
  }

  return (
    <div className="space-y-8">
      <div ref={focusSinkRef} tabIndex={-1} className="sr-only" />

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Habits</h1>
          <p className="mt-1 text-slate-600">Weekly habit tracker — check off days (Mon–Sun).</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <AppNav />
          <div className="flex items-center gap-2">
            <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
              Week of {weekStartISO}
            </span>
            <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
              {stats.pct}% • {stats.done}/{stats.total}
            </span>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-6 space-y-5">
        {/* Add habit */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Add a habit <span className="text-slate-400">(Enter to add)</span>
            </label>

            <input
              value={newHabitDraft}
              onChange={(e) => setNewHabitDraft(e.target.value)}
              onKeyDownCapture={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddHabit((e.currentTarget as HTMLInputElement).value);
                  blurFieldHard();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setNewHabitDraft("");
                  blurFieldHard();
                }
              }}
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Ex: Workout • Read • 10k steps"
            />
          </div>

          <div className="sm:col-span-1 rounded-2xl border bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">How to use</div>
            <div className="mt-2 text-sm text-slate-600">
              Keep habits simple. Check days. Review on Sunday.
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border">
          <div className="min-w-[720px]">
            {/* header row */}
            <div className="grid grid-cols-[1fr_repeat(7,56px)_96px] items-center border-b bg-white px-4 py-3">
              <div className="text-xs font-semibold text-slate-700">Habit</div>
              {DAYS.map((d) => (
                <div key={d.key} className="text-center text-xs font-semibold text-slate-600">
                  {d.label}
                </div>
              ))}
              <div className="text-right text-xs font-semibold text-slate-700">Actions</div>
            </div>

            {/* rows */}
            {(state.habits ?? []).length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-600">
                No habits yet. Add your first one above.
              </div>
            ) : (
              (state.habits ?? []).map((h) => {
                const wk = getWeekForHabit(state, weekStartISO, h.id);
                const rowDone = DAYS.reduce((acc, d) => acc + (wk[d.key] ? 1 : 0), 0);

                return (
                  <div
                    key={h.id}
                    className="grid grid-cols-[1fr_repeat(7,56px)_96px] items-center border-b px-4 py-3"
                  >
                    {/* name */}
                    <div className="min-w-0 pr-3">
                      <input
                        value={nameDrafts[h.id] ?? h.name}
                        onChange={(e) =>
                          setNameDrafts((prev) => ({ ...prev, [h.id]: e.target.value }))
                        }
                        onKeyDownCapture={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            onRenameHabit(h.id, (e.currentTarget as HTMLInputElement).value);
                            blurFieldHard();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            setNameDrafts((prev) => ({ ...prev, [h.id]: h.name }));
                            blurFieldHard();
                          }
                        }}
                        onBlur={() => onRenameHabit(h.id, nameDrafts[h.id] ?? h.name)}
                        className="w-full min-w-0 rounded-lg border px-3 py-2 text-sm font-medium"
                      />
                      <div className="mt-1 text-xs text-slate-500">{rowDone}/7 checked</div>
                    </div>

                    {/* day cells */}
                    {DAYS.map((d) => {
                      const checked = Boolean(wk[d.key]);
                      return (
                        <div key={d.key} className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => onToggle(h.id, d.key)}
                            className={`h-8 w-8 rounded-lg border transition ${
                              checked
                                ? "bg-slate-900 border-slate-900"
                                : "bg-white hover:bg-slate-50"
                            }`}
                            aria-label={`${h.name} ${d.key}`}
                            title={d.key}
                          />
                        </div>
                      );
                    })}

                    {/* actions */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => onDeleteHabit(h.id)}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
