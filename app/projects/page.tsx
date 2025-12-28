// app/projects/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AppNav from "../_components/AppNav";
import {
  type ProjectsState,
  type Project,
  type ProjectKR,
  loadProjectsState,
  saveProjectsState,
  createProject,
  updateProject,
  deleteProject,
  addKr,
  updateKr,
  deleteKr,
} from "../_lib/projectsStore";

const statusLabel: Record<Project["status"], string> = {
  idea: "Idea",
  active: "Active",
  paused: "Paused",
  done: "Done",
};

export default function ProjectsPage() {
  const [state, setState] = useState<ProjectsState>(() => loadProjectsState());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    saveProjectsState(state);
  }, [state, loaded]);

  useEffect(() => {
    setState(loadProjectsState());
    setLoaded(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "kgrowth:projects.v2") setState(loadProjectsState());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const selected = useMemo(() => {
    return state.projects.find((p) => p.id === state.selectedId) ?? null;
  }, [state.projects, state.selectedId]);

  function safeSet(next: ProjectsState) {
    setState(next);
  }

  function onCreateProject() {
    safeSet(createProject());
  }

  function onUpdateProject(id: string, patch: Partial<Project>) {
    safeSet(updateProject(id, patch));
  }

  function onDeleteProject(id: string) {
    const ok = confirm("Delete this project?");
    if (!ok) return;
    safeSet(deleteProject(id));
  }

  // ✅ HARDENED: prevents default + propagation (avoids weird form-submit / focus issues)
  function onAddKr(e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent, projectId: string) {
    e.preventDefault();
    e.stopPropagation();
    safeSet(addKr(projectId));
  }

  function onUpdateKr(projectId: string, krId: string, patch: Partial<ProjectKR>) {
    safeSet(updateKr(projectId, krId, patch));
  }

  function onDeleteKr(projectId: string, krId: string) {
    const ok = confirm("Delete this KR?");
    if (!ok) return;
    safeSet(deleteKr(projectId, krId));
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Projects</h1>
          <p className="mt-1 text-slate-600">
            Each project has a cycle + 1 objective + KRs (embedded OKRs).
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <AppNav />
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={onCreateProject}
          >
            New project
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* List */}
        <section className="rounded-2xl border bg-white p-4 lg:col-span-5">
          <div className="text-sm font-semibold text-slate-900">All projects</div>
          <div className="mt-3 space-y-2">
            {state.projects.map((p) => {
              const active = p.id === state.selectedId;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, selectedId: p.id }))}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className={`truncate text-sm font-semibold ${
                          active ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {p.name}
                      </div>
                      <div
                        className={`mt-1 truncate text-xs ${
                          active ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {p.objectiveTitle}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${
                        active
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {statusLabel[p.status]}
                    </span>
                  </div>
                </button>
              );
            })}

            {state.projects.length === 0 && (
              <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
                No projects yet. Click <span className="font-medium">New project</span>.
              </div>
            )}
          </div>
        </section>

        {/* Details */}
        <section className="rounded-2xl border bg-white p-6 lg:col-span-7">
          {!selected ? (
            <div className="text-sm text-slate-600">Select a project.</div>
          ) : (
            <div className="space-y-8">
              {/* Top row: name + status */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Project name</div>
                  <input
                    value={selected.name}
                    onChange={(e) => onUpdateProject(selected.id, { name: e.target.value })}
                    className="mt-2 w-full rounded-lg border px-3 py-2 text-sm font-semibold"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <div className="text-xs text-slate-500">Status</div>
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      onUpdateProject(selected.id, {
                        status: e.target.value as Project["status"],
                      })
                    }
                    className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                  >
                    <option value="idea">Idea</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              {/* Owner */}
              <div>
                <div className="text-xs text-slate-500">Owner</div>
                <input
                  value={selected.owner}
                  onChange={(e) => onUpdateProject(selected.id, { owner: e.target.value })}
                  className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              {/* Cycle */}
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Cycle</div>
                <p className="mt-1 text-sm text-slate-600">Define the timebox for this project.</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-slate-500">Cycle name</div>
                    <input
                      value={selected.cycleName}
                      onChange={(e) => onUpdateProject(selected.id, { cycleName: e.target.value })}
                      className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                      placeholder="Ex: Q1 2026"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Start</div>
                    <input
                      type="date"
                      value={selected.cycleStart}
                      onChange={(e) => onUpdateProject(selected.id, { cycleStart: e.target.value })}
                      className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">End</div>
                    <input
                      type="date"
                      value={selected.cycleEnd}
                      onChange={(e) => onUpdateProject(selected.id, { cycleEnd: e.target.value })}
                      className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Objective */}
              <div>
                <div className="text-xs text-slate-500">Objective (1 per project)</div>
                <textarea
                  value={selected.objectiveTitle}
                  onChange={(e) => onUpdateProject(selected.id, { objectiveTitle: e.target.value })}
                  className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Ex: Increase qualified leads by improving landing page + ads"
                />
              </div>

              {/* Success outcome (optional) */}
              <div>
                <div className="text-xs text-slate-500">Success outcome (optional)</div>
                <textarea
                  value={selected.successOutcome ?? ""}
                  onChange={(e) => onUpdateProject(selected.id, { successOutcome: e.target.value })}
                  className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="What success looks like (optional)."
                />
              </div>

              {/* KRs */}
              <div className="rounded-2xl border bg-white">
                <div className="flex items-center justify-between border-b p-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Key Results</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Create, edit, and delete KRs inside the project.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    onClick={(e) => onAddKr(e, selected.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onAddKr(e, selected.id);
                    }}
                  >
                    Add KR
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {(selected.krs ?? []).length === 0 ? (
                    <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
                      No KRs yet. Click <span className="font-medium">Add KR</span>.
                    </div>
                  ) : (
                    (selected.krs ?? []).map((kr) => (
                      <div key={kr.id} className="rounded-2xl border p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-xs text-slate-500">KR label</div>
                            <input
                              value={kr.label}
                              onChange={(e) =>
                                onUpdateKr(selected.id, kr.id, { label: e.target.value })
                              }
                              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm font-semibold"
                              placeholder="Ex: Raise conversion rate from 1.2% to 2.0%"
                            />
                          </div>

                          <button
                            type="button"
                            className="rounded-lg border px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            onClick={() => onDeleteKr(selected.id, kr.id)}
                          >
                            Delete
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-4">
                          <div>
                            <div className="text-xs text-slate-500">Direction</div>
                            <select
                              value={kr.direction}
                              onChange={(e) =>
                                onUpdateKr(selected.id, kr.id, { direction: e.target.value as any })
                              }
                              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                            >
                              <option value="increase">Increase</option>
                              <option value="decrease">Decrease</option>
                            </select>
                          </div>

                          <div>
                            <div className="text-xs text-slate-500">Unit</div>
                            <input
                              value={kr.unit}
                              onChange={(e) => onUpdateKr(selected.id, kr.id, { unit: e.target.value })}
                              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                              placeholder="Ex: % • $ • leads"
                            />
                          </div>

                          <div>
                            <div className="text-xs text-slate-500">Start</div>
                            <input
                              value={String(kr.startValue)}
                              onChange={(e) =>
                                onUpdateKr(selected.id, kr.id, {
                                  startValue: Number(e.target.value || 0),
                                })
                              }
                              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                              inputMode="numeric"
                            />
                          </div>

                          <div>
                            <div className="text-xs text-slate-500">Target</div>
                            <input
                              value={String(kr.targetValue)}
                              onChange={(e) =>
                                onUpdateKr(selected.id, kr.id, {
                                  targetValue: Number(e.target.value || 0),
                                })
                              }
                              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                              inputMode="numeric"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-xs text-slate-500">Current</div>
                            <input
                              value={String(kr.currentValue)}
                              onChange={(e) =>
                                onUpdateKr(selected.id, kr.id, {
                                  currentValue: Number(e.target.value || 0),
                                })
                              }
                              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm bg-white"
                              inputMode="numeric"
                            />
                          </div>

                          <div className="rounded-xl border bg-slate-50 p-3 text-xs text-slate-600">
                            Tip: next, Tasks will link to <b>Project + KR</b>, so execution becomes real.
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Created: {selected.createdAtISO} • ID: {selected.id}
                </div>

                <button
                  type="button"
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  onClick={() => onDeleteProject(selected.id)}
                >
                  Delete project
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
