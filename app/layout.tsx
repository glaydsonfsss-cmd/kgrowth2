// app/layout.tsx
import "./globals.css";
import LayoutShell from "./_components/LayoutShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
