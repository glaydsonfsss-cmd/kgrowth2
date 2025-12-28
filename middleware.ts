import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
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

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  const path = req.nextUrl.pathname;

  const isAuthPage = path.startsWith("/auth");
  const isPublic =
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/api");

  if (isPublic) return res;

  // NOT logged in -> always force /auth (except /auth itself)
  if (!user && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // logged in -> block /auth
  if (user && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/projects";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
