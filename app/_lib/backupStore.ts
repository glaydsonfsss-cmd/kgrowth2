// app/_lib/backupStore.ts

export type BackupPayload = {
    meta: {
      version: number;
      exportedAt: string;
    };
    data: Record<string, unknown>;
  };
  
  // ⚠️ Tem que bater com as chaves reais usadas no app
  const STORAGE_KEYS = ["kgrowth.okrs.v1", "kgrowth.tasks.v1", "kgrowth:habits"];
  
  export function buildBackupPayload(): BackupPayload {
    const data: Record<string, unknown> = {};
  
    for (const key of STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          data[key] = JSON.parse(raw);
        }
      } catch {
        // ignore corrupted entries
      }
    }
  
    return {
      meta: {
        version: 1,
        exportedAt: new Date().toISOString(),
      },
      data,
    };
  }
  
  export function restoreFromBackupPayload(payload: unknown): { restored: string[] } {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid backup payload");
    }
  
    const p = payload as BackupPayload;
  
    if (!p.data || typeof p.data !== "object") {
      throw new Error("Invalid backup payload structure");
    }
  
    const restored: string[] = [];
  
    for (const [key, value] of Object.entries(p.data)) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        restored.push(key);
      } catch {
        // skip failures
      }
    }
  
    return { restored };
  }
  