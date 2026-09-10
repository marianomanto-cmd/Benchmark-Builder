/**
 * Qué se le muestra a quien está atendiendo cuando algo falla abajo.
 *
 * Los `raise exception` de las RPC están escritos en castellano y para
 * mostrar: «Un presupuesto emitido no vuelve a borrador», «Ese arancel
 * ya se usó». Ese texto se pasa tal cual, porque es exactamente lo que
 * hay que decir.
 *
 * El resto no. «new row for relation "presupuesto_items" violates check
 * constraint "presupuesto_items_cobertura_en_rango"» no le dice nada a
 * quien tiene un paciente enfrente, y encima lo asusta: parece que se
 * rompió algo grave y que la culpa es suya. Lo mismo un `fetch failed`
 * o un `ECONNREFUSED`.
 *
 * Cada acción traduce primero los errores que sabe nombrar; esto es lo
 * que decide qué hacer con los que no reconoció. El crudo queda en el
 * log del servidor, que es donde sirve.
 */

const PISTAS_DE_JERGA = [
  'violates',
  'constraint',
  'relation',
  'column',
  'invalid input syntax',
  'duplicate key',
  'null value',
  'function',
  'operator',
  'syntax error',
  'fetch failed',
  'econnrefused',
  'etimedout',
  'network',
  'timeout',
  'canceling statement',
  // Los de PostgREST y GoTrue, que llegan en inglés
  'jwt expired',
  'failed to fetch',
  'unexpected token',
  'internal server error',
] as const

/** ¿El texto es un error interno de Postgres, de PostgREST o de red? */
export function esJerga(crudo: string): boolean {
  const m = crudo.toLowerCase()
  return PISTAS_DE_JERGA.some((pista) => m.includes(pista))
}

/**
 * El mensaje que se muestra: el crudo si está escrito para leer, y si
 * no, algo accionable.
 *
 * `alternativa` la pone quien llama porque depende de qué se estaba
 * haciendo: no es lo mismo «no se pudo guardar el arancel» que «no se
 * pudo cambiar el estado del presupuesto».
 */
export function paraMostrar(crudo: string, alternativa: string): string {
  return esJerga(crudo) ? alternativa : crudo
}

/**
 * Corre una llamada a Supabase sin que una caída de red se escape como
 * excepción.
 *
 * El cliente de Supabase devuelve los errores de Postgres en `error`,
 * pero **tira** cuando no llega a hablar con el servidor: se cayó el
 * wifi del consultorio, Supabase no responde, el celular cambió de
 * antena. Sin esto, esa caída sale de la server action y Next la
 * convierte en «An unexpected response was received from the server»,
 * que no le dice a nadie qué hacer.
 *
 * Ojo con lo que promete quien llama: si la llamada era una escritura,
 * el corte puede haber pasado DESPUÉS del commit. Ahí no se puede decir
 * «no pasó nada» —hay que decir que se revise antes de repetir— salvo
 * que la operación sea idempotente, como el alta de un presupuesto.
 */
export async function sinCaerse<T>(
  correr: () => PromiseLike<T>,
  contexto: string,
): Promise<{ ok: true; valor: T } | { ok: false }> {
  try {
    return { ok: true, valor: await correr() }
  } catch (e) {
    console.error(`[supabase] ${contexto}: la llamada no llegó`, e)
    return { ok: false }
  }
}
