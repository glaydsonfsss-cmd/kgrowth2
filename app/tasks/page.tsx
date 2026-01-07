// app/tasks/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import AppNav from "../_components/AppNav";
import { loadProjectsState, PROJECTS_STORAGE_KEY, type Project } from "../_lib/projectsStore";
import {
  loadTasks,
  patchTasks,
  mondayOfThisWeekISO,
  TASKS_STORAGE_KEY,
  type Task,
} from "../_lib/tasksStore";

function pad2(n: number) {
  return String(n).padStart(2, "0");
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

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjectsState().projects);
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [loaded, setLoaded] = useState(false);

  // drafts: create
  const [newTaskDraft, setNewTaskDraft] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>("");
  const [newTaskKrId, setNewTaskKrId] = useState<string>("");

  // drafts: edit
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [projectDrafts, setProjectDrafts] = useState<Record<string, string>>({});
  const [krDrafts, setKrDrafts] = useState<Record<string, string>>({});

  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [dueDateDrafts, setDueDateDrafts] = useState<Record<string, string>>({});
  const [startTimeDrafts, setStartTimeDrafts] = useState<Record<string, string>>({});
  const [durationDrafts, setDurationDrafts] = useState<Record<string, number>>({});

  // focus sink
  const focusSinkRef = useRef<HTMLDivElement>(null);
  function blurFieldHard() {
    requestAnimationFrame(() => focusSinkRef.current?.focus());
  }

  const weekStartISO = mondayOfThisWeekISO();

  const selectedProjectForNew = useMemo(() => {
    return projects.find((p) => p.id === newTaskProjectId) ?? null;
  }, [projects, newTaskProjectId]);

  const newKrOptions = useMemo(() => {
    const krs = selectedProjectForNew?.krs ?? [];
    return krs.map((k) => ({ id: k.id, label: k.label || "Untitled KR" }));
  }, [selectedProjectForNew]);

  // labels
  const projectLabel = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.name || "Unassigned project";

  const krLabel = (projectId: string, krId: string) => {
    const p = projects.find((p) => p.id === projectId);
    const k = p?.krs?.find((k) => k.id === krId);
    return k?.label || "Unassigned KR";
  };

  // initial load
  useEffect(() => {
    const ps = loadProjectsState().projects;
    const ts = loadTasks();

    setProjects(ps);
    setTasks(ts);

    setTitleDrafts(Object.fromEntries(ts.map((t) => [t.id, t.title])));
    setProjectDrafts(Object.fromEntries(ts.map((t) => [t.id, t.projectId || ""])));
    setKrDrafts(Object.fromEntries(ts.map((t) => [t.id, t.krId || ""])));

    setNotesDrafts(Object.fromEntries(ts.map((t) => [t.id, t.notes || ""])));
    setDueDateDrafts(Object.fromEntries(ts.map((t) => [t.id, t.dueDateISO || ""])));
    setStartTimeDrafts(Object.fromEntries(ts.map((t) => [t.id, t.startTime || ""])));
    setDurationDrafts(Object.fromEntries(ts.map((t) => [t.id, Number(t.durationMin ?? 30)])));

    // default new task project/kr
    const firstProject = ps[0];
    const firstKr = firstProject?.krs?.[0];
    setNewTaskProjectId(firstProject?.id ?? "");
    setNewTaskKrId(firstKr?.id ?? "");

    setLoaded(true);
  }, []);

  // realtime sync
  useEffect(() => {
    if (!loaded) return;

    const syncNow = () => {
      const ps = loadProjectsState().projects;
      setProjects(ps);

      const ts = loadTasks();
      setTasks(ts);

      // keep drafts aligned
      const ensureDrafts = <T,>(
        getValue: (t: Task) => T,
        setter: React.Dispatch<React.SetStateAction<Record<string, any>>>
      ) => {
        setter((prev) => {
          const next = { ...prev };
          for (const t of ts) if (next[t.id] === undefined) next[t.id] = getValue(t);
          for (const id of Object.keys(next)) if (!ts.some((t) => t.id === id)) delete next[id];
          return next;
        });
      };

      ensureDrafts((t) => t.title, setTitleDrafts);
      ensureDrafts((t) => t.projectId || "", setProjectDrafts);
      ensureDrafts((t) => t.krId || "", setKrDrafts);

      ensureDrafts((t) => t.notes || "", setNotesDrafts);
      ensureDrafts((t) => t.dueDateISO || "", setDueDateDrafts);
      ensureDrafts((t) => t.startTime || "", setStartTimeDrafts);
      ensureDrafts((t) => Number(t.durationMin ?? 30), setDurationDrafts);

      // keep "new task" selectors valid
      if (ps.length === 0) {
        setNewTaskProjectId("");
        setNewTaskKrId("");
        return;
      }

      setNewTaskProjectId((cur) => (cur && ps.some((p) => p.id === cur) ? cur : ps[0].id));

      const p = ps.find((x) => x.id === (newTaskProjectId || ps[0].id)) ?? ps[0];
      const krs = p.krs ?? [];
      setNewTaskKrId((cur) => (cur && krs.some((k) => k.id === cur) ? cur : (krs[0]?.id ?? "")));
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === TASKS_STORAGE_KEY || e.key === PROJECTS_STORAGE_KEY) syncNow();
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
  }, [loaded, newTaskProjectId]);

  const weekTasks = useMemo(() => {
    return tasks
      .filter((t) => t.weekStartISO === weekStartISO)
      .sort((a, b) => (a.done === b.done ? b.updatedAt - a.updatedAt : a.done ? 1 : -1));
  }, [tasks, weekStartISO]);

  const doneCount = weekTasks.filter((t) => t.done).length;
  const totalCount = weekTasks.length;

  // -------- actions ----------
  function addTask(raw: string) {
    const title = (raw ?? "").trim();
    if (!title) return;

    if (!newTaskProjectId) {
      alert("Select a Project before adding a task.");
      return;
    }
    if (!newTaskKrId) {
      alert("Select a KR before adding a task.");
      return;
    }

    const now = Date.now();
    const newTask: Task = {
      id: `t-${now}-${Math.random().toString(16).slice(2)}`,
      weekStartISO,
      projectId: newTaskProjectId,
      krId: newTaskKrId,
      title,
      done: false,
      notes: "",
      dueDateISO: "",
      startTime: "",
      durationMin: 30,
      createdAt: now,
      updatedAt: now,
    };

    const next = patchTasks((prev) => [newTask, ...prev]);
    setTasks(next);

    setTitleDrafts((p) => ({ ...p, [newTask.id]: newTask.title }));
    setProjectDrafts((p) => ({ ...p, [newTask.id]: newTask.projectId }));
    setKrDrafts((p) => ({ ...p, [newTask.id]: newTask.krId }));

    setNotesDrafts((p) => ({ ...p, [newTask.id]: "" }));
    setDueDateDrafts((p) => ({ ...p, [newTask.id]: "" }));
    setStartTimeDrafts((p) => ({ ...p, [newTask.id]: "" }));
    setDurationDrafts((p) => ({ ...p, [newTask.id]: 30 }));

    setNewTaskDraft("");
  }

  function toggleDone(taskId: string) {
    const now = Date.now();
    const next = patchTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done, updatedAt: now } : t))
    );
    setTasks(next);
  }

  function deleteTask(taskId: string) {
    const next = patchTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTasks(next);

    const drop = <T,>(setter: React.Dispatch<React.SetStateAction<Record<string, T>>>) => {
      setter((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
    };

    drop(setTitleDrafts);
    drop(setProjectDrafts);
    drop(setKrDrafts);
    drop(setNotesDrafts);
    drop(setDueDateDrafts);
    drop(setStartTimeDrafts);
    drop(setDurationDrafts);
  }

  function commitTitle(taskId: string, raw: string) {
    const title = (raw ?? "").trim();
    const currentSaved = tasks.find((t) => t.id === taskId)?.title ?? "";

    if (!title) {
      setTitleDrafts((prev) => ({ ...prev, [taskId]: currentSaved }));
      return;
    }
    if (currentSaved.trim() === title) return;

    const now = Date.now();
    const next = patchTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, title, updatedAt: now } : t))
    );
    setTasks(next);
  }

  function commitProject(taskId: string, nextProjectId: string) {
    const projectId = String(nextProjectId ?? "");
    const currentSaved = tasks.find((t) => t.id === taskId)?.projectId ?? "";
    if (currentSaved === projectId) return;

    // if project changes, KR must reset
    const p = projects.find((p) => p.id === projectId);
    const firstKrId = p?.krs?.[0]?.id ?? "";

    const now = Date.now();
    const next = patchTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, projectId, krId: firstKrId, updatedAt: now } : t
      )
    );
    setTasks(next);

    setProjectDrafts((prev) => ({ ...prev, [taskId]: projectId }));
    setKrDrafts((prev) => ({ ...prev, [taskId]: firstKrId }));
  }

  function commitKr(taskId: string, nextKrId: string) {
    const krId = String(nextKrId ?? "");
    const currentSaved = tasks.find((t) => t.id === taskId)?.krId ?? "";
    if (currentSaved === krId) return;

    const now = Date.now();
    const next = patchTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, krId, updatedAt: now } : t))
    );
    setTasks(next);
  }

  function commitNotes(taskId: string, raw: string) {
    const notes = String(raw ?? "");
    const currentSaved = tasks.find((t) => t.id === taskId)?.notes ?? "";
    if (currentSaved === notes) return;

    const now = Date.now();
    const next = patchTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, notes, updatedAt: now } : t))
    );
    setTasks(next);
  }

  function commitDueDate(taskId: string, dueDateISO: string) {
    const currentSaved = tasks.find((t) => t.id === taskId)?.dueDateISO ?? "";
    if (currentSaved === dueDateISO) return;

    const now = Date.now();
    const next = patchTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, dueDateISO, updatedAt: now } : t))
    );
    setTasks(next);
  }

  function commitStartTime(taskId: string, startTime: string) {
    const currentSaved = tasks.find((t) => t.id === taskId)?.startTime ?? "";
    if (currentSaved === startTime) return;

    const now = Date.now();
    const next = patchTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, startTime, updatedAt: now } : t))
    );
    setTasks(next);
  }

  function commitDuration(taskId: string, durationMin: number) {
    const currentSaved = Number(tasks.find((t) => t.id === taskId)?.durationMin ?? 30);
    if (currentSaved === durationMin) return;

    const now = Date.now();
    const next = patchTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, durationMin, updatedAt: now } : t))
    );
    setTasks(next);
  }

  return (
    <div className="space-y-8">
      <div ref={focusSinkRef} tabIndex={-1} className="sr-only" />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-slate-900">Tasks</h1>
          <p className="mt-1 text-slate-600">
            Weekly execution — link each task to a Project + KR.
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          <AppNav />
          <div className="text-sm text-slate-600">
            Week: <span className="font-semibold text-slate-900">{weekStartISO}</span>
          </div>
        </div>
      </header>

      {/* Add task */}
      <section className="rounded-2xl border bg-white p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900">Add task</div>
            <div className="mt-1 text-sm text-slate-600">
              Create tasks for the current week and assign them to Project + KR.
            </div>

            <input
              value={newTaskDraft}
              onChange={(e) => setNewTaskDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTask(newTaskDraft);
              }}
              className="mt-3 w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Ex: Draft new landing page section…"
            />
          </div>

          <div className="grid w-full gap-3 md:w-[520px] md:grid-cols-3">
            <div>
              <div className="text-xs text-slate-500">Project</div>
              <select
                value={newTaskProjectId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setNewTaskProjectId(pid);
                  const p = projects.find((x) => x.id === pid);
                  setNewTaskKrId(p?.krs?.[0]?.id ?? "");
                }}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
              >
                {projects.length === 0 && <option value="">No projects</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || "Untitled project"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-500">KR</div>
              <select
                value={newTaskKrId}
                onChange={(e) => setNewTaskKrId(e.target.value)}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
              >
                {newKrOptions.length === 0 && <option value="">No KRs</option>}
                {newKrOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => addTask(newTaskDraft)}
              className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm">
          <div className="text-slate-600">
            Progress:{" "}
            <span className="font-semibold text-slate-900">
              {doneCount}/{totalCount}
            </span>{" "}
            done
          </div>

          <div className="w-40 rounded-full bg-slate-100 h-2 overflow-hidden">
            <div
              className="h-2 bg-slate-900"
              style={{
                width: totalCount === 0 ? "0%" : `${Math.round((doneCount / totalCount) * 100)}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* List */}
      <section className="space-y-3">
        {weekTasks.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600">
            No tasks this week yet.
          </div>
        ) : (
          weekTasks.map((t) => {
            const p = projects.find((x) => x.id === (projectDrafts[t.id] ?? t.projectId));
            const krs = p?.krs ?? [];

            const calHref = googleCalendarUrl(
              {
                ...t,
                notes: notesDrafts[t.id] ?? t.notes ?? "",
                dueDateISO: dueDateDrafts[t.id] ?? t.dueDateISO ?? "",
                startTime: startTimeDrafts[t.id] ?? t.startTime ?? "",
                durationMin: Number(durationDrafts[t.id] ?? t.durationMin ?? 30),
              },
              projectLabel(t.projectId),
              krLabel(t.projectId, t.krId)
            );

            return (
              <div key={t.id} className="rounded-2xl border bg-white p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDone(t.id)}
                        className={`h-6 w-6 rounded-md border flex items-center justify-center ${
                          t.done ? "bg-slate-900 border-slate-900 text-white" : "bg-white"
                        }`}
                        aria-label="Toggle done"
                      >
                        {t.done ? "✓" : ""}
                      </button>

                      <input
                        value={titleDrafts[t.id] ?? t.title}
                        onChange={(e) => setTitleDrafts((p) => ({ ...p, [t.id]: e.target.value }))}
                        onBlur={() => commitTitle(t.id, titleDrafts[t.id] ?? t.title)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                          t.done ? "bg-slate-50 text-slate-600" : "bg-white text-slate-900"
                        }`}
                      />
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      Project: <span className="font-medium">{projectLabel(t.projectId)}</span>{" "}
                      • KR: <span className="font-medium">{krLabel(t.projectId, t.krId)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={calHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Add to Google Calendar
                    </a>

                    <button
                      type="button"
                      onClick={() => deleteTask(t.id)}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Project / KR selectors */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Project</div>
                    <select
                      value={projectDrafts[t.id] ?? t.projectId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setProjectDrafts((p2) => ({ ...p2, [t.id]: v }));
                        commitProject(t.id, v);
                      }}
                      className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                    >
                      {projects.map((p3) => (
                        <option key={p3.id} value={p3.id}>
                          {p3.name || "Untitled project"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">KR</div>
                    <select
                      value={krDrafts[t.id] ?? t.krId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setKrDrafts((p2) => ({ ...p2, [t.id]: v }));
                        commitKr(t.id, v);
                      }}
                      className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                    >
                      {krs.length === 0 && <option value="">No KRs</option>}
                      {krs.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.label || "Untitled KR"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <div className="text-xs text-slate-500">Notes</div>
                  <textarea
                    value={notesDrafts[t.id] ?? ""}
                    onChange={(e) => setNotesDrafts((p2) => ({ ...p2, [t.id]: e.target.value }))}
                    onBlur={() => commitNotes(t.id, notesDrafts[t.id] ?? "")}
                    className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Observações rápidas, contexto, riscos, links…"
                  />
                </div>

                {/* Schedule */}
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div>
                    <div className="text-xs text-slate-500">Date</div>
                    <input
                      type="date"
                      value={dueDateDrafts[t.id] ?? ""}
                      onChange={(e) =>
                        setDueDateDrafts((p2) => ({ ...p2, [t.id]: e.target.value }))
                      }
                      onBlur={() => commitDueDate(t.id, dueDateDrafts[t.id] ?? "")}
                      className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Start</div>
                    <input
                      type="time"
                      value={startTimeDrafts[t.id] ?? ""}
                      onChange={(e) =>
                        setStartTimeDrafts((p2) => ({ ...p2, [t.id]: e.target.value }))
                      }
                      onBlur={() => commitStartTime(t.id, startTimeDrafts[t.id] ?? "")}
                      className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Duration</div>
                    <select
                      value={String(durationDrafts[t.id] ?? 30)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setDurationDrafts((p2) => ({ ...p2, [t.id]: v }));
                        commitDuration(t.id, v);
                      }}
                      className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                    >
                      {[15, 30, 45, 60, 90, 120].map((m) => (
                        <option key={m} value={m}>
                          {m} min
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        blurFieldHard();
                        window.open(calHref, "_blank", "noopener,noreferrer");
                      }}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Open Calendar
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Updated: {new Date(t.updatedAt).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
