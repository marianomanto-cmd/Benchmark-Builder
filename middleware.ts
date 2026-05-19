/**
 * Middleware — protege todas las rutas excepto /login y /api/auth/*.
 * Si no hay sesión, redirige a /login.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login"];
const PUBLIC_PREFIXES = ["/api/auth", "/_next", "/favicon"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!req.auth) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)"],
};
