// app/overview/page.tsx
"use client";

import AppNav from "../_components/AppNav";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadProjectsState, type Project } from "../_lib/projectsStore";
import { loadTasks, mondayOfThisWeekISO, type Task } from "../_lib/tasksStore";
import { calcCycleTimeProgress, calcKrProgress, getStatus } from "../_lib/progress";

export default function OverviewPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const ps = loadProjectsState();
    setProjects(ps.projects ?? []);
    setSelectedId(ps.selectedId);

    setTasks(loadTasks());

    const onStorage = (e: StorageEvent) => {
      if (e.key === "kgrowth:projects.v2") {
        const next = loadProjectsState();
        setProjects(next.projects ?? []);
        setSelectedId(next.selectedId);
      }
      if (e.key === "kgrowth.tasks.v1") {
        setTasks(loadTasks());
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedId) ?? null;
  }, [projects, selectedId]);

  const weekStartISO = useMemo(() => mondayOfThisWeekISO(), []);

  // ----- project progress -----
  const timeProgress = useMemo(() => {
    if (!selectedProject) return 0;
    return calcCycleTimeProgress(selectedProject.cycleStart, selectedProject.cycleEnd);
  }, [selectedProject]);

  const projectProgress01 = useMemo(() => {
    if (!selectedProject) return 0;
    const krs = selectedProject.krs ?? [];
    const avg =
      krs.reduce((acc, kr) => acc + calcKrProgress(kr), 0) / Math.max(krs.length, 1) || 0;
    return avg;
  }, [selectedProject]);

  const status = useMemo(() => getStatus(projectProgress01, timeProgress), [projectProgress01, timeProgress]);

  const progressPct = Math.round(projectProgress01 * 100);
  const timePct = Math.round(timeProgress * 100);

  // ----- execution this week (selected project only) -----
  const weekTasks = useMemo(() => {
    if (!selectedProject) return [];
    return (tasks ?? []).filter(
      (t) => t.weekStartISO === weekStartISO && t.projectId === selectedProject.id
    );
  }, [tasks, weekStartISO, selectedProject]);

  const doneCount = weekTasks.filter((t) => t.done).length;
  const totalCount = weekTasks.length;

  const progressSignal =
    status.tone === "green"
      ? {
          tone: "emerald" as const,
          title: "On track",
          desc: "KR progress is keeping pace with time in the cycle.",
        }
      : status.tone === "yellow"
      ? {
          tone: "amber" as const,
          title: "At risk",
          desc: "Progress is behind time. Push the highest-leverage KR this week.",
        }
      : {
          tone: "rose" as const,
          title: "Off track",
          desc: "Progress is behind time. Narrow scope and remove blockers fast.",
        };

  const progressSignalClasses =
    progressSignal.tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : progressSignal.tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-rose-200 bg-rose-50 text-rose-800";

  const cards = [
    {
      title: "Projects",
      desc: "Define cycle + objective + KRs (embedded OKRs)",
      href: "/projects",
      meta: selectedProject ? `${progressPct}% progress` : "Select a project",
    },
    {
      title: "Tasks",
      desc: "Execution units (Project + KR)",
      href: "/tasks",
      meta: `Week of ${weekStartISO}`,
    },
    {
      title: "Habits",
      desc: "Track habits weekly",
      href: "/habits",
      meta: `Week of ${weekStartISO}`,
    },
    {
      title: "Reports",
      desc: "Weekly snapshots (Project × KR × execution)",
      href: "/reports",
      meta: selectedProject ? "Causality view" : "Pick a project",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Overview</h1>
          <p className="mt-1 text-slate-600">K Growth OS — execution cockpit (real data)</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <AppNav />
          {selectedProject ? (
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  status.tone === "green"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : status.tone === "yellow"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {status.label}
              </span>
              <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
                Progress {progressPct}% • Time {timePct}%
              </span>
            </div>
          ) : (
            <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
              Select a project in Projects
            </span>
          )}
        </div>
      </header>

      {/* Current project */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="text-sm text-slate-500">Current project</div>

        {!selectedProject ? (
          <div className="text-sm text-slate-600">
            No project selected. Go to <Link className="underline" href="/projects">Projects</Link> and select one.
          </div>
        ) : (
          <>
            <div className="text-xl font-semibold text-slate-900">{selectedProject.name}</div>

            <div className="text-sm text-slate-700">
              <span className="font-semibold">Objective:</span>{" "}
              {selectedProject.objectiveTitle || <span className="text-slate-400">—</span>}
            </div>

            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progressPct}%` }} />
            </div>

            <div className="text-xs text-slate-500">
              Cycle: {selectedProject.cycleStart || "—"} → {selectedProject.cycleEnd || "—"} •{" "}
              {selectedProject.cycleName || "—"}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Execution this week</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {doneCount} / {totalCount} done
                </div>
                <div className="mt-1 text-xs text-slate-600">Week of {weekStartISO}</div>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-xs text-slate-500">KR count</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {(selectedProject.krs ?? []).length}
                </div>
                <div className="mt-1 text-xs text-slate-600">Embedded in the project</div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Signals */}
      {selectedProject && (
        <section className="space-y-3">
          <div className="text-sm font-semibold text-slate-900">Signals</div>

          <div className={`rounded-2xl border p-4 ${progressSignalClasses}`}>
            <div className="text-sm font-semibold">{progressSignal.title}</div>
            <div className="mt-1 text-sm opacity-90">{progressSignal.desc}</div>
          </div>
        </section>
      )}

      {/* Navigation cards */}
      <section className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="rounded-2xl border bg-white p-6 hover:bg-slate-50 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">{c.title}</div>
                <div className="mt-1 text-sm text-slate-600">{c.desc}</div>
              </div>
              <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
                {c.meta}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
