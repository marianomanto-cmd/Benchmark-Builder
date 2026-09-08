'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente de navegador. Todas las lecturas interactivas (comboboxes,
 * grilla de aranceles, kanban) pasan por acá con la sesión del usuario:
 * la RLS es la que autoriza, no el código.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
