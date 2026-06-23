import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/supabase/env";

// Refresh the Supabase session on every request and gate routes by auth.
// Role-level gating (admin-only history/manager) is enforced in the pages/layouts
// via getSessionProfile(); here we only ensure a session exists for app routes.
const PUBLIC_PATHS = ["/login", "/styleguide"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Validated env access: a missing/misnamed Supabase var fails loudly here
  // rather than silently constructing a broken client and breaking auth.
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = publicSupabaseEnv();
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated → login (except public paths + Next internals/assets).
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting /login → send home.
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on all routes except Next internals, the SW, and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|sw.js|aurion-logo|fonts|api/).*)",
  ],
};
