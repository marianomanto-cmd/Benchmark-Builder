'use server'

/**
 * Seguimiento comercial de un presupuesto ya emitido: cambios de
 * estado, duplicado, nota interna, envío por WhatsApp y teléfono del
 * paciente.
 *
 * Ninguna de estas acciones toca los ítems ni los totales: el documento
 * está congelado. Lo único que se mueve es lo que pasa **alrededor** del
 * documento, y todo queda registrado en `presupuesto_eventos`.
 *
 * Las escrituras con lógica de dominio van por RPC (`cambiar_estado`,
 * `duplicar_presupuesto`, `registrar_evento`): tienen que ser atómicas
 * con el evento que las cuenta, o el historial miente.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient, getUsuario } from '@/lib/supabase/server'
import type { EstadoPresupuesto, MotivoPerdida } from '@/lib/types'

/* ═══════════════════════════════════════════════════════════
   Validación
   ═══════════════════════════════════════════════════════════ */

const idSchema = z.uuid('El presupuesto no es válido.')

const estadoSchema = z.enum([
  'borrador',
  'realizado',
  'enviado',
  'pendiente',
  'interesado',
  'aceptado',
  'iniciado',
  'perdido',
])

const motivoSchema = z.enum(['precio', 'sin_respuesta', 'cobertura', 'otro_lugar', 'otro'])

const cambioSchema = z
  .object({
    id: idSchema,
    estado: estadoSchema,
    motivo: motivoSchema.nullish(),
    nota: z.string().trim().max(500, 'La nota del motivo es demasiado larga.').nullish(),
  })
  // La guarda dura está en `cambiar_estado()`, pero conviene no gastar
  // un viaje a la base para algo que ya sabemos que va a fallar.
  .refine((c) => c.estado !== 'borrador', {
    message: 'Un presupuesto emitido no vuelve a borrador: duplicalo con los valores de hoy.',
    path: ['estado'],
  })

const notaSchema = z.object({
  id: idSchema,
  texto: z.string().trim().max(4000, 'La nota interna no puede pasar de 4.000 caracteres.'),
})

const envioSchema = z.object({
  id: idSchema,
  marcarEnviado: z.boolean(),
  descripcion: z.string().trim().max(300).nullish(),
})

const telefonoSchema = z.object({
  pacienteId: z.uuid('El paciente no es válido.'),
  telefono: z
    .string()
    .trim()
    .max(40, 'Ese teléfono es demasiado largo.')
    // Se guarda tal cual lo escribe el consultorio; el normalizado a
    // formato wa.me lo hace `telefonoWhatsApp()` al armar el link.
    .refine((t) => t.replace(/\D/g, '').length >= 8, {
      message: 'Escribí el teléfono con característica, por ejemplo 351 555-1234.',
    }),
})

/* ═══════════════════════════════════════════════════════════
   Resultados
   ═══════════════════════════════════════════════════════════ */

export type Resultado<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string }

const SIN_SESION =
  'Se cerró la sesión. Volvé a entrar y probá de nuevo: el presupuesto quedó como estaba.'

/**
 * Los `raise exception` de las RPC vienen en castellano y son para
 * mostrar. El resto se traduce: nadie en el consultorio sabe qué es una
 * violación de RLS.
 */
function mensajeDeError(crudo: string): string {
  const m = crudo.toLowerCase()
  if (m.includes('no vuelve a borrador')) {
    return 'Un presupuesto emitido no vuelve a borrador. Si necesitás cambiar las prestaciones, duplicalo.'
  }
  if (m.includes('presupuesto inexistente')) {
    return 'Ese presupuesto ya no existe. Volvé al listado y refrescá.'
  }
  if (m.includes('no autenticado') || m.includes('jwt')) {
    return SIN_SESION
  }
  if (m.includes('violates row-level security') || m.includes('permission denied')) {
    return 'Tu usuario no tiene permiso para esta acción. Avisale al consultorio.'
  }
  return crudo
}

/**
 * Home y pipeline se arman en el servidor, y el detalle muestra el
 * timeline: los tres tienen que reflejar el cambio sin navegación dura.
 */
