/**
 * Supabase browser client — para componentes cliente.
 * Crear dentro de event handlers / efectos, no a nivel de módulo, para no
 * instanciar durante prerender si las env vars no están seteadas.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
