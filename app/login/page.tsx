// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../_lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    // Se já estiver logado, mostra um hint simples (sem redirect automático)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setStatus("sent");
      }
    });
  }, []);

  async function sendMagicLink() {
    const e = email.trim();
    if (!e) return;

    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Login</h1>
        <p className="text-slate-600">
          Enter your email and we’ll send you a magic link.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-6 space-y-4 max-w-xl">
        <div>
          <label className="block text-xs font-medium text-slate-700">Email</label>
          <input
            className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMagicLink();
            }}
          />
        </div>

        <button
          onClick={sendMagicLink}
          disabled={status === "sending"}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {status === "sending" ? "Sending..." : "Send magic link"}
        </button>

        {status === "sent" && (
          <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
            If the email exists, you’ll receive a magic link shortly. Open it on the device you want
            to use (mobile or desktop).
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {errorMsg || "Something went wrong."}
          </div>
        )}

        <div className="text-sm text-slate-600">
          <Link href="/" className="underline">
            Back to app
          </Link>
        </div>
      </section>
    </div>
  );
}
