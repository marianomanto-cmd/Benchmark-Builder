'use server'

/**
 * Alta de presupuesto.
 *
 * El wizard calcula la cobertura en el cliente sólo para el preview:
 * el número que queda escrito en el documento lo recalcula
 * `crear_presupuesto()` con `calcular_cobertura()`. Esta acción no
 * hace inserts sueltos — cabecera, ítems, cuotas y evento tienen que
 * entrar en una sola transacción o el documento queda a medias.
 */

import { revalidatePath } from 'next/cache'

import { cuotasSuman100 } from '@/lib/calculo'
import { esJerga } from '@/lib/errores'
import { createClient, getUsuario } from '@/lib/supabase/server'
import { z } from '@/lib/zod'

/* ═══════════════════════════════════════════════════════════
   Validación
   ═══════════════════════════════════════════════════════════ */

const tipoCobertura = z.enum(['porcentaje', 'monto', 'ninguna'], 'Ese tipo de cobertura no existe.')

const textoOpcional = z
  .string()
  .trim()
  .max(2000, 'Ese texto es demasiado largo: no puede pasar de 2000 caracteres.')
  .nullable()
  .default(null)
  // El cliente manda "" cuando el campo quedó vacío; en la base eso es null.
  .transform((v) => (v ? v : null))

const itemSchema = z
  .object({
    prestacion_id: z.uuid('La prestación elegida no es válida.').nullable().default(null),
    arancel_id: z.uuid('El arancel elegido no es válido.').nullable().default(null),
    nombre: z
      .string()
      .trim()
      .min(1, 'Cada prestación necesita un nombre.')
      .max(200, 'El nombre de una prestación no puede pasar de 200 caracteres.'),
    codigo: textoOpcional,
    descripcion: textoOpcional,
    detalle: textoOpcional,
    monto: z
      .number()
      .int('Los montos van en pesos enteros.')
      .min(0, 'Un monto no puede ser negativo.')
      .max(999_999_999, 'Ese monto es demasiado grande. Revisá los ceros.'),
    cobertura_tipo: tipoCobertura,
    cobertura_valor: z
      .number()
      .min(0, 'La cobertura no puede ser negativa.')
      .max(999_999_999, 'Esa cobertura es demasiado grande. Revisá los ceros.'),
    editado: z.boolean().default(false),
    cobertura_original_tipo: tipoCobertura.nullable().default(null),
    cobertura_original_valor: z
      .number()
      .min(0, 'La cobertura de referencia no puede ser negativa.')
      .max(999_999_999, 'La cobertura de referencia es demasiado grande.')
      .nullable()
      .default(null),
    motivo_override: textoOpcional,
  })
  .refine((i) => i.cobertura_tipo !== 'porcentaje' || i.cobertura_valor <= 100, {
    message: 'Una cobertura por porcentaje no puede pasar de 100 %.',
    path: ['cobertura_valor'],
  })

const cuotaSchema = z.object({
  etiqueta: z
    .string()
    .trim()
    .min(1, 'Cada condición de pago necesita una etiqueta.')
    .max(120, 'El nombre de una condición de pago no puede pasar de 120 caracteres.'),
  porcentaje: z
    .number()
    .min(0, 'Un porcentaje no puede ser negativo.')
    .max(100, 'Un porcentaje no puede pasar de 100.'),
})

