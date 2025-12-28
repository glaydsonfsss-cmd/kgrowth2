// app/_lib/storage.ts
export function metaKeyFor(key: string) {
  return `${key}.__meta`;
}

export function getLocalUpdatedAtMs(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(metaKeyFor(key));
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function touchLocalUpdatedAt(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(metaKeyFor(key), String(Date.now()));
  } catch {}
}

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    touchLocalUpdatedAt(key);
  } catch {
    // ignore write errors (quota, privacy mode, etc.)
  }
}

export function removeJSON(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
    window.localStorage.removeItem(metaKeyFor(key));
  } catch {
    // ignore
  }
}