function revalidar(id: string) {
  revalidatePath('/')
  revalidatePath('/pipeline')
  revalidatePath(`/presupuestos/${id}`)
}

/* ═══════════════════════════════════════════════════════════
   Cambio de estado
   ═══════════════════════════════════════════════════════════ */

/**
 * Mueve el presupuesto en el pipeline. `motivo` y `nota` sólo se
 * guardan cuando el destino es `perdido` (lo fuerza la RPC).
 */
export async function cambiarEstado(
  id: string,
  estado: EstadoPresupuesto,
  motivo?: MotivoPerdida | null,
  nota?: string | null,
): Promise<Resultado<{ estado: EstadoPresupuesto }>> {
  const usuario = await getUsuario()
  if (!usuario) return { ok: false, error: SIN_SESION }

  const parseado = cambioSchema.safeParse({ id, estado, motivo, nota })
  if (!parseado.success) {
    return {
      ok: false,
      error: parseado.error.issues[0]?.message ?? 'No se pudo cambiar el estado.',
    }
  }
  const datos = parseado.data

  const supabase = await createClient()
  const { error } = await supabase.rpc('cambiar_estado', {
    p_id: datos.id,
    p_estado: datos.estado,
    // Fuera de `perdido` la RPC los ignora igual, pero se mandan en null
    // para que el intento quede explícito de este lado también.
    p_motivo: datos.estado === 'perdido' ? (datos.motivo ?? null) : null,
    p_nota: datos.estado === 'perdido' ? (datos.nota || null) : null,
  })

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidar(datos.id)
  return { ok: true, estado: datos.estado }
}

/* ═══════════════════════════════════════════════════════════
   Duplicar con valores de hoy
   ═══════════════════════════════════════════════════════════ */

/**
 * Única salida cuando los precios quedaron viejos: se emite un
 * presupuesto nuevo con los aranceles vigentes hoy y el original queda
 * intacto. Devuelve el id del nuevo para navegar ahí.
 */
export async function duplicarPresupuesto(
  id: string,
): Promise<Resultado<{ id: string; numero: string }>> {
  const usuario = await getUsuario()
  if (!usuario) return { ok: false, error: SIN_SESION }

  const parseado = idSchema.safeParse(id)
  if (!parseado.success) return { ok: false, error: 'Ese presupuesto no es válido.' }

  const supabase = await createClient()
  const { data: nuevoId, error } = await supabase.rpc('duplicar_presupuesto', {
    p_id: parseado.data,
  })

  if (error) return { ok: false, error: mensajeDeError(error.message) }
  if (typeof nuevoId !== 'string') {
    return { ok: false, error: 'No se pudo duplicar el presupuesto. Probá de nuevo en un momento.' }
  }

  // El número lo pone un trigger, así que se lee después de crear.
  const { data: fila } = await supabase
    .from('presupuestos')
    .select('numero')
    .eq('id', nuevoId)
    .maybeSingle()

  revalidar(parseado.data)
  revalidatePath(`/presupuestos/${nuevoId}`)

  return { ok: true, id: nuevoId, numero: fila?.numero ?? '' }
}

/* ═══════════════════════════════════════════════════════════
   Nota interna
   ═══════════════════════════════════════════════════════════ */

/**
 * La nota interna es un campo editable (se pisa), pero cada guardado
 * deja su propio evento en el historial: el timeline es append-only y
 * tiene que poder contar qué se anotó y cuándo.
 */
