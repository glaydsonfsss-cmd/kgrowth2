"use client";

import { useState } from "react";

type ChannelRole = "primary" | "secondary";

type TractionChannel = {
  id: string;
  name: string;
  role: ChannelRole;
  rationale: string;
  active: boolean;
};

export default function TractionChannelsPage() {
  const [channels, setChannels] = useState<TractionChannel[]>([
    {
      id: "c1",
      name: "Google Ads",
      role: "primary",
      rationale: "High intent traffic with predictable acquisition",
      active: true,
    },
    {
      id: "c2",
      name: "Content (SEO)",
      role: "secondary",
      rationale: "Long-term compounding traffic and authority",
      active: true,
    },
  ]);

  function updateChannel(id: string, patch: Partial<TractionChannel>) {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  function addChannel() {
    if (channels.length >= 3) return;

    const id = `c-${Math.random().toString(16).slice(2)}`;
    setChannels((prev) => [
      ...prev,
      {
        id,
        name: "New channel",
        role: "secondary",
        rationale: "Define why this channel matters",
        active: false,
      },
    ]);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Traction Channels
          </h1>
          <p className="mt-1 text-slate-600">
            Focus on a few channels that truly move the needle.
          </p>
        </div>

        <button
          onClick={addChannel}
          disabled={channels.length >= 3}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            channels.length >= 3
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          Add Channel
        </button>
      </header>

      <section className="space-y-4">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="rounded-2xl border bg-white p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <input
                value={channel.name}
                onChange={(e) =>
                  updateChannel(channel.id, { name: e.target.value })
                }
                className="text-lg font-semibold text-slate-900 outline-none"
              />

              <div className="flex items-center gap-2">
                <select
                  value={channel.role}
                  onChange={(e) =>
                    updateChannel(channel.id, {
                      role: e.target.value as ChannelRole,
                    })
                  }
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                </select>

                <button
                  onClick={() =>
                    updateChannel(channel.id, {
                      active: !channel.active,
                    })
                  }
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                    channel.active
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {channel.active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">
                Why this channel?
              </label>
              <textarea
                value={channel.rationale}
                onChange={(e) =>
                  updateChannel(channel.id, {
                    rationale: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          </div>
        ))}

        {channels.length === 0 && (
          <div className="text-sm text-slate-600">
            No traction channels defined yet.
          </div>
        )}
      </section>
    </div>
  );
}
