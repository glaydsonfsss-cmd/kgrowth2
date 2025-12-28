// app/_lib/progress.ts
export type Direction = "increase" | "decrease";

export type StatusTone = "green" | "yellow" | "red";

export type Status = {
  tone: StatusTone;
  label: string;
};

export function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function calcKrProgress(kr: {
  direction: Direction;
  startValue: number;
  currentValue: number;
  targetValue: number;
}) {
  const start = Number(kr.startValue ?? 0);
  const cur = Number(kr.currentValue ?? 0);
  const target = Number(kr.targetValue ?? 0);

  // avoid divide-by-zero
  if (kr.direction === "increase") {
    const denom = target - start;
    if (!Number.isFinite(denom) || denom === 0) return 0;
    return clamp01((cur - start) / denom);
  }

  // decrease
  const denom = start - target;
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return clamp01((start - cur) / denom);
}

export function calcCycleTimeProgress(cycleStartISO: string, cycleEndISO: string) {
  const start = Date.parse(cycleStartISO);
  const end = Date.parse(cycleEndISO);
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

  return clamp01((now - start) / (end - start));
}

/**
 * Simple status logic:
 * - green: progress >= time - 5pp
 * - yellow: progress >= time - 15pp
 * - red: behind more than 15pp
 */
export function getStatus(progress01: number, time01: number): Status {
  const p = clamp01(progress01);
  const t = clamp01(time01);
  const diff = p - t;

  if (diff >= -0.05) return { tone: "green", label: "On track" };
  if (diff >= -0.15) return { tone: "yellow", label: "At risk" };
  return { tone: "red", label: "Off track" };
}
