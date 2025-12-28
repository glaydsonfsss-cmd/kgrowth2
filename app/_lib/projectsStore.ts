// app/_lib/projectsStore.ts
import { loadJSON, saveJSON } from "./storage";

export const PROJECTS_STORAGE_KEY = "kgrowth:projects.v2";

export type ProjectStatus = "idea" | "active" | "paused" | "done";
export type Direction = "increase" | "decrease";

export type ProjectKR = {
  id: string;
  label: string; // ✅ can be "" while user is editing
  direction: Direction;
  unit: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
};

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  owner: string;
  createdAtISO: string;

  cycleName: string;
  cycleStart: string; // YYYY-MM-DD
  cycleEnd: string; // YYYY-MM-DD

  objectiveTitle: string; // 1 per project
  successOutcome?: string; // optional

  krs: ProjectKR[];
};

export type ProjectsState = {
  projects: Project[];
  selectedId?: string;
};

/* ---------------- utils ---------------- */

function uid(prefix = "prj") {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function uidKr() {
  return uid("kr");
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeString(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function safeNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeStatus(v: unknown): ProjectStatus {
  return v === "idea" || v === "active" || v === "paused" || v === "done" ? v : "idea";
}

function safeDirection(v: unknown): Direction {
  return v === "increase" || v === "decrease" ? v : "increase";
}

function normalizeKr(input: unknown): ProjectKR | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Partial<ProjectKR>;

  const id = safeString(o.id);

  // ✅ CRITICAL FIX:
  // - DO NOT trim (spaces are valid while typing)
  // - DO NOT force "New KR" when empty (let UI show placeholder if empty)
  const label = safeString(o.label, "");

  return {
    id: id || uidKr(),
    label,
    direction: safeDirection(o.direction),
    unit: safeString(o.unit, ""),
    startValue: safeNumber(o.startValue, 0),
    currentValue: safeNumber(o.currentValue, 0),
    targetValue: safeNumber(o.targetValue, 0),
  };
}

function normalizeProject(input: unknown): Project | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Partial<Project>;

  const id = safeString(o.id);
  const name = safeString(o.name, "New project");

  const krsRaw = Array.isArray((o as any).krs) ? (o as any).krs : [];
  const krs = krsRaw.map(normalizeKr).filter(Boolean) as ProjectKR[];

  return {
    id: id || uid("prj"),
    name,
    status: safeStatus(o.status),
    owner: safeString(o.owner, "Kati"),
    createdAtISO: safeString(o.createdAtISO, todayISO()),

    cycleName: safeString((o as any).cycleName, ""),
    cycleStart: safeString((o as any).cycleStart, ""),
    cycleEnd: safeString((o as any).cycleEnd, ""),

    objectiveTitle: safeString((o as any).objectiveTitle, ""),
    successOutcome: safeString((o as any).successOutcome, ""),

    krs,
  };
}

function normalizeState(input: unknown): ProjectsState {
  const base =
    input && typeof input === "object"
      ? (input as Partial<ProjectsState>)
      : ({} as Partial<ProjectsState>);

  const projectsRaw = Array.isArray(base.projects) ? base.projects : [];
  const projects = projectsRaw.map(normalizeProject).filter(Boolean) as Project[];

  const selectedId =
    typeof base.selectedId === "string" ? base.selectedId : projects[0]?.id;

  return { projects, selectedId };
}

/* ---------------- storage ---------------- */

export function loadProjectsState(): ProjectsState {
  const fallback: ProjectsState = {
    projects: [
      {
        id: "prj-1",
        name: "K Growth OS MVP",
        status: "active",
        owner: "Kati",
        createdAtISO: todayISO(),

        cycleName: "Q1 2026",
        cycleStart: "",
        cycleEnd: "",

        objectiveTitle: "Build a working MVP with Projects + embedded OKRs + Tasks + Habits",
        successOutcome: "Able to manage real projects with cycles and measurable KRs.",

        krs: [],
      },
    ],
    selectedId: "prj-1",
  };

  return normalizeState(loadJSON<ProjectsState | null>(PROJECTS_STORAGE_KEY, fallback));
}

export function saveProjectsState(state: ProjectsState) {
  saveJSON(PROJECTS_STORAGE_KEY, normalizeState(state));
}

function patchState(recipe: (current: ProjectsState) => ProjectsState): ProjectsState {
  const latest = loadProjectsState();
  const next = normalizeState(recipe(latest));
  saveProjectsState(next);
  return next;
}

/* ---------------- actions ---------------- */

export function createProject(): ProjectsState {
  return patchState((prev) => {
    const id = uid("prj");
    const p: Project = {
      id,
      name: "New project",
      status: "idea",
      owner: "Kati",
      createdAtISO: todayISO(),

      cycleName: "",
      cycleStart: "",
      cycleEnd: "",

      objectiveTitle: "",
      successOutcome: "",

      krs: [],
    };

    return {
      projects: [p, ...(prev.projects ?? [])],
      selectedId: id,
    };
  });
}

export function updateProject(id: string, patch: Partial<Project>): ProjectsState {
  return patchState((prev) => ({
    ...prev,
    projects: (prev.projects ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }));
}

export function deleteProject(id: string): ProjectsState {
  return patchState((prev) => {
    const nextProjects = (prev.projects ?? []).filter((p) => p.id !== id);
    const nextSelected = prev.selectedId === id ? nextProjects[0]?.id : prev.selectedId;
    return { projects: nextProjects, selectedId: nextSelected };
  });
}

export function addKr(projectId: string, label: string = "New KR"): ProjectsState {
  return patchState((prev) => ({
    ...prev,
    projects: (prev.projects ?? []).map((p) => {
      if (p.id !== projectId) return p;

      const kr: ProjectKR = {
        id: uidKr(),
        label, // UI can overwrite freely (including spaces / empty)
        direction: "increase",
        unit: "",
        startValue: 0,
        currentValue: 0,
        targetValue: 0,
      };

      return { ...p, krs: [kr, ...(p.krs ?? [])] };
    }),
  }));
}

export function updateKr(projectId: string, krId: string, patch: Partial<ProjectKR>): ProjectsState {
  return patchState((prev) => ({
    ...prev,
    projects: (prev.projects ?? []).map((p) => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        krs: (p.krs ?? []).map((kr) => (kr.id === krId ? { ...kr, ...patch } : kr)),
      };
    }),
  }));
}

export function deleteKr(projectId: string, krId: string): ProjectsState {
  return patchState((prev) => ({
    ...prev,
    projects: (prev.projects ?? []).map((p) => {
      if (p.id !== projectId) return p;
      return { ...p, krs: (p.krs ?? []).filter((kr) => kr.id !== krId) };
    }),
  }));
}
