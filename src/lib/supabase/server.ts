/**
 * Supabase server client — para Server Components y Route Handlers.
 * Usa el cookie store de Next. El setAll puede fallar en Server Components
 * (read-only); se ignora porque el middleware refresca la sesión.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component sin permiso de escritura — ok, lo hace el middleware.
          }
        },
      },
    },
  );
}

export const ALLOWED_EMAIL = process.env.AUTH_ALLOWED_EMAIL?.toLowerCase().trim();

export function isAllowed(email: string | null | undefined): boolean {
  const e = email?.toLowerCase().trim();
  if (!ALLOWED_EMAIL) return !!e; // si no hay allowlist configurada, cualquier sesión vale
  return e === ALLOWED_EMAIL;
}