const payloadSchema = z
  .object({
    paciente_id: z.uuid('Elegí un paciente.'),
    profesional_id: z.uuid('Elegí un profesional.'),
    /** null = Particular. */
    obra_social_id: z.uuid('La obra social elegida no es válida.').nullable().default(null),
    fecha_emision: z.iso.date('La fecha de emisión no es válida.'),
    valido_hasta: z.iso.date('La fecha de vigencia no es válida.'),
    observaciones: textoOpcional,
    nota_interna: textoOpcional,
    /**
     * El wizard sólo emite en estos dos. `borrador` no se ofrece: un
     * presupuesto a medias vive en localStorage, no en la base.
     */
    estado: z.enum(['realizado', 'enviado']),
    /**
     * Clave de idempotencia del alta, generada por el wizard. La RPC la
     * usa para reconocer un reintento: si esta clave ya emitió un
     * presupuesto, devuelve ese mismo en lugar de crear otro.
     */
    clave_alta: z.uuid('La clave del alta no es válida.').nullable().default(null),
    items: z.array(itemSchema).min(1, 'Un presupuesto necesita al menos una prestación.'),
    cuotas: z.array(cuotaSchema).max(12, 'Doce condiciones de pago son demasiadas.').default([]),
  })
  .refine((p) => p.valido_hasta >= p.fecha_emision, {
    message: 'La vigencia no puede terminar antes de la fecha de emisión.',
    path: ['valido_hasta'],
  })
  .refine((p) => p.cuotas.length === 0 || cuotasSuman100(p.cuotas.map((c) => c.porcentaje)), {
    message: 'Las condiciones de pago tienen que sumar 100 %.',
    path: ['cuotas'],
  })

/** Lo que el wizard arma y manda. */
export type PayloadPresupuesto = z.input<typeof payloadSchema>
export type ItemPayload = z.input<typeof itemSchema>
export type CuotaPayload = z.input<typeof cuotaSchema>

/** En qué paso del wizard se arregla el problema. */
export type PasoWizard = 1 | 2 | 3

export type ResultadoCrear =
  | { ok: true; id: string; numero: string }
  | { ok: false; error: string; paso?: PasoWizard }

/* ═══════════════════════════════════════════════════════════
   Traducción de errores de Postgres
   ═══════════════════════════════════════════════════════════ */

/**
 * Qué paso del wizard toca el campo que falló la validación. El wizard
 * ofrece "Ir al paso N": sin esto, un error de un campo del paso 1 se
 * lee parado en el paso 3 y hay que salir a buscarlo a mano.
 */
function pasoDelCampo(path: PropertyKey[]): PasoWizard | undefined {
  const campo = String(path[0] ?? '')
  if (['paciente_id', 'profesional_id', 'obra_social_id', 'fecha_emision', 'valido_hasta'].includes(campo)) {
    return 1
  }
  if (campo === 'items') return 2
  if (['cuotas', 'observaciones', 'nota_interna', 'estado'].includes(campo)) return 3
  return undefined
}

interface ErrorTraducido {
  mensaje: string
  paso?: PasoWizard
}

function traducirError(crudo: string): ErrorTraducido {
  const m = crudo.toLowerCase()
  if (m.includes('presupuesto_items_cobertura_en_rango')) {
    return {
      mensaje:
        'Hay una cobertura mayor al monto de la prestación. Revisá los valores editados a mano.',
      paso: 2,
    }
  }
  if (m.includes('presupuesto_items_porcentaje_valido')) {
    return {
      mensaje:
        'Hay una cobertura por porcentaje mayor a 100 %. Revisá los valores editados a mano.',
      paso: 2,
    }
  }
  if (m.includes('no autenticado') || m.includes('jwt')) {
    return {
      mensaje:
        'Se cerró la sesión. Volvé a entrar en otra pestaña y guardá de nuevo: lo cargado sigue acá.',
    }
  }
  if (m.includes('violates row-level security') || m.includes('permission denied')) {
    return {
      mensaje: 'Tu usuario no tiene permiso para emitir presupuestos. Avisale al consultorio.',
    }
  }
  if (m.includes('paciente inexistente')) {
    return { mensaje: 'El paciente ya no existe. Elegilo de nuevo en el paso 1.', paso: 1 }
  }
  if (m.includes('profesional inexistente')) {
    return { mensaje: 'El profesional ya no existe. Elegilo de nuevo en el paso 1.', paso: 1 }
  }
  if (m.includes('cuotas') && m.includes('100')) {
    return { mensaje: 'Las condiciones de pago tienen que sumar 100 %.', paso: 3 }
  }
  // Postgres se quedó sin tiempo o el enlace se cortó: no se perdió
  // nada, hay que volver a intentar.
  if (
    m.includes('canceling statement') ||
    m.includes('timeout') ||
    m.includes('etimedout') ||
    m.includes('fetch failed') ||
    m.includes('network')
  ) {
    return {
      mensaje:
        'No hubo respuesta del servidor. Probá "Reintentar": lo cargado sigue acá y, si el presupuesto llegó a emitirse, no se va a duplicar.',
    }
  }
  if (esJerga(crudo)) {
    return {
      mensaje:
        'El servidor rechazó el presupuesto. Revisá montos y coberturas, y si sigue igual avisale al consultorio.',
    }
  }
  return { mensaje: crudo }
}

