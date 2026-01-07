// app/_lib/tasksStore.ts
import { loadJSON, saveJSON, getLocalUpdatedAtMs } from "./storage";
import { loadProjectsState } from "./projectsStore";
import { saveCloudKV, loadCloudKV } from "./cloudKV";

export const TASKS_STORAGE_KEY = "kgrowth:tasks.v2";

export type Task = {
  id: string;
  weekStartISO: string; // Monday "YYYY-MM-DD"
  projectId: string; // required
  krId: string; // required
  title: string;
  done: boolean;

  // ✅ NEW: notes + scheduling (optional)
  notes?: string;
  dueDateISO?: string; // "YYYY-MM-DD"
  startTime?: string; // "HH:MM"
  durationMin?: number; // e.g. 30, 45, 60

  createdAt: number;
  updatedAt: number;
};

function safeId(prefix = "t") {
  try {
    const c: Crypto | undefined = typeof crypto !== "undefined" ? crypto : undefined;
    if (c?.randomUUID) return `${prefix}-${c.randomUUID()}`;
  } catch {}
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

export function mondayOfThisWeekISO() {
  const d = new Date();
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function normalizeTasks(input: unknown): Task[] {
  const projects = loadProjectsState().projects;

  const inferProjectIdFromKr = (krId: string) => {
    const clean = String(krId ?? "").trim();
    if (!clean) return "";
    const hit = projects.find((p) => (p.krs ?? []).some((k) => k.id === clean));
    return hit?.id ?? "";
  };

  if (!Array.isArray(input)) return [];

  return input
    .filter((t) => t && typeof t === "object")
    .map((t) => {
      const obj = t as Partial<Task> & { projectId?: unknown; krId?: unknown };

      const krId = typeof (obj as any).krId === "string" ? String((obj as any).krId) : "";
      const projectIdRaw =
        typeof (obj as any).projectId === "string" ? String((obj as any).projectId) : "";

      const projectId = projectIdRaw || inferProjectIdFromKr(krId);

      const durationRaw = (obj as any).durationMin;

      return {
        id: typeof obj.id === "string" && obj.id ? obj.id : safeId("t"),
        weekStartISO: typeof obj.weekStartISO === "string" ? obj.weekStartISO : "",
        projectId,
        krId,
        title: typeof obj.title === "string" ? obj.title : "",
        done: Boolean(obj.done),

        // ✅ NEW (safe defaults)
        notes: typeof (obj as any).notes === "string" ? String((obj as any).notes) : "",
        dueDateISO: typeof (obj as any).dueDateISO === "string" ? String((obj as any).dueDateISO) : "",
        startTime: typeof (obj as any).startTime === "string" ? String((obj as any).startTime) : "",
        durationMin:
          typeof durationRaw === "number" && Number.isFinite(durationRaw)
            ? Number(durationRaw)
            : 30,

        createdAt: typeof obj.createdAt === "number" ? obj.createdAt : Date.now(),
        updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : Date.now(),
      };
    })
    .filter((t) => t.title.trim().length > 0);
}

export function loadTasks(): Task[] {
  return normalizeTasks(loadJSON<Task[] | null>(TASKS_STORAGE_KEY, null));
}

export function saveTasks(next: Task[]) {
  const normalized = normalizeTasks(next);
  saveJSON(TASKS_STORAGE_KEY, normalized);
  saveCloudKV(TASKS_STORAGE_KEY, normalized);
}

export function patchTasks(recipe: (current: Task[]) => Task[]): Task[] {
  const latest = loadTasks();
  const next = normalizeTasks(recipe(latest));
  saveTasks(next);
  return next;
}

// ✅ opcional: hydrate do cloud se estiver mais novo
export async function hydrateTasksFromCloudIfNewer(): Promise<Task[] | null> {
  const cloud = await loadCloudKV<Task[]>(TASKS_STORAGE_KEY);
  if (!cloud) return null;

  const localTs = getLocalUpdatedAtMs(TASKS_STORAGE_KEY);
  if (cloud.updatedAtMs > localTs) {
    saveJSON(TASKS_STORAGE_KEY, normalizeTasks(cloud.value));
    return loadTasks();
  }
  return null;
}
