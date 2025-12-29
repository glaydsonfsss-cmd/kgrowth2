import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ✅ usa SESSION (mais estável no guard)
  const { data } = await supabase.auth.getSession();
  const hasSession = !!data.session;

  const path = req.nextUrl.pathname;

  const isAuthPage = path.startsWith("/auth") || path.startsWith("/login");

  const isPublic =
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/api");

  const isCallback = path.startsWith("/auth/callback");

  if (isPublic || isCallback) return res;

  // ❌ não logado → força auth
  if (!hasSession && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // ✅ logado → bloqueia auth
  if (hasSession && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/projects";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
