// app/reports/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AppNav from "../_components/AppNav";
import { loadProjectsState, PROJECTS_STORAGE_KEY, type Project, type ProjectKR } from "../_lib/projectsStore";
import { loadTasks, TASKS_STORAGE_KEY, mondayOfThisWeekISO, type Task } from "../_lib/tasksStore";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function calcKrProgress01(kr: ProjectKR): number {
  const start = Number(kr.startValue ?? 0);
  const cur = Number(kr.currentValue ?? 0);
  const target = Number(kr.targetValue ?? 0);

  // avoid divide by zero / nonsense
  if (!Number.isFinite(start) || !Number.isFinite(cur) || !Number.isFinite(target)) return 0;

  if (kr.direction === "decrease") {
    // decrease from start -> target (target smaller)
    const denom = start - target;
    if (denom === 0) return cur <= target ? 1 : 0;
    return clamp01((start - cur) / denom);
  }

  // increase
  const denom = target - start;
  if (denom === 0) return cur >= target ? 1 : 0;
  return clamp01((cur - start) / denom);
}

function calcCycleTimeProgress01(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

  return clamp01((now - start) / (end - start));
}

function statusFrom(progress01: number, time01: number) {
  // simple heuristic: compare progress vs time
  const delta = progress01 - time01;
  if (delta >= -0.05) return { tone: "green" as const, label: "On track" };
  if (delta >= -0.15) return { tone: "yellow" as const, label: "At risk" };
  return { tone: "red" as const, label: "Off track" };
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjectsState().projects);
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [loaded, setLoaded] = useState(false);

  const weekStartISO = useMemo(() => mondayOfThisWeekISO(), []);

  useEffect(() => {
    // initial
    setProjects(loadProjectsState().projects);
    setTasks(loadTasks());
    setLoaded(true);
  }, []);

  // sync across tabs
  useEffect(() => {
    if (!loaded) return;

    const syncNow = () => {
      setProjects(loadProjectsState().projects);
      setTasks(loadTasks());
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === PROJECTS_STORAGE_KEY || e.key === TASKS_STORAGE_KEY) syncNow();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") syncNow();
    };

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loaded]);

  const weekTasks = useMemo(() => {
    return tasks.filter((t) => t.weekStartISO === weekStartISO);
  }, [tasks, weekStartISO]);

  const cards = useMemo(() => {
    return projects.map((p) => {
      const time01 = calcCycleTimeProgress01(p.cycleStart, p.cycleEnd);

      const krRows = (p.krs ?? []).map((kr) => {
        const progress01 = calcKrProgress01(kr);

        const tks = weekTasks.filter((t) => t.projectId === p.id && t.krId === kr.id);
        const done = tks.filter((t) => t.done).length;
        const total = tks.length;

        return {
          kr,
          progress01,
          done,
          total,
        };
      });

      const avgProgress01 =
        krRows.reduce((a, r) => a + r.progress01, 0) / Math.max(krRows.length, 1);

      const status = statusFrom(avgProgress01, time01);

      return {
        project: p,
        time01,
        avgProgress01,
        status,
        krRows,
      };
    });
  }, [projects, weekTasks]);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-slate-600">
            Weekly snapshot (read-only): Project → Objective → KR → Progress + Tasks.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <AppNav />
          <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
            Week of {weekStartISO || "—"}
          </span>
        </div>
      </header>

      {cards.length === 0 ? (
        <section className="rounded-2xl border bg-white p-6">
          <div className="text-sm text-slate-600">
            No projects yet. Create one in <b>Projects</b>.
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {cards.map((c) => {
            const p = c.project;
            const avgPct = Math.round(c.avgProgress01 * 100);
            const timePct = Math.round(c.time01 * 100);

            const badge =
              c.status.tone === "green"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : c.status.tone === "yellow"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-rose-50 text-rose-700 border-rose-200";

            return (
              <section key={p.id} className="rounded-2xl border bg-white p-6 space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">Project</div>
                    <div className="mt-1 text-xl font-semibold text-slate-900 truncate">{p.name}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      <b>Objective:</b> {p.objectiveTitle || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Cycle: {p.cycleStart || "—"} → {p.cycleEnd || "—"} {p.cycleName ? `• ${p.cycleName}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badge}`}>
                      {c.status.label}
                    </span>
                    <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      Progress {avgPct}% • Time {timePct}%
                    </span>
                  </div>
                </div>

                {/* KRs */}
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-900">Key Results</div>

                  {(p.krs ?? []).length === 0 ? (
                    <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
                      No KRs for this project yet.
                    </div>
                  ) : (
                    c.krRows.map((r) => {
                      const krPct = Math.round(r.progress01 * 100);
                      return (
                        <div key={r.kr.id} className="rounded-2xl border p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs text-slate-500">KR</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">
                                {r.kr.label || "Untitled KR"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {r.kr.direction.toUpperCase()} • {r.kr.unit || "unit"} • Start {r.kr.startValue} • Current{" "}
                                {r.kr.currentValue} • Target {r.kr.targetValue}
                              </div>
                            </div>

                            <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              {krPct}%
                            </span>
                          </div>

                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-slate-900" style={{ width: `${krPct}%` }} />
                          </div>

                          <div className="text-xs text-slate-600">
                            Tasks this week: <b>{r.done}</b> done / <b>{r.total}</b> total
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
