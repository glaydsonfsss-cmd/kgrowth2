// app/auth/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../_lib/supabaseClient";

export const dynamic = "force-dynamic";

function AuthInner() {
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
    try {
      setStatus("Signing up...");
      const supabase = supabaseBrowser();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // em PRODUÇÃO (Vercel) isso vira seu domínio do app automaticamente
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        setStatus(error.message);
        return;
      }
      setStatus("Check your email to confirm your account.");
    } catch (e: any) {
      setStatus(e?.message ?? "Unknown error");
    }
  }

  async function signIn() {
    try {
      setStatus("Signing in...");
      const supabase = supabaseBrowser();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus(error.message);
        return;
      }
      setStatus("Signed in!");
      router.replace(next);
    } catch (e: any) {
      setStatus(e?.message ?? "Unknown error");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border bg-white p-6">
      <div>
        <div className="text-xl font-semibold text-slate-900">Login</div>
        <div className="mt-1 text-sm text-slate-600">
          Sign in to sync your data across devices.
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-700">Email</label>
        <input
          className="w-full rounded-xl border px-3 py-3 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-700">Password</label>
        <input
          className="w-full rounded-xl border px-3 py-3 text-sm"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={signIn}
          className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Sign in
        </button>
        <button
          onClick={signUp}
          className="flex-1 rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Sign up
        </button>
      </div>

      {status ? (
        <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
          {status}
        </div>
      ) : null}
    </div>
  );
}

export default function AuthPage() {
  // ✅ Next exige Suspense quando usa useSearchParams()
  return (
    <Suspense fallback={<div className="text-sm text-slate-600">Loading...</div>}>
      <AuthInner />
    </Suspense>
  );
}
