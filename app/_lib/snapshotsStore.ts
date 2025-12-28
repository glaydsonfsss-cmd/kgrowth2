// app/_lib/snapshotsStore.ts
import { loadJSON, saveJSON } from "./storage";
import { loadProjectsState, type Project, type ProjectKR } from "./projectsStore";
import { loadTasks, mondayOfThisWeekISO, type Task } from "./tasksStore";

export const SNAPSHOTS_STORAGE_KEY = "kgrowth:snapshots.v2";

/**
 * Snapshot = foto semanal (read-only) para Reports / histórico:
 * Week → Project → KR → progress + tasks done/total
 */
export type SnapshotRow = {
  projectId: string;
  projectName: string;

  objectiveTitle: string;

  krId: string;
  krLabel: string;

  krProgress01: number; // 0..1
  tasksDone: number;
  tasksTotal: number;
};

export type Snapshot = {
  id: string;
  weekStartISO: string;
  createdAt: number;
  rows: SnapshotRow[];
};

function safeId(prefix = "snap") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function calcKrProgress01(kr: ProjectKR): number {
  const start = Number(kr.startValue ?? 0);
  const cur = Number(kr.currentValue ?? 0);
  const target = Number(kr.targetValue ?? 0);

  if (![start, cur, target].every(Number.isFinite)) return 0;

  if (kr.direction === "decrease") {
    const denom = start - target;
    if (denom === 0) return cur <= target ? 1 : 0;
    return clamp01((start - cur) / denom);
  }

  const denom = target - start;
  if (denom === 0) return cur >= target ? 1 : 0;
  return clamp01((cur - start) / denom);
}

function normalizeSnapshot(input: unknown): Snapshot | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Partial<Snapshot>;

  const weekStartISO = typeof o.weekStartISO === "string" ? o.weekStartISO : "";
  const rowsRaw = Array.isArray(o.rows) ? o.rows : [];
  const rows = rowsRaw
    .filter((r) => r && typeof r === "object")
    .map((r) => {
      const x = r as Partial<SnapshotRow>;
      return {
        projectId: typeof x.projectId === "string" ? x.projectId : "",
        projectName: typeof x.projectName === "string" ? x.projectName : "",
        objectiveTitle: typeof x.objectiveTitle === "string" ? x.objectiveTitle : "",
        krId: typeof x.krId === "string" ? x.krId : "",
        krLabel: typeof x.krLabel === "string" ? x.krLabel : "",
        krProgress01: typeof x.krProgress01 === "number" ? clamp01(x.krProgress01) : 0,
        tasksDone: typeof x.tasksDone === "number" ? x.tasksDone : 0,
        tasksTotal: typeof x.tasksTotal === "number" ? x.tasksTotal : 0,
      };
    })
    .filter((r) => r.projectId && r.krId);

  return {
    id: typeof o.id === "string" && o.id ? o.id : safeId("snap"),
    weekStartISO,
    createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
    rows,
  };
}

function normalizeSnapshots(input: unknown): Snapshot[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeSnapshot).filter(Boolean) as Snapshot[];
}

export function loadSnapshots(): Snapshot[] {
  return normalizeSnapshots(loadJSON<Snapshot[] | null>(SNAPSHOTS_STORAGE_KEY, null));
}

export function saveSnapshots(next: Snapshot[]) {
  saveJSON(SNAPSHOTS_STORAGE_KEY, normalizeSnapshots(next));
}

/**
 * Gera snapshot para uma semana específica (default = semana atual).
 * - Só inclui tasks com projectId+krId válidos
 * - Só inclui KRs que existem no Project
 */
export function createSnapshotForWeek(weekStartISO: string = mondayOfThisWeekISO()): Snapshot {
  const projects = loadProjectsState().projects ?? [];
  const tasks = loadTasks().filter((t) => t.weekStartISO === weekStartISO);

  const rows: SnapshotRow[] = [];

  for (const p of projects) {
    const krs = p.krs ?? [];
    for (const kr of krs) {
      const tks = tasks.filter((t) => t.projectId === p.id && t.krId === kr.id);
      const done = tks.filter((t) => Boolean(t.done)).length;
      const total = tks.length;

      rows.push({
        projectId: p.id,
        projectName: p.name,
        objectiveTitle: p.objectiveTitle || "",
        krId: kr.id,
        krLabel: kr.label || "Untitled KR",
        krProgress01: calcKrProgress01(kr),
        tasksDone: done,
        tasksTotal: total,
      });
    }
  }

  return {
    id: safeId("snap"),
    weekStartISO,
    createdAt: Date.now(),
    rows,
  };
}

/**
 * Salva (upsert) snapshot da semana.
 */
export function saveSnapshotForWeek(weekStartISO: string = mondayOfThisWeekISO()): Snapshot {
  const snap = createSnapshotForWeek(weekStartISO);
  const prev = loadSnapshots();
  const next = [snap, ...prev.filter((s) => s.weekStartISO !== weekStartISO)];
  saveSnapshots(next);
  return snap;
}
