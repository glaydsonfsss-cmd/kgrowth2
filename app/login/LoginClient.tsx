// app/login/LoginClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../_lib/supabaseClient";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();

  const next = useMemo(() => {
    const n = params.get("next");
    return n && n.startsWith("/") ? n : "/projects";
  }, [params]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const supabase = supabaseBrowser();

    // se já estiver logado, manda direto
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
    });

    // se logar, manda direto
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(next);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router, next]);

  async function signIn() {
    setStatus("Signing in...");
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setStatus(`Error: ${error.message}`);
    setStatus("Signed in ✅");
  }

  async function signUp() {
    setStatus("Creating account...");
    const supabase = supabaseBrowser();

    // importante pra Vercel: redirect absoluto
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) return setStatus(`Error: ${error.message}`);
    setStatus("Check your email to confirm ✅");
  }

  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    setStatus("Signed out");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Login</div>
            <div className="mt-1 text-sm text-slate-600">{status || "—"}</div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">Email</label>
            <input
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={signIn}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={signUp}
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Create account
          </button>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          After login, you’ll be redirected to: <span className="font-medium">{next}</span>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Tip: if you came here from a link, it may include a <code>next</code> parameter.
        </div>
      </div>
    </div>
  );
}
