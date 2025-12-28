// app/tasks/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppNav from "../_components/AppNav";
import { loadProjectsState, PROJECTS_STORAGE_KEY, type Project } from "../_lib/projectsStore";
import { loadTasks, patchTasks, mondayOfThisWeekISO, TASKS_STORAGE_KEY, type Task } from "../_lib/tasksStore";

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjectsState().projects);
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [loaded, setLoaded] = useState(false);

  // drafts
  const [newTaskDraft, setNewTaskDraft] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>("");
  const [newTaskKrId, setNewTaskKrId] = useState<string>("");

  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [projectDrafts, setProjectDrafts] = useState<Record<string, string>>({});
  const [krDrafts, setKrDrafts] = useState<Record<string, string>>({});

  // focus sink
  const focusSinkRef = useRef<HTMLDivElement>(null);
  function blurFieldHard() {
    requestAnimationFrame(() => focusSinkRef.current?.focus());
  }

  const weekStartISO = mondayOfThisWeekISO();

  // derived: selected project + KR options
  const selectedProjectForNew = useMemo(() => {
    return projects.find((p) => p.id === newTaskProjectId) ?? null;
  }, [projects, newTaskProjectId]);

  const newKrOptions = useMemo(() => {
    const krs = selectedProjectForNew?.krs ?? [];
    return krs.map((k) => ({ id: k.id, label: k.label || "Untitled KR" }));
  }, [selectedProjectForNew]);

  // initial load
  useEffect(() => {
    const ps = loadProjectsState().projects;
    const ts = loadTasks();

    setProjects(ps);
    setTasks(ts);

    setTitleDrafts(Object.fromEntries(ts.map((t) => [t.id, t.title])));
    setProjectDrafts(Object.fromEntries(ts.map((t) => [t.id, t.projectId || ""])));
    setKrDrafts(Object.fromEntries(ts.map((t) => [t.id, t.krId || ""])));

    // default new task project/kr
    const firstProject = ps[0];
    const firstKr = firstProject?.krs?.[0];

    setNewTaskProjectId(firstProject?.id ?? "");
    setNewTaskKrId(firstKr?.id ?? "");

    setLoaded(true);
  }, []);

  // realtime sync (storage / visibility)
  useEffect(() => {
    if (!loaded) return;

    const syncNow = () => {
      const ps = loadProjectsState().projects;
      setProjects(ps);

      const ts = loadTasks();
      setTasks(ts);

      // keep drafts aligned
      setTitleDrafts((prev) => {
        const next = { ...prev };
        for (const t of ts) if (next[t.id] === undefined) next[t.id] = t.title;
        for (const id of Object.keys(next)) if (!ts.some((t) => t.id === id)) delete next[id];
        return next;
      });

      setProjectDrafts((prev) => {
        const next = { ...prev };
        for (const t of ts) if (next[t.id] === undefined) next[t.id] = t.projectId || "";
        for (const id of Object.keys(next)) if (!ts.some((t) => t.id === id)) delete next[id];
        return next;
      });

      setKrDrafts((prev) => {
        const next = { ...prev };
        for (const t of ts) if (next[t.id] === undefined) next[t.id] = t.krId || "";
        for (const id of Object.keys(next)) if (!ts.some((t) => t.id === id)) delete next[id];
        return next;
      });

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

  // helpers for labels
  const projectLabel = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.name || "Unassigned project";

  const krLabel = (projectId: string, krId: string) => {
    const p = projects.find((p) => p.id === projectId);
    const k = p?.krs?.find((k) => k.id === krId);
    return k?.label || "Unassigned KR";
  };

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
      createdAt: now,
      updatedAt: now,
    };

    const next = patchTasks((prev) => [newTask, ...prev]);
    setTasks(next);
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
    setTitleDrafts((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
    setProjectDrafts((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
    setKrDrafts((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
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

    // if project changes, KR must reset (filtered by project)
    const p = projects.find((p) => p.id === projectId);
    const firstKrId = p?.krs?.[0]?.id ?? "";

    const now = Date.now();
    const next = patchTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, projectId, krId: firstKrId, updatedAt: now }
          : t
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

  return (
    <div className="space-y-8">
      <div ref={focusSinkRef} tabIndex={-1} className="sr-only" />

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Tasks</h1>
          <p className="mt-1 text-slate-600">
            Execution units — every task links to <b>Project + KR</b>.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <AppNav />
          <div className="flex items-center gap-2">
            <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
              Week of {weekStartISO || "—"}
            </span>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            {/* Add task */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-700">Project</label>
                <select
                  value={newTaskProjectId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setNewTaskProjectId(pid);
                    const p = projects.find((p) => p.id === pid);
                    setNewTaskKrId(p?.krs?.[0]?.id ?? "");
                  }}
                  className="mt-2 w-full rounded-xl border px-3 py-3 text-sm bg-white"
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
                {projects.length === 0 && (
                  <div className="mt-2 text-xs text-rose-600">
                    Create at least 1 project before adding tasks.
                  </div>
                )}
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-700">KR</label>
                <select
                  value={newTaskKrId}
                  onChange={(e) => setNewTaskKrId(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-3 text-sm bg-white"
                  disabled={!newTaskProjectId || newKrOptions.length === 0}
                >
                  {newKrOptions.length === 0 ? (
                    <option value="">No KRs for this project</option>
                  ) : (
                    newKrOptions.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))
                  )}
                </select>
                {newTaskProjectId && newKrOptions.length === 0 && (
                  <div className="mt-2 text-xs text-rose-600">
                    Add at least 1 KR in <b>Projects</b> to link tasks.
                  </div>
                )}
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-700">
                  Add a task <span className="text-slate-400">(Enter to add)</span>
                </label>
                <input
                  value={newTaskDraft}
                  onChange={(e) => setNewTaskDraft(e.target.value)}
                  onKeyDownCapture={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      addTask((e.currentTarget as HTMLInputElement).value);
                      blurFieldHard();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      setNewTaskDraft("");
                      blurFieldHard();
                    }
                  }}
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Ex: Draft landing page copy"
                  disabled={projects.length === 0 || !newTaskProjectId || !newTaskKrId}
                />
              </div>
            </div>

            {/* List */}
            <div className="mt-6 space-y-3">
              {weekTasks.length === 0 ? (
                <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
                  No tasks for this week yet. Add your first one above.
                </div>
              ) : (
                weekTasks.map((t) => {
                  const isProjectMissing = !String(t.projectId ?? "").trim();
                  const isKrMissing = !String(t.krId ?? "").trim();

                  const p = projects.find((p) => p.id === (projectDrafts[t.id] ?? t.projectId)) ?? null;
                  const filteredKrs = (p?.krs ?? []).map((k) => ({ id: k.id, label: k.label || "Untitled KR" }));

                  return (
                    <div key={t.id} className="flex items-start gap-3 rounded-2xl border bg-white p-4">
                      <button
                        onClick={() => toggleDone(t.id)}
                        className={`mt-1 h-5 w-5 shrink-0 rounded border ${
                          t.done ? "bg-slate-900 border-slate-900" : "bg-white"
                        }`}
                        aria-label={t.done ? "Mark as not done" : "Mark as done"}
                        title={t.done ? "Done" : "Not done"}
                      />

                      <div className="min-w-0 flex-1 space-y-3">
                        {/* Project + KR */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-700">Project</label>
                            <select
                              value={projectDrafts[t.id] ?? t.projectId ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setProjectDrafts((prev) => ({ ...prev, [t.id]: v }));
                                commitProject(t.id, v);
                              }}
                              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white ${
                                isProjectMissing ? "border-rose-300" : ""
                              }`}
                            >
                              <option value="">Unassigned</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            {isProjectMissing && (
                              <div className="mt-1 text-xs text-rose-600">Legacy task: assign a project.</div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700">KR</label>
                            <select
                              value={krDrafts[t.id] ?? t.krId ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setKrDrafts((prev) => ({ ...prev, [t.id]: v }));
                                commitKr(t.id, v);
                              }}
                              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white ${
                                isKrMissing ? "border-rose-300" : ""
                              }`}
                              disabled={!p}
                            >
                              <option value="">Unassigned</option>
                              {filteredKrs.map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.label}
                                </option>
                              ))}
                            </select>
                            {isKrMissing && (
                              <div className="mt-1 text-xs text-rose-600">Assign a KR to make this task count.</div>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            Task title <span className="text-slate-400">(Enter to save)</span>
                          </label>

                          <input
                            value={titleDrafts[t.id] ?? t.title}
                            onChange={(e) =>
                              setTitleDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                            }
                            onKeyDownCapture={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                commitTitle(t.id, (e.currentTarget as HTMLInputElement).value);
                                blurFieldHard();
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                e.stopPropagation();
                                setTitleDrafts((prev) => ({ ...prev, [t.id]: t.title }));
                                blurFieldHard();
                              }
                            }}
                            onBlur={() => commitTitle(t.id, titleDrafts[t.id] ?? t.title)}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                              t.done ? "text-slate-400 line-through" : "text-slate-800"
                            }`}
                          />

                          <div className="mt-1 text-xs text-slate-500">
                            Linked: <b>{projectLabel(t.projectId)}</b> → <b>{krLabel(t.projectId, t.krId)}</b>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteTask(t.id)}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="w-full shrink-0 rounded-2xl border bg-white p-4 lg:w-72">
            <div className="text-sm font-semibold text-slate-900">This week</div>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Total tasks</span>
                <span className="font-semibold">{totalCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Done</span>
                <span className="font-semibold">{doneCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Remaining</span>
                <span className="font-semibold">{Math.max(0, totalCount - doneCount)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border bg-slate-50 p-3 text-xs text-slate-600">
              Tasks are local (browser storage). The core link is <b>Project + KR</b>.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
