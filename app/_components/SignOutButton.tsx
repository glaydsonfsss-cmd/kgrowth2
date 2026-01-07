"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../_lib/supabaseClient";

export default function SignOutButton({
  className = "",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();

  async function onSignOut() {
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
    } finally {
      // força voltar pro login (e limpa fluxo)
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      className={
        className ||
        "rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      }
    >
      {label}
    </button>
  );
}
