/**
 * ¿Fue la red, o fue un no?
 *
 * `auth.getUser()` devuelve `user: null` en los dos casos: cuando la
 * sesión no sirve y cuando no se pudo hablar con Supabase Auth. Y eso
 * corre en **cada** request (el proxy) más una vez por render (el
 * layout). Tratar un timeout como un cierre de sesión echaba a la
 * recepción al login en medio de un presupuesto, por algo que se
 * arreglaba solo en el siguiente intento.
 *
 * `AuthRetryableFetchError` es lo que supabase-js devuelve cuando el
 * pedido no llegó (timeout, DNS, 5xx). Un 401 o un 403, en cambio, son
 * una respuesta: la sesión no vale y hay que volver a entrar.
 *
 * Lo usan `lib/supabase/proxy.ts` (para dejar pasar) y
 * `lib/supabase/server.ts` (para reintentar una vez).
 */
export function esFallaDeTransporte(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { name?: string; status?: number }
  if (e.name === 'AuthRetryableFetchError') return true
  // Sin `status` no hubo respuesta HTTP: el pedido no llegó a destino.
  if (typeof e.status !== 'number') return e.name === 'TypeError' || e.name === 'AbortError'
  return e.status === 0 || e.status >= 500
}
