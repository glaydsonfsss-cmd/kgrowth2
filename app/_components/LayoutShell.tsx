"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  { label: "Dashboard", href: "/" },
  { label: "Projects", href: "/projects" },
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
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="bg-slate-50 text-slate-900 min-h-dvh">
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
          {/* backdrop */}
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          {/* panel */}
          <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl border-r">
            <div className="p-4 border-b">
              <div className="text-lg font-semibold">K Growth OS</div>
              <div className="mt-1 text-sm text-slate-600">
                Clarity • Execution • Results
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="mt-3 w-full rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="p-3">
              <NavLinks pathname={pathname} onClick={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* DESKTOP LAYOUT */}
      <div className="md:fixed md:inset-0 md:flex">
        <aside className="hidden md:block w-72 shrink-0 border-r bg-white">
          <div className="p-6">
            <div className="text-xl font-semibold">K Growth OS</div>
            <div className="mt-1 text-sm text-slate-600">
              Clarity • Execution • Results
            </div>
          </div>

          <div className="h-[calc(100vh-96px)] overflow-y-auto px-3 pb-6">
            <NavLinks pathname={pathname} />
          </div>
        </aside>

        <main className="md:flex-1 md:overflow-y-auto p-4 md:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