export async function guardarNotaInterna(
  id: string,
  texto: string,
): Promise<Resultado<{ texto: string | null; aviso?: string }>> {
  const usuario = await getUsuario()
  if (!usuario) return { ok: false, error: SIN_SESION }

  const parseado = notaSchema.safeParse({ id, texto })
  if (!parseado.success) {
    return { ok: false, error: parseado.error.issues[0]?.message ?? 'No se pudo guardar la nota.' }
  }
  const datos = parseado.data
  const limpio = datos.texto || null

  const supabase = await createClient()

  const { data: anterior } = await supabase
    .from('presupuestos')
    .select('nota_interna')
    .eq('id', datos.id)
    .maybeSingle()

  // Sin cambios no se escribe nada: no tiene sentido llenar el historial
  // de eventos por abrir y cerrar el campo.
  if ((anterior?.nota_interna ?? null) === limpio) {
    return { ok: true, texto: limpio }
  }

  const { error } = await supabase
    .from('presupuestos')
    .update({ nota_interna: limpio })
    .eq('id', datos.id)

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  const resumen = limpio
    ? `Nota interna: «${limpio.length > 180 ? `${limpio.slice(0, 180)}…` : limpio}»`
    : 'Se borró la nota interna'

  const { error: errorEvento } = await supabase.rpc('registrar_evento', {
    p_id: datos.id,
    p_tipo: 'nota',
    p_desc: resumen,
  })

  revalidar(datos.id)

  // La nota YA se guardó: son dos escrituras y la primera entró. Decir
  // «no se pudo guardar» sería mentir —el texto está en la base— y el
  // consultorio lo escribiría de nuevo. Se reporta lo que falló.
  if (errorEvento) {
    console.error('[nota] se guardó la nota pero no el evento', errorEvento)
    return {
      ok: true,
      texto: limpio,
      aviso: 'La nota quedó guardada, pero no se pudo anotar en el historial.',
    }
  }

  return { ok: true, texto: limpio }
}

/* ═══════════════════════════════════════════════════════════
   Envío por WhatsApp
   ═══════════════════════════════════════════════════════════ */

/** Estados desde los que "marcar como enviado" tiene sentido. */
const ANTES_DE_ENVIAR: EstadoPresupuesto[] = ['borrador', 'realizado']

/**
 * Registra el envío y, si corresponde, mueve el estado a `enviado`.
 *
 * DECISIÓN DELIBERADA: esto se llama al **disparar** el share, no al
 * confirmar. WhatsApp no devuelve resultado — ni `navigator.share` ni
 * `wa.me` avisan si el mensaje se mandó — así que esperar una
 * confirmación sería inventarla. Preferimos registrar el intento: es lo
 * que realmente pasó, y el consultorio puede corregir el estado a mano.
 *
 * Un presupuesto que ya está en `pendiente` o más adelante NO vuelve a
 * `enviado`: mandar un recordatorio no lo hace retroceder en el pipeline.
 */
export async function registrarEnvioWhatsapp(
  id: string,
  marcarEnviado: boolean,
  descripcion?: string | null,
): Promise<Resultado<{ estado: EstadoPresupuesto | null; aviso?: string }>> {
  const usuario = await getUsuario()
  if (!usuario) return { ok: false, error: SIN_SESION }

  const parseado = envioSchema.safeParse({ id, marcarEnviado, descripcion })
  if (!parseado.success) {
    return { ok: false, error: parseado.error.issues[0]?.message ?? 'No se pudo registrar el envío.' }
  }
  const datos = parseado.data

  const supabase = await createClient()

  const { data: fila, error: errorLectura } = await supabase
    .from('presupuestos')
    .select('estado')
    .eq('id', datos.id)
    .maybeSingle()

  if (errorLectura) return { ok: false, error: mensajeDeError(errorLectura.message) }
  if (!fila) return { ok: false, error: 'Ese presupuesto ya no existe. Volvé al listado y refrescá.' }

  const { error } = await supabase.rpc('registrar_evento', {
    p_id: datos.id,
    p_tipo: 'enviado_whatsapp',
    p_desc: datos.descripcion || 'Enviado por WhatsApp',
  })
  if (error) return { ok: false, error: mensajeDeError(error.message) }

  const actual = fila.estado as EstadoPresupuesto
  let estadoFinal: EstadoPresupuesto | null = null

  if (datos.marcarEnviado && ANTES_DE_ENVIAR.includes(actual)) {
    const { error: errorEstado } = await supabase.rpc('cambiar_estado', {
      p_id: datos.id,
      p_estado: 'enviado',
      p_motivo: null,
      p_nota: null,
    })
    if (errorEstado) {
      // El evento del envío YA está escrito. Devolver `ok: false` hacía
      // que el sheet dijera «el envío no se pudo anotar en el historial»
      // justo cuando sí se anotó: lo que quedó a medias es el estado.
      console.error('[envío] se anotó el envío pero no el cambio de estado', errorEstado)
      revalidar(datos.id)
      return {
        ok: true,
        estado: null,
        aviso: 'El envío quedó en el historial, pero el estado no se pudo mover a Enviado.',
      }
    }
    estadoFinal = 'enviado'
  }

  revalidar(datos.id)
  return { ok: true, estado: estadoFinal }
}