/* ═══════════════════════════════════════════════════════════
   Acción
   ═══════════════════════════════════════════════════════════ */

/**
 * Crea el presupuesto y devuelve su id y su número.
 *
 * Una server action es un endpoint POST público: la sesión se verifica
 * acá, no se confía en que el cliente haya llegado por la UI.
 */
export async function crearPresupuesto(
  payload: PayloadPresupuesto,
): Promise<ResultadoCrear> {
  const usuario = await getUsuario()
  if (!usuario) {
    return {
      ok: false,
      error: 'Se cerró la sesión. Volvé a entrar: el borrador quedó guardado en este dispositivo.',
    }
  }

  const parseado = payloadSchema.safeParse(payload)
  if (!parseado.success) {
    const primero = parseado.error.issues[0]
    return {
      ok: false,
      error: primero?.message ?? 'Faltan datos para emitir el presupuesto.',
      paso: primero ? pasoDelCampo(primero.path) : undefined,
    }
  }

  const datos = parseado.data
  const supabase = await createClient()

  /**
   * `rpc()` devuelve el error de Postgres en `error`, pero **tira** si
   * se cae la red o Supabase no responde. Sin este `catch`, esa caída
   * llegaba al cliente como el error genérico de una server action y el
   * wizard mostraba "An unexpected response was received from the
   * server" arriba de un presupuesto entero cargado.
   *
   * Ojo con lo que se promete acá: cuando el enlace se corta DESPUÉS del
   * commit, el presupuesto está emitido y esta rama igual se ejecuta.
   * Por eso el payload lleva `clave_alta`: el reintento vuelve a entrar
   * con la misma clave y la RPC devuelve el documento que ya existe en
   * lugar de emitir un segundo. Sin esa clave, el mensaje de abajo sería
   * mentira y el consultorio terminaría con dos números para el mismo
   * tratamiento.
   */
  let id: unknown
  try {
    const respuesta = await supabase.rpc('crear_presupuesto', { p_payload: datos })
    if (respuesta.error) {
      // El crudo queda del lado del servidor: en pantalla va lo accionable.
      console.error('[crear_presupuesto]', respuesta.error.message)
      const traducido = traducirError(respuesta.error.message)
      return { ok: false, error: traducido.mensaje, paso: traducido.paso }
    }
    id = respuesta.data
  } catch (e) {
    console.error('[crear_presupuesto] excepción', e)
    return {
      ok: false,
      error:
        'No se pudo hablar con el servidor. Probá "Reintentar": lo cargado sigue acá y, si el presupuesto llegó a emitirse, no se va a duplicar.',
    }
  }

  if (typeof id !== 'string') {
    return { ok: false, error: 'El presupuesto no se pudo crear. Probá de nuevo en un momento.' }
  }

  // El número lo pone un trigger (`2026-0341`), así que se lee después
  // de crear: es lo que la pantalla siguiente y el WhatsApp muestran.
  const { data: fila } = await supabase
    .from('presupuestos')
    .select('numero')
    .eq('id', id)
    .maybeSingle()

  // La home y el pipeline listan presupuestos desde el servidor: sin
  // esto, el recién creado no aparece hasta la próxima navegación dura.
  revalidatePath('/')
  revalidatePath('/pipeline')

  return { ok: true, id, numero: fila?.numero ?? '' }
}
