// app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { label: "Projects", href: "/projects" },
  { label: "Overview", href: "/overview" },
  { label: "Tasks", href: "/tasks" },
  { label: "Habits", href: "/habits" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900">
        <div className="fixed inset-0 flex">
          <aside className="w-72 shrink-0 border-r bg-white">
            <div className="p-6">
              <div className="text-xl font-semibold">K Growth OS</div>
              <div className="mt-1 text-sm text-slate-600">Clarity • Execution • Results</div>
            </div>

            <div className="h-[calc(100vh-96px)] overflow-y-auto">
              <nav className="mt-2 space-y-1 px-3 pb-6">
                {nav.map((item) => {
                  const isActive =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