/* ═══════════════════════════════════════════════════════════
   Teléfono del paciente
   ═══════════════════════════════════════════════════════════ */

/**
 * Carga el teléfono que faltaba, desde el mismo sheet de envío.
 *
 * Se guarda en la ficha (es un dato del paciente, no del documento) y
 * además se completa el snapshot de los presupuestos que quedaron sin
 * teléfono: ahí no había un valor que defender, había un hueco, y sin
 * esto el listado seguiría mostrando el botón de WhatsApp apagado.
 * Los presupuestos que ya tenían un teléfono no se tocan.
 */
export async function guardarTelefonoPaciente(
  pacienteId: string,
  telefono: string,
): Promise<Resultado<{ telefono: string }>> {
  const usuario = await getUsuario()
  if (!usuario) return { ok: false, error: SIN_SESION }

  const parseado = telefonoSchema.safeParse({ pacienteId, telefono })
  if (!parseado.success) {
    return { ok: false, error: parseado.error.issues[0]?.message ?? 'Ese teléfono no es válido.' }
  }
  const datos = parseado.data

  const supabase = await createClient()

  const { error } = await supabase
    .from('pacientes')
    .update({ telefono: datos.telefono, tiene_whatsapp: true })
    .eq('id', datos.pacienteId)

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  await supabase
    .from('presupuestos')
    .update({ paciente_telefono: datos.telefono })
    .eq('paciente_id', datos.pacienteId)
    .is('paciente_telefono', null)

  revalidatePath('/')
  revalidatePath('/pipeline')
  revalidatePath('/biblioteca')

  return { ok: true, telefono: datos.telefono }
}

/* ═══════════════════════════════════════════════════════════
   Link firmado del PDF
   ═══════════════════════════════════════════════════════════ */

/** Una semana, igual que la política del bucket. */
const SEGUNDOS_LINK_PDF = 60 * 60 * 24 * 7

/**
 * Devuelve un link firmado al PDF cacheado en Storage, para pegar en el
 * mensaje de WhatsApp cuando no se puede compartir el archivo.
 *
 * Quien genera y cachea el PDF es `/api/presupuestos/[id]/pdf`; acá sólo
 * se firma lo que esa route ya dejó en el bucket. Por eso el sheet pide
 * el PDF a la route antes de llamar a esta acción.
 */
export async function obtenerLinkPdf(id: string): Promise<Resultado<{ url: string }>> {
  const usuario = await getUsuario()
  if (!usuario) return { ok: false, error: SIN_SESION }

  const parseado = idSchema.safeParse(id)
  if (!parseado.success) return { ok: false, error: 'Ese presupuesto no es válido.' }

  const supabase = await createClient()

  const { data: fila, error } = await supabase
    .from('presupuestos')
    .select('pdf_path')
    .eq('id', parseado.data)
    .maybeSingle()

  if (error) return { ok: false, error: mensajeDeError(error.message) }
  if (!fila?.pdf_path) {
    return { ok: false, error: 'El PDF todavía no está generado.' }
  }

  const { data: firmado, error: errorFirma } = await supabase.storage
    .from('presupuestos')
    .createSignedUrl(fila.pdf_path, SEGUNDOS_LINK_PDF)

  if (errorFirma || !firmado?.signedUrl) {
    return { ok: false, error: 'No se pudo generar el link del PDF.' }
  }

  return { ok: true, url: firmado.signedUrl }
}
