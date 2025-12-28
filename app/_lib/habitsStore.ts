// app/_lib/habitsStore.ts
import { loadJSON, saveJSON, getLocalUpdatedAtMs } from "./storage";
import { saveCloudKV, loadCloudKV } from "./cloudKV";

export const HABITS_STORAGE_KEY = "kgrowth:habits.v2";

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type Habit = {
  id: string;
  name: string;
  createdAt: number;
};

export type HabitWeek = Record<DayKey, boolean>;
export type WeekChecks = Record<string, Record<string, HabitWeek>>;

export type HabitsState = {
  habits: Habit[];
  weeks: WeekChecks;
};

function safeId(prefix = "h") {
  try {
    const c: Crypto | undefined = typeof crypto !== "undefined" ? crypto : undefined;
    if (c?.randomUUID) return `${prefix}-${c.randomUUID()}`;
  } catch {}
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

export function mondayOfThisWeekISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun, 1 Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const EMPTY_WEEK: HabitWeek = {
  Mon: false,
  Tue: false,
  Wed: false,
  Thu: false,
  Fri: false,
  Sat: false,
  Sun: false,
};

function normalizeHabit(input: unknown): Habit | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Partial<Habit>;
  const id = typeof o.id === "string" && o.id ? o.id : safeId("h");
  const name = typeof o.name === "string" ? o.name : "New habit";
  const createdAt = typeof o.createdAt === "number" ? o.createdAt : Date.now();
  return { id, name, createdAt };
}

function normalizeHabitWeek(input: unknown): HabitWeek {
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    Mon: Boolean(o["Mon"]),
    Tue: Boolean(o["Tue"]),
    Wed: Boolean(o["Wed"]),
    Thu: Boolean(o["Thu"]),
    Fri: Boolean(o["Fri"]),
    Sat: Boolean(o["Sat"]),
    Sun: Boolean(o["Sun"]),
  };
}

function normalizeWeeks(input: unknown): WeekChecks {
  const out: WeekChecks = {};
  if (!input || typeof input !== "object") return out;

  const weeksObj = input as Record<string, unknown>;
  for (const weekISO of Object.keys(weeksObj)) {
    const weekVal = weeksObj[weekISO];
    if (!weekVal || typeof weekVal !== "object") continue;

    const habitsObj = weekVal as Record<string, unknown>;
    out[weekISO] = out[weekISO] || {};

    for (const habitId of Object.keys(habitsObj)) {
      out[weekISO][habitId] = normalizeHabitWeek(habitsObj[habitId]);
    }
  }
  return out;
}

function normalizeState(input: unknown): HabitsState {
  const base = input && typeof input === "object" ? (input as Partial<HabitsState>) : {};
  const habitsRaw = Array.isArray(base.habits) ? base.habits : [];
  const habits = habitsRaw.map(normalizeHabit).filter(Boolean) as Habit[];
  const weeks = normalizeWeeks(base.weeks);
  return { habits, weeks };
}

export function loadHabitsState(): HabitsState {
  const fallback: HabitsState = {
    habits: [
      { id: "h-1", name: "Workout", createdAt: Date.now() },
      { id: "h-2", name: "Deep work (60m)", createdAt: Date.now() },
    ],
    weeks: {},
  };

  return normalizeState(loadJSON<HabitsState | null>(HABITS_STORAGE_KEY, fallback));
}

export function saveHabitsState(state: HabitsState) {
  const normalized = normalizeState(state);
  saveJSON(HABITS_STORAGE_KEY, normalized);
  saveCloudKV(HABITS_STORAGE_KEY, normalized);
}

function patchState(recipe: (current: HabitsState) => HabitsState): HabitsState {
  const latest = loadHabitsState();
  const next = normalizeState(recipe(latest));
  saveHabitsState(next);
  return next;
}

export function addHabit(name: string = "New habit"): HabitsState {
  const clean = String(name ?? "").trim() || "New habit";
  return patchState((prev) => {
    const h: Habit = { id: safeId("h"), name: clean, createdAt: Date.now() };
    return { ...prev, habits: [h, ...(prev.habits ?? [])] };
  });
}

export function renameHabit(habitId: string, name: string): HabitsState {
  const clean = String(name ?? "").trim();
  if (!clean) return loadHabitsState();
  return patchState((prev) => ({
    ...prev,
    habits: (prev.habits ?? []).map((h) => (h.id === habitId ? { ...h, name: clean } : h)),
  }));
}

export function deleteHabit(habitId: string): HabitsState {
  return patchState((prev) => {
    const habits = (prev.habits ?? []).filter((h) => h.id !== habitId);

    const weeks: WeekChecks = { ...(prev.weeks ?? {}) };
    for (const weekISO of Object.keys(weeks)) {
      const weekHabits = { ...(weeks[weekISO] ?? {}) };
      if (weekHabits[habitId]) delete weekHabits[habitId];
      weeks[weekISO] = weekHabits;
    }

    return { habits, weeks };
  });
}

export const deleteHabitForever = deleteHabit;

export function toggleHabitDay(weekStartISO: string, habitId: string, day: DayKey): HabitsState {
  const wk = String(weekStartISO ?? "").trim();
  if (!wk) return loadHabitsState();

  return patchState((prev) => {
    const weeks: WeekChecks = { ...(prev.weeks ?? {}) };
    const weekHabits = { ...(weeks[wk] ?? {}) };

    const current: HabitWeek = weekHabits[habitId] ?? { ...EMPTY_WEEK };
    weekHabits[habitId] = { ...current, [day]: !current[day] };

    weeks[wk] = weekHabits;
    return { ...prev, weeks };
  });
}

export function getWeekForHabit(state: HabitsState, weekStartISO: string, habitId: string): HabitWeek {
  return state.weeks?.[weekStartISO]?.[habitId] ?? { ...EMPTY_WEEK };
}

// ✅ opcional (vamos usar depois): hydrate do cloud se estiver mais novo
export async function hydrateHabitsFromCloudIfNewer(): Promise<HabitsState | null> {
  const cloud = await loadCloudKV<HabitsState>(HABITS_STORAGE_KEY);
  if (!cloud) return null;

  const localTs = getLocalUpdatedAtMs(HABITS_STORAGE_KEY);
  if (cloud.updatedAtMs > localTs) {
    saveJSON(HABITS_STORAGE_KEY, normalizeState(cloud.value));
    return loadHabitsState();
  }
  return null;
}
