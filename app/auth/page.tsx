"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../_lib/supabaseClient";

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/projects";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const supabase = supabaseBrowser();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(next);
    });

    return () => sub.subscription.unsubscribe();
  }, [router, next]);

  async function signUp() {
    setStatus("Signing up...");
    const supabase = supabaseBrowser();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) return setStatus(`Error: ${error.message}`);
    setStatus("Check your email to confirm ✅ (if confirmation is enabled).");
  }

  async function signIn() {
    setStatus("Signing in...");
    const supabase = supabaseBrowser();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return setStatus(`Error: ${error.message}`);
    setStatus("Logged in ✅");
    router.replace(next);
  }

  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    setStatus("Logged out");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Auth</h1>
      <p className="text-slate-600">Login (Supabase)</p>

      <div className="rounded-2xl border bg-white p-6 space-y-4 max-w-2xl">
        <div className="rounded-xl border bg-slate-50 p-4 text-sm">
          <b>Status:</b> {status || "—"}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              className="mt-2 w-full rounded-xl border px-4 py-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Password</label>
            <input
              className="mt-2 w-full rounded-xl border px-4 py-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 6 chars"
              type="password"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={signUp} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Sign up
          </button>
          <button onClick={signIn} className="rounded-lg border px-4 py-2 text-sm font-semibold">
            Sign in
          </button>
          <button onClick={signOut} className="rounded-lg border px-4 py-2 text-sm font-semibold text-rose-700">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
