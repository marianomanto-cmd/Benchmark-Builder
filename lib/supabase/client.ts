'use client'

import { createBrowserClient } from '@supabase/ssr'

import { credencialesSupabase } from './env'

/**
 * Cliente de navegador. Todas las lecturas interactivas (comboboxes,
 * grilla de aranceles, kanban) pasan por acá con la sesión del usuario:
 * la RLS es la que autoriza, no el código.
 */
export function createClient() {
  const { url, anonKey } = credencialesSupabase()
  return createBrowserClient(url, anonKey)
}
