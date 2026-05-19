/**
 * Middleware — refresca la sesión de Supabase y protege las rutas.
 * Single-user: sólo AUTH_ALLOWED_EMAIL pasa. Cualquier otra sesión se trata
 * como no autorizada y se bloquea (el signOut real ocurre en /auth/callback).
 *
 * Si Supabase no está configurado (sin env), el middleware deja pasar para no
 * dejar la app inaccesible antes del setup en Vercel.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC_ROUTES = ["/login"];
const PUBLIC_PREFIXES = ["/auth", "/_next", "/favicon"];
const ALLOWED_EMAIL = process.env.AUTH_ALLOWED_EMAIL?.toLowerCase().trim();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] Supabase no configurado; middleware en passthrough.");
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase().trim();
  const allowed = !!user && (!ALLOWED_EMAIL || email === ALLOWED_EMAIL);

  if (isPublic) return response;

  if (!allowed) {
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("from", pathname);
    if (user && !allowed) redirect.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)",
  ],
};
