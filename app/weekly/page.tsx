// app/weekly/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AppNav from "../_components/AppNav";
import { loadTasks, TASKS_STORAGE_KEY, mondayOfThisWeekISO, type Task } from "../_lib/tasksStore";
import { loadProjectsState, PROJECTS_STORAGE_KEY, type Project } from "../_lib/projectsStore";

type WeeklyRating = "bad" | "ok" | "good" | "excellent";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function pct(n01: number) {
  return Math.round(clamp01(n01) * 100);
}
function ratingFromDoneRatio(done: number, total: number): WeeklyRating {
  if (total <= 0) return "ok";
  const r = done / total;
  if (r >= 0.9) return "excellent";
  if (r >= 0.7) return "good";
  if (r >= 0.4) return "ok";
  return "bad";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseISODate(iso: string) {
  // expects YYYY-MM-DD
  const [y, m, d] = (iso || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function addDaysISO(iso: string, days: number) {
  const dt = parseISODate(iso);
  if (!dt) return iso;
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

function formatDowLabel(i: number) {
  // Monday=0
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return names[i] ?? "Day";
}

function toCalStamp(d: Date) {
  return (
    d.getFullYear() +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    "T" +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    "00"
  );
}

function googleCalendarUrl(task: Task, projectName: string, krName: string) {
  const text = task.title || "Task";
  const detailsParts = [
    projectName ? `Project: ${projectName}` : "",
    krName ? `KR: ${krName}` : "",
    task.notes ? `\nNotes:\n${task.notes}` : "",
  ].filter(Boolean);

  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", text);
  params.set("details", detailsParts.join("\n"));

  if (task.dueDateISO) {
    const [y, m, dd] = task.dueDateISO.split("-").map(Number);
    if (y && m && dd) {
      if (task.startTime) {
        const [hh, mm] = task.startTime.split(":").map(Number);
        const start = new Date(y, m - 1, dd, hh || 9, mm || 0, 0);
        const dur = Number(task.durationMin ?? 30);
        const end = new Date(start.getTime() + Math.max(5, dur) * 60_000);
        params.set("dates", `${toCalStamp(start)}/${toCalStamp(end)}`);
      } else {
        // all-day (end = next day)
        const stamp = (dt: Date) =>
          `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}`;
        const start = new Date(y, m - 1, dd, 0, 0, 0);
        const end = new Date(y, m - 1, dd + 1, 0, 0, 0);
        params.set("dates", `${stamp(start)}/${stamp(end)}`);
      }
    }
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function WeeklyPage() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjectsState().projects);
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [loaded, setLoaded] = useState(false);

  // ✅ week selector (default: this week)
  const [weekStartISO, setWeekStartISO] = useState<string>(() => mondayOfThisWeekISO());

  // manual reflection (still useful)
  const [rating, setRating] = useState<WeeklyRating>("ok");
  const [note, setNote] = useState("");

  useEffect(() => {
    // initial
    setProjects(loadProjectsState().projects);
    setTasks(loadTasks());
    setLoaded(true);
  }, []);

  // sync across tabs / after returning to tab
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

  const projectById = useMemo(() => {
    return Object.fromEntries((projects ?? []).map((p) => [p.id, p]));
  }, [projects]);

  const projectLabel = (projectId: string) =>
    projectById[projectId]?.name || (projectId ? "Unknown project" : "Unassigned project");

  const krLabel = (projectId: string, krId: string) => {
    const p = projectById[projectId];
    const k = p?.krs?.find((x) => x.id === krId);
    return k?.label || (krId ? "Unknown KR" : "Unassigned KR");
  };

  const weekTasks = useMemo(() => {
    return tasks
      .filter((t) => t.weekStartISO === weekStartISO)
      .sort((a, b) => (a.done === b.done ? b.updatedAt - a.updatedAt : a.done ? 1 : -1));
  }, [tasks, weekStartISO]);

  const doneCount = weekTasks.filter((t) => t.done).length;
  const totalCount = weekTasks.length;
  const doneRatio01 = totalCount > 0 ? doneCount / totalCount : 0;

  // Suggest a rating based on execution (but user can override)
  useEffect(() => {
    if (note.trim().length === 0) {
      setRating((cur) => (cur ? cur : ratingFromDoneRatio(doneCount, totalCount)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, totalCount]);

  const ratingLabel = useMemo(() => {
    const map: Record<WeeklyRating, string> = {
      bad: "Bad",
      ok: "OK",
      good: "Good",
      excellent: "Excellent",
    };
    return map[rating];
  }, [rating]);

  const grouped = useMemo(() => {
    // Project -> KR -> tasks
    const map = new Map<
      string,
      {
        project: Project | null;
        total: number;
        done: number;
        krs: Map<string, { krId: string; krName: string; total: number; done: number; tasks: Task[] }>;
      }
    >();

    for (const t of weekTasks) {
      const prjId = t.projectId || "unassigned";
      if (!map.has(prjId)) {
        map.set(prjId, {
          project: projectById[prjId] ?? null,
          total: 0,
          done: 0,
          krs: new Map(),
        });
      }
      const bucket = map.get(prjId)!;
      bucket.total += 1;
      bucket.done += t.done ? 1 : 0;

      const kid = t.krId || "unassigned";
      if (!bucket.krs.has(kid)) {
        bucket.krs.set(kid, {
          krId: kid,
          krName: kid === "unassigned" ? "Unassigned KR" : krLabel(prjId, kid),
          total: 0,
          done: 0,
          tasks: [],
        });
      }
      const krb = bucket.krs.get(kid)!;
      krb.total += 1;
      krb.done += t.done ? 1 : 0;
      krb.tasks.push(t);
    }

    const rows = Array.from(map.entries()).map(([projectId, v]) => {
      const krs = Array.from(v.krs.values()).sort((a, b) => b.total - a.total);
      return {
        projectId,
        projectName:
          v.project?.name ||
          (projectId === "unassigned" ? "Unassigned project" : "Unknown project"),
        total: v.total,
        done: v.done,
        krs,
      };
    });

    // sort: most pending first
    rows.sort((a, b) => (a.done === a.total ? 1 : 0) - (b.done === b.total ? 1 : 0));
    return rows;
  }, [weekTasks, projectById]);

  const scheduledCount = useMemo(() => {
    return weekTasks.filter(
      (t) => (t.dueDateISO && t.dueDateISO.trim()) || (t.startTime && t.startTime.trim())
    ).length;
  }, [weekTasks]);

  // ✅ AGENDA: Mon–Sun for selected week, using dueDateISO
  const days = useMemo(() => {
    const base = weekStartISO;
    return Array.from({ length: 7 }).map((_, i) => ({
      i,
      dow: formatDowLabel(i),
      dateISO: addDaysISO(base, i),
    }));
  }, [weekStartISO]);

  const agendaByDay = useMemo(() => {
    const map: Record<string, { scheduled: Task[]; unscheduled: Task[] }> = Object.fromEntries(
      days.map((d) => [d.dateISO, { scheduled: [], unscheduled: [] }])
    );

    for (const t of weekTasks) {
      const dateISO = (t.dueDateISO || "").trim();
      if (!dateISO) continue;
      if (!map[dateISO]) continue; // date not inside selected week

      const hasTime = (t.startTime || "").trim().length > 0;
      if (hasTime) map[dateISO].scheduled.push(t);
      else map[dateISO].unscheduled.push(t);
    }

    for (const key of Object.keys(map)) {
      map[key].scheduled.sort((a, b) => {
        const ta = (a.startTime || "").trim();
        const tb = (b.startTime || "").trim();
        if (ta !== tb) return ta.localeCompare(tb);
        return (a.title || "").localeCompare(b.title || "");
      });
      map[key].unscheduled.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    return map;
  }, [weekTasks, days]);

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

      {/* ✅ WEEK SELECTOR */}
      <section className="rounded-2xl border bg-white p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Week selector</div>
            <div className="mt-1 text-sm text-slate-600">
              Navigate weeks to review execution and agenda.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStartISO((cur) => addDaysISO(cur, -7))}
              className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Prev
            </button>

            <button
              type="button"
              onClick={() => setWeekStartISO(mondayOfThisWeekISO())}
              className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              This week
            </button>

            <button
              type="button"
              onClick={() => setWeekStartISO((cur) => addDaysISO(cur, 7))}
              className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* EXECUTION SUMMARY */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Execution (from Tasks)</div>
            <div className="mt-1 text-sm text-slate-600">
              Done <b>{doneCount}</b> / <b>{totalCount}</b> • Scheduled: <b>{scheduledCount}</b>
            </div>
          </div>

          <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
            {pct(doneRatio01)}%
          </span>
        </div>

        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct(doneRatio01)}%` }} />
        </div>

        {totalCount === 0 ? (
          <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
            No tasks for this week yet. Add tasks in <b>Tasks</b> to populate this page.
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => {
              const p01 = g.total > 0 ? g.done / g.total : 0;
              return (
                <div key={g.projectId} className="rounded-2xl border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500">Project</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                        {g.projectName}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Tasks: <b>{g.done}</b> done / <b>{g.total}</b> total
                      </div>
                    </div>

                    <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      {pct(p01)}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct(p01)}%` }} />
                  </div>

                  <div className="space-y-2">
                    {g.krs.map((k) => {
                      const k01 = k.total > 0 ? k.done / k.total : 0;
                      return (
                        <div key={k.krId} className="rounded-xl border bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs text-slate-500">KR</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                                {k.krName || "Untitled KR"}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                Tasks: <b>{k.done}</b> / <b>{k.total}</b>
                              </div>
                            </div>

                            <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              {pct(k01)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ✅ AGENDA (Mon–Sun) */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Agenda (Mon–Sun)</div>
            <div className="mt-1 text-sm text-slate-600">
              Uses <b>dueDateISO</b> + <b>startTime</b> + <b>duration</b>. Tasks without date won’t appear here.
            </div>
          </div>

          <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
            Week of {weekStartISO}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-7">
          {days.map((d) => {
            const bucket = agendaByDay[d.dateISO] || { scheduled: [], unscheduled: [] };
            const scheduled = bucket.scheduled;
            const unscheduled = bucket.unscheduled;

            return (
              <div key={d.dateISO} className="rounded-2xl border p-3 space-y-3">
                <div>
                  <div className="text-xs text-slate-500">{d.dow}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{d.dateISO}</div>
                </div>

                {scheduled.length === 0 && unscheduled.length === 0 ? (
                  <div className="rounded-xl border bg-slate-50 p-3 text-xs text-slate-600">
                    No tasks
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scheduled.map((t) => {
                      const when = `${t.startTime} • ${t.durationMin ?? 30}m`;
                      const calHref = googleCalendarUrl(
                        t,
                        projectLabel(t.projectId),
                        krLabel(t.projectId, t.krId)
                      );
                      return (
                        <div key={t.id} className="rounded-xl border bg-white p-2">
                          <div className="text-[11px] text-slate-500">{when}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-900">
                            {t.done ? "✅ " : "⬜️ "}
                            {t.title}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-600">
                            {projectLabel(t.projectId)} • {krLabel(t.projectId, t.krId)}
                          </div>
                          <a
                            href={calHref}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-[11px] font-semibold text-slate-700 underline"
                          >
                            Add to Google Calendar
                          </a>
                        </div>
                      );
                    })}

                    {unscheduled.length > 0 && (
                      <div className="rounded-xl border bg-slate-50 p-2">
                        <div className="text-[11px] font-semibold text-slate-700">Unscheduled</div>
                        <div className="mt-2 space-y-1">
                          {unscheduled.map((t) => {
                            const calHref = googleCalendarUrl(
                              t,
                              projectLabel(t.projectId),
                              krLabel(t.projectId, t.krId)
                            );
                            return (
                              <div key={t.id} className="flex items-start justify-between gap-2">
                                <div className="text-[11px] text-slate-900 min-w-0 truncate">
                                  {t.done ? "✅ " : "⬜️ "}
                                  {t.title}
                                </div>
                                <a
                                  href={calHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-semibold text-slate-700 underline shrink-0"
                                >
                                  Cal
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* REFLECTION (MANUAL) */}
      <section className="rounded-2xl border bg-white p-6 space-y-6">
        <div>
          <div className="text-sm font-semibold text-slate-900">Reflection</div>
          <p className="mt-1 text-sm text-slate-600">
            This is still manual (by design). Execution above is computed from Tasks.
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
          Selected: <span className="font-semibold">{ratingLabel}</span>
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
      </section>
    </div>
  );
}
