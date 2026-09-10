'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

import { credencialesSupabase } from './env'

/**
 * Cliente de navegador. Todas las lecturas interactivas (comboboxes,
 * grilla de aranceles, kanban) pasan por acá con la sesión del usuario:
 * la RLS es la que autoriza, no el código.
 *
 * **Es uno solo por pestaña.** `createBrowserClient` levanta un
 * `GoTrueClient` con su propio timer de refresh y su propio candado
 * sobre el storage de la sesión; con varios en la misma página se pisan
 * al renovar el token (Supabase mismo avisa «Multiple GoTrueClient
 * instances detected in the same browser context») y aparecen 401
 * fantasma en medio de una carga. Acá llamaban a `createClient()` el
 * wizard, el drawer del histórico de aranceles y el sheet de WhatsApp:
 * tres instancias distintas, una por componente montado.
 *
 * `createBrowserClient` ya devuelve un singleton por combinación de
 * credenciales, pero la garantía es de esta capa, no de la librería.
 */
let cliente: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (!cliente) {
    const { url, anonKey } = credencialesSupabase()
    cliente = createBrowserClient(url, anonKey)
  }
  return cliente
}
