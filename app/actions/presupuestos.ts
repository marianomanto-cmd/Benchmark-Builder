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
import { z } from 'zod'

import { cuotasSuman100 } from '@/lib/calculo'
import { createClient, getUsuario } from '@/lib/supabase/server'

/* ═══════════════════════════════════════════════════════════
   Validación
   ═══════════════════════════════════════════════════════════ */

const tipoCobertura = z.enum(['porcentaje', 'monto', 'ninguna'])

const textoOpcional = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .default(null)
  // El cliente manda "" cuando el campo quedó vacío; en la base eso es null.
  .transform((v) => (v ? v : null))

const itemSchema = z
  .object({
    prestacion_id: z.uuid().nullable().default(null),
    arancel_id: z.uuid().nullable().default(null),
    nombre: z.string().trim().min(1, 'Cada prestación necesita un nombre.').max(200),
    codigo: textoOpcional,
    descripcion: textoOpcional,
    detalle: textoOpcional,
    monto: z
      .number()
      .int('Los montos van en pesos enteros.')
      .min(0, 'Un monto no puede ser negativo.')
      .max(999_999_999),
    cobertura_tipo: tipoCobertura,
    cobertura_valor: z.number().min(0, 'La cobertura no puede ser negativa.').max(999_999_999),
    editado: z.boolean().default(false),
    cobertura_original_tipo: tipoCobertura.nullable().default(null),
    cobertura_original_valor: z.number().min(0).max(999_999_999).nullable().default(null),
    motivo_override: textoOpcional,
  })
  .refine((i) => i.cobertura_tipo !== 'porcentaje' || i.cobertura_valor <= 100, {
    message: 'Una cobertura por porcentaje no puede pasar de 100 %.',
    path: ['cobertura_valor'],
  })

const cuotaSchema = z.object({
  etiqueta: z.string().trim().min(1, 'Cada condición de pago necesita una etiqueta.').max(120),
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
    obra_social_id: z.uuid().nullable().default(null),
    fecha_emision: z.iso.date('La fecha de emisión no es válida.'),
    valido_hasta: z.iso.date('La fecha de vigencia no es válida.'),
    observaciones: textoOpcional,
    nota_interna: textoOpcional,
    /**
     * El wizard sólo emite en estos dos. `borrador` no se ofrece: un
     * presupuesto a medias vive en localStorage, no en la base.
     */
    estado: z.enum(['realizado', 'enviado']),
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

export type ResultadoCrear =
  | { ok: true; id: string; numero: string }
  | { ok: false; error: string }

/* ═══════════════════════════════════════════════════════════
   Traducción de errores de Postgres
   ═══════════════════════════════════════════════════════════ */

/**
 * Los `raise exception` de la RPC ya vienen en castellano y son para
 * mostrar. El resto (violaciones de constraint, timeouts) se traduce a
 * algo accionable: nadie en el consultorio sabe qué es un check
 * constraint.
 */
function mensajeDeError(crudo: string): string {
  const m = crudo.toLowerCase()
  if (m.includes('presupuesto_items_cobertura_en_rango')) {
    return 'Hay una cobertura mayor al monto de la prestación. Revisá los valores editados a mano.'
  }
  if (m.includes('presupuesto_items_porcentaje_valido')) {
    return 'Hay una cobertura por porcentaje mayor a 100 %. Revisá los valores editados a mano.'
  }
  if (m.includes('no autenticado') || m.includes('jwt')) {
    return 'Se cerró la sesión. Volvé a entrar y guardá de nuevo: el borrador quedó en este dispositivo.'
  }
  if (m.includes('violates row-level security') || m.includes('permission denied')) {
    return 'Tu usuario no tiene permiso para emitir presupuestos. Avisale al consultorio.'
  }
  if (m.includes('paciente inexistente')) {
    return 'El paciente ya no existe. Elegilo de nuevo en el paso 1.'
  }
  if (m.includes('profesional inexistente')) {
    return 'El profesional ya no existe. Elegilo de nuevo en el paso 1.'
  }
  return crudo
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
    return { ok: false, error: primero?.message ?? 'Faltan datos para emitir el presupuesto.' }
  }

  const datos = parseado.data
  const supabase = await createClient()

  const { data: id, error } = await supabase.rpc('crear_presupuesto', {
    p_payload: datos,
  })

  if (error) {
    return { ok: false, error: mensajeDeError(error.message) }
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
