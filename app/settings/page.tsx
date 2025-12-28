"use client";

import { useRef, useState } from "react";
import AppNav from "../_components/AppNav";
import { buildBackupPayload, restoreFromBackupPayload } from "../_lib/backupStore";

function downloadJSON(filename: string, obj: unknown) {
  const text = JSON.stringify(obj, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string>("");

  function exportBackup() {
    const payload = buildBackupPayload();

    const stamp =
      typeof payload.meta.exportedAt === "string"
        ? new Date(payload.meta.exportedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    downloadJSON(`kgrowth-backup-${stamp}.json`, payload);

    setMsg("Backup exported ✅");
    setTimeout(() => setMsg(""), 2500);
  }

  async function importBackup(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      restoreFromBackupPayload(parsed);
      setMsg("Backup restored ✅ (reload the page)");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: unknown) {
      setMsg(`Error: ${String((err as { message?: string })?.message ?? err)}`);
      setTimeout(() => setMsg(""), 3500);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
          <p className="mt-1 text-slate-600">Backup / Restore (local storage)</p>
        </div>
        <AppNav />
      </header>

      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="text-sm text-slate-600">
          Export your local data as a JSON file. Restore it anytime.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={exportBackup}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Export backup
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Import backup
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              importBackup(f);
              e.currentTarget.value = "";
            }}
          />
        </div>

        {msg && (
          <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">{msg}</div>
        )}
      </section>

      <section className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900">
        <div className="font-semibold">Note</div>
        <div className="mt-1">
          Your data lives in the browser (localStorage). Clearing cache can remove it — use backups.
        </div>
      </section>
    </div>
  );
}
