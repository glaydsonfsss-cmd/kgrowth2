// app/_components/LayoutShell.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "../_lib/supabaseClient";

const nav = [
  { label: "Dashboard", href: "/overview" }, // ✅ aqui corrigimos: Dashboard -> Overview
  { label: "Projects", href: "/projects" },
  { label: "Weekly", href: "/weekly" },
  { label: "Tasks", href: "/tasks" },
  { label: "Habits", href: "/habits" },
  { label: "Traction Channels", href: "/traction-channels" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

function NavLinks({
  pathname,
  onClick,
}: {
  pathname: string;
  onClick?: () => void;
}) {
  return (
    <nav className="space-y-1">
      {nav.map((item) => {
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // ✅ não mostrar o shell no /login
  const isLoginPage = useMemo(() => pathname.startsWith("/login"), [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    try {
      setSigningOut(true);
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();

      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  if (isLoginPage) {
    // login fica "limpo" sem menu
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {/* MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 border-b bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-base font-semibold">K Growth OS</div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Menu
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl border-r">
            <div className="p-4 border-b">
              <div className="text-lg font-semibold">K Growth OS</div>
              <div className="mt-1 text-sm text-slate-600">
                Clarity • Execution • Results
              </div>

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="w-full rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="w-full rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>

            <div className="p-3">
              <NavLinks
                pathname={pathname}
                onClick={() => setMobileOpen(false)}
              />
            </div>
          </aside>
        </div>
      )}

      {/* DESKTOP LAYOUT */}
      <div className="md:fixed md:inset-0 md:flex">
        <aside className="hidden md:flex w-72 shrink-0 border-r bg-white flex-col">
          <div className="p-6">
            <div className="text-xl font-semibold">K Growth OS</div>
            <div className="mt-1 text-sm text-slate-600">
              Clarity • Execution • Results
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-6">
            <NavLinks pathname={pathname} />
          </div>

          <div className="border-t p-3">
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="w-full rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </aside>

        <main className="md:flex-1 md:overflow-y-auto p-4 md:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
