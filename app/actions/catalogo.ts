'use server'

/**
 * Altas y ediciones del catálogo: pacientes, profesionales, obras
 * sociales, prestaciones y aranceles.
 *
 * Dos reglas gobiernan este archivo:
 *
 * 1. Nada del catálogo se borra. Una prestación vieja vive dentro de
 *    presupuestos emitidos: se desactiva, no se elimina. Por eso hay
 *    `toggleActivaPrestacion` y no `borrarPrestacion`.
 * 2. Los aranceles son append-only. Un cambio de precio NO es un update:
 *    es una vigencia nueva que cierra la anterior. Eso tiene que pasar
 *    en una sola transacción, así que va por RPC (`nueva_vigencia` y
 *    `aumento_masivo`), nunca por inserts sueltos desde acá.
 */

import { revalidatePath } from 'next/cache'

import { palabrasBusqueda, patronDeDigitos } from '@/lib/busqueda'
import { paraMostrar } from '@/lib/errores'
import { createClient, getUsuario } from '@/lib/supabase/server'
import type { ObraSocial, Paciente, Prestacion, Profesional } from '@/lib/types'
import { z } from '@/lib/zod'

/* ═══════════════════════════════════════════════════════════
   Resultado
   ═══════════════════════════════════════════════════════════ */

export type Resultado<T = null> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; data?: undefined; error: string }

/* ═══════════════════════════════════════════════════════════
   Piezas de validación compartidas
   ═══════════════════════════════════════════════════════════ */

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Texto libre que puede venir vacío: en la base eso es `null`, no `''`. */
function textoOpcional(max: number) {
  return z
    .string()
    .trim()
    .max(max, `No puede pasar de ${max} caracteres.`)
    .nullable()
    .default(null)
    .transform((v) => (v ? v : null))
}

function textoRequerido(max: number, mensaje: string) {
  return z.string().trim().min(1, mensaje).max(max, `No puede pasar de ${max} caracteres.`)
}

/** Referencia opcional a otra entidad. `''` del formulario entra como null. */
const uuidOpcional = z
  .string()
  .trim()
  .nullable()
  .default(null)
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || RE_UUID.test(v), 'La referencia elegida no es válida.')

const uuidRequerido = z.string().trim().regex(RE_UUID, 'La referencia elegida no es válida.')

const emailOpcional = z
  .string()
  .trim()
  .max(160)
  .nullable()
  .default(null)
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'El mail no parece válido.')

const tipoCobertura = z.enum(['porcentaje', 'monto', 'ninguna'])

const fecha = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.')

/* ═══════════════════════════════════════════════════════════
   Errores de Postgres → castellano accionable
   ═══════════════════════════════════════════════════════════ */

/**
 * Los `raise exception` de las RPC ya vienen redactados para mostrar.
 * Lo que hay que traducir son los nombres de constraint: nadie en el
 * consultorio sabe qué es `obras_sociales_nombre_plan_key`.
 */
function mensajeDeError(crudo: string): string {
  const m = crudo.toLowerCase()

  if (m.includes('obras_sociales_nombre_plan_key')) {
    return 'Ya existe una obra social con ese nombre y ese plan.'
  }
  if (m.includes('prestaciones_codigo_key')) {
    return 'Ya hay otra prestación con ese código.'
  }
  if (m.includes('profesionales_user_id_key')) {
    return 'Ese usuario ya tiene una ficha de profesional.'
  }
  if (m.includes('aranceles_una_vigente')) {
    return 'Esa prestación ya tiene una vigencia abierta para esa obra social. Cargá la nueva con una fecha posterior.'
  }
  if (m.includes('ya usado en presupuestos')) {
    return 'Ese arancel ya se usó en presupuestos emitidos: no se edita, se abre una vigencia nueva.'
  }
  if (m.includes('append-only')) {
    return 'Los aranceles no se borran. Cerrá la vigencia abriendo una nueva.'
  }
  if (m.includes('aranceles_cobertura_valor_check') || m.includes('cobertura_valor >= 0')) {
    return 'La cobertura no puede ser negativa.'
  }
  if (m.includes('cobertura_tipo <> ') || m.includes('cobertura_valor <= 100')) {
    return 'Una cobertura por porcentaje no puede pasar de 100 %.'
  }
  if (m.includes('violates foreign key')) {
    return 'Alguno de los datos elegidos ya no existe. Recargá la pantalla y probá de nuevo.'
  }
  if (m.includes('no autenticado') || m.includes('jwt')) {
    return 'Se cerró la sesión. Volvé a entrar y guardá de nuevo.'
  }
  if (m.includes('violates row-level security') || m.includes('permission denied')) {
    return 'Tu usuario no tiene permiso para esta operación. Avisale al consultorio.'
  }
  // Idem `seguimiento.ts`: el `raise exception` de la RPC se muestra, el
  // «violates check constraint» no.
  return paraMostrar(
    crudo,
    'No se pudo guardar. Refrescá la pantalla y probá de nuevo; si sigue igual, avisale al consultorio.',
  )
}

/** Primer mensaje de zod, que es el que se muestra en el formulario. */
function mensajeDeZod(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Faltan datos para guardar.'
}

const SIN_SESION =
  'Se cerró la sesión. Volvé a entrar: los cambios que estabas cargando no se guardaron.'

/**
 * Una server action es un endpoint POST público: la sesión se verifica
 * acá, no se confía en que el cliente haya llegado por la UI.
 */
async function conSesion() {
  const usuario = await getUsuario()
  if (!usuario) return null
  return createClient()
}

/** Las pantallas que leen catálogo desde el servidor. */
function revalidarCatalogo() {
  revalidatePath('/biblioteca')
  revalidatePath('/biblioteca/aranceles')
}

/* ═══════════════════════════════════════════════════════════
   Pacientes
   ═══════════════════════════════════════════════════════════ */

const pacienteSchema = z.object({
  nombre: textoRequerido(200, 'El paciente necesita un nombre.'),
  dni: textoOpcional(20),
  telefono: textoOpcional(40),
  tiene_whatsapp: z.boolean().default(true),
  email: emailOpcional,
  obra_social_id: uuidOpcional,
  nro_afiliado: textoOpcional(60),
  notas_internas: textoOpcional(2000),
})

export type EntradaPaciente = z.input<typeof pacienteSchema>

export async function crearPaciente(entrada: EntradaPaciente): Promise<Resultado<Paciente>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = pacienteSchema.safeParse(entrada)
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const { data, error } = await supabase
    .from('pacientes')
    .insert(parseado.data)
    .select('*')
    .single()

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidarCatalogo()
  return { ok: true, data: data as Paciente }
}

/** Tope de resultados de una búsqueda: más que esto no se mira, se afina. */
const LIMITE_BUSQUEDA = 60

/**
 * Búsqueda de pacientes contra la base.
 *
 * La biblioteca trae las primeras N fichas por orden alfabético y
 * filtra en el cliente, que es instantáneo mientras se tipea. Pero con
 * la lista recortada ese filtro sólo mira lo que llegó: el paciente
 * número 900 no aparecía nunca, aunque la pantalla invitara a escribir
 * su apellido. Cuando hay más fichas que el tope, la búsqueda pasa por
 * acá.
 *
 * El DNI se busca dígito por dígito para que `30123456` encuentre
 * también `30.123.456`: en el mostrador se carga de las dos maneras.
 */
export async function buscarPacientes(termino: string): Promise<Resultado<Paciente[]>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  /*
   * Contra `busqueda`, que la base mantiene normalizada (nombre, DNI y
   * afiliado, sin acentos y en minúsculas), y palabra por palabra.
   *
   * Es el picker donde más caro sale no encontrar: si «Gomez» no trae a
   * «Gómez, Renata», lo que la pantalla ofrece a continuación es «Crear
   * paciente», y la agenda termina con dos fichas de la misma persona y
   * el historial partido entre las dos.
   */
  const palabras = palabrasBusqueda(termino)
  if (palabras.join('').length < 2) return { ok: true, data: [] }

  let consulta = supabase.from('pacientes').select('*')
  for (const palabra of palabras) {
    const digitos = patronDeDigitos(palabra)
    consulta = digitos
      ? consulta.or(`busqueda.like.%${palabra}%,busqueda.like.${digitos}`)
      : consulta.like('busqueda', `%${palabra}%`)
  }

  const { data, error } = await consulta
    .order('nombre')
    .limit(LIMITE_BUSQUEDA)

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  return { ok: true, data: (data ?? []) as Paciente[] }
}

export async function actualizarPaciente(
  id: string,
  entrada: EntradaPaciente,
): Promise<Resultado<Paciente>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = z
    .object({ id: uuidRequerido, datos: pacienteSchema })
    .safeParse({ id, datos: entrada })
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const { data, error } = await supabase
    .from('pacientes')
    .update(parseado.data.datos)
    .eq('id', parseado.data.id)
    .select('*')
    .single()

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidarCatalogo()
  return { ok: true, data: data as Paciente }
}

/* ═══════════════════════════════════════════════════════════
   Profesionales
   ═══════════════════════════════════════════════════════════ */

/**
 * `activo` NO está acá a propósito.
 *
 * Es la misma columna que `/equipo` usa para el acceso, y ahí la baja
 * hace tres cosas más: exige ser admin, no deja que nadie se dé de baja
 * a sí mismo, no deja al consultorio sin ningún administrador que pueda
 * entrar, y banea al usuario en GoTrue. Desde acá se cambiaba a secas,
 * así que `/equipo` mostraba «De baja» a alguien que seguía entrando
 * con su usuario y viendo todos los montos.
 *
 * Una columna, un significado, un solo camino para cambiarla:
 * `cambiarActivo()` en `app/actions/equipo.ts`.
 */
const profesionalSchema = z.object({
  nombre: textoRequerido(160, 'El profesional necesita un nombre.'),
  matricula: textoOpcional(60),
  especialidad: textoOpcional(120),
})

/** El alta sí nace activa; después la baja se maneja desde Equipo. */
const altaProfesionalSchema = profesionalSchema.extend({
  activo: z.boolean().default(true),
})

export type EntradaProfesional = z.input<typeof profesionalSchema>

export async function crearProfesional(
  entrada: EntradaProfesional,
): Promise<Resultado<Profesional>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = altaProfesionalSchema.safeParse(entrada)
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const { data, error } = await supabase
    .from('profesionales')
    .insert(parseado.data)
    .select('*')
    .single()

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidarCatalogo()
  // La home ofrece filtrar por profesional: si no se revalida, el nuevo
  // no aparece en el filtro hasta la próxima navegación dura.
  revalidatePath('/')
  return { ok: true, data: data as Profesional }
}

export async function actualizarProfesional(
  id: string,
  entrada: EntradaProfesional,
): Promise<Resultado<Profesional>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = z
    .object({ id: uuidRequerido, datos: profesionalSchema })
    .safeParse({ id, datos: entrada })
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const { data, error } = await supabase
    .from('profesionales')
    .update(parseado.data.datos)
    .eq('id', parseado.data.id)
    .select('*')
    .single()

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidarCatalogo()
  revalidatePath('/')
  return { ok: true, data: data as Profesional }
}

/* ═══════════════════════════════════════════════════════════
   Obras sociales
   ═══════════════════════════════════════════════════════════ */

const obraSocialSchema = z.object({
  nombre: textoRequerido(120, 'La obra social necesita un nombre.'),
  plan: textoOpcional(60),
  activa: z.boolean().default(true),
  notas: textoOpcional(2000),
})

export type EntradaObraSocial = z.input<typeof obraSocialSchema>

export async function crearObraSocial(
  entrada: EntradaObraSocial,
): Promise<Resultado<ObraSocial>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = obraSocialSchema.safeParse(entrada)
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const { data, error } = await supabase
    .from('obras_sociales')
    .insert(parseado.data)
    .select('*')
    .single()

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidarCatalogo()
  revalidatePath('/')
  return { ok: true, data: data as ObraSocial }
}

export async function actualizarObraSocial(
  id: string,
  entrada: EntradaObraSocial,
): Promise<Resultado<ObraSocial>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = z
    .object({ id: uuidRequerido, datos: obraSocialSchema })
    .safeParse({ id, datos: entrada })
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const { data, error } = await supabase
    .from('obras_sociales')
    .update(parseado.data.datos)
    .eq('id', parseado.data.id)
    .select('*')
    .single()

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidarCatalogo()
  revalidatePath('/')
  return { ok: true, data: data as ObraSocial }
}

/* ═══════════════════════════════════════════════════════════
   Prestaciones
   ═══════════════════════════════════════════════════════════ */

const prestacionSchema = z.object({
  nombre: textoRequerido(200, 'La prestación necesita un nombre.'),
  codigo: textoOpcional(40),
  rubro: textoOpcional(120),
  descripcion: textoOpcional(2000),
  vigencia_dias: z
    .number()
    .int('Los días de vigencia van en números enteros.')
    .min(1, 'La vigencia tiene que ser de al menos un día.')
    .max(365, 'Más de un año de vigencia no tiene sentido en un presupuesto.')
    .default(30),
  activa: z.boolean().default(true),
})

export type EntradaPrestacion = z.input<typeof prestacionSchema>

export async function crearPrestacion(
  entrada: EntradaPrestacion,
): Promise<Resultado<Prestacion>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = prestacionSchema.safeParse(entrada)
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const { data, error } = await supabase
    .from('prestaciones')
    .insert(parseado.data)
    .select('*')
    .single()

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidarCatalogo()
  return { ok: true, data: data as Prestacion }
}

export async function actualizarPrestacion(
  id: string,
  entrada: EntradaPrestacion,
): Promise<Resultado<Prestacion>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = z
    .object({ id: uuidRequerido, datos: prestacionSchema })
    .safeParse({ id, datos: entrada })
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const { data, error } = await supabase
    .from('prestaciones')
    .update(parseado.data.datos)
    .eq('id', parseado.data.id)
    .select('*')
    .single()

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidarCatalogo()
  return { ok: true, data: data as Prestacion }
}

/**
 * Activa o desactiva una prestación. No existe borrar: la prestación
 * está copiada dentro de presupuestos emitidos y el consultorio tiene
 * que poder defender esos documentos. Desactivada deja de ofrecerse en
 * el wizard, pero el historial sigue entero.
 */
export async function toggleActivaPrestacion(
  id: string,
  activa: boolean,
): Promise<Resultado<Prestacion>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = z
    .object({ id: uuidRequerido, activa: z.boolean() })
    .safeParse({ id, activa })
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const { data, error } = await supabase
    .from('prestaciones')
    .update({ activa: parseado.data.activa })
    .eq('id', parseado.data.id)
    .select('*')
    .single()

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  revalidarCatalogo()
  return { ok: true, data: data as Prestacion }
}

/* ═══════════════════════════════════════════════════════════
   Aranceles — append-only, siempre por RPC
   ═══════════════════════════════════════════════════════════ */

const vigenciaSchema = z
  .object({
    prestacion_id: uuidRequerido,
    /** null = valor particular. */
    obra_social_id: uuidOpcional,
    monto: z
      .number()
      .int('Los montos van en pesos enteros.')
      .min(0, 'Un monto no puede ser negativo.')
      .max(999_999_999),
    cobertura_tipo: tipoCobertura,
    cobertura_valor: z
      .number()
      .min(0, 'La cobertura no puede ser negativa.')
      .max(999_999_999),
    desde: fecha,
  })
  .refine((v) => v.cobertura_tipo !== 'porcentaje' || v.cobertura_valor <= 100, {
    message: 'Una cobertura por porcentaje no puede pasar de 100 %.',
    path: ['cobertura_valor'],
  })

export type EntradaVigencia = z.input<typeof vigenciaSchema>

/**
 * Abre una vigencia nueva y cierra la anterior el día previo.
 *
 * Va por RPC porque las dos cosas tienen que pasar juntas: si se
 * cerrara la vieja y fallara el insert de la nueva, la prestación
 * quedaría sin precio vigente y el wizard no podría cotizarla.
 */
export async function crearVigencia(entrada: EntradaVigencia): Promise<Resultado<string>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = vigenciaSchema.safeParse(entrada)
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const v = parseado.data

  const { data, error } = await supabase.rpc('nueva_vigencia', {
    p_prestacion: v.prestacion_id,
    p_obra_social: v.obra_social_id,
    p_monto: v.monto,
    p_cob_tipo: v.cobertura_tipo,
    p_cob_valor: v.cobertura_valor,
    p_desde: v.desde,
  })

  if (error) return { ok: false, error: mensajeDeError(error.message) }
  if (typeof data !== 'string') {
    return { ok: false, error: 'La vigencia no se pudo abrir. Probá de nuevo en un momento.' }
  }

  revalidarCatalogo()
  return { ok: true, data }
}

const aumentoSchema = z
  .object({
    /** null = todos los rubros. */
    rubro: textoOpcional(120),
    /** null = todas las obras sociales. */
    obra_social_id: uuidOpcional,
    /** Ignora las obras sociales y toca sólo el valor particular. */
    solo_particular: z.boolean().default(false),
    pct: z
      .number()
      .min(-90, 'Una baja de más del 90 % no es un ajuste, es un error de tipeo.')
      .max(300, 'Un aumento de más del 300 % no es un ajuste, es un error de tipeo.')
      .refine((v) => v !== 0, 'Un aumento de 0 % no cambia nada.'),
    desde: fecha,
  })
  .refine((a) => !(a.solo_particular && a.obra_social_id), {
    message: 'O es sólo el valor particular, o es una obra social: no las dos cosas.',
    path: ['obra_social_id'],
  })

export type EntradaAumento = z.input<typeof aumentoSchema>

/**
 * Aumento masivo. La RPC hace una llamada a `nueva_vigencia` por fila
 * dentro de una transacción: o se abren todas las vigencias nuevas o no
 * se abre ninguna. El preview de filas afectadas lo arma el cliente
 * antes de confirmar, con los mismos criterios que el `for` de la RPC.
 *
 * Devuelve cuántas vigencias se abrieron.
 */
export async function aplicarAumentoMasivo(
  entrada: EntradaAumento,
): Promise<Resultado<number>> {
  const supabase = await conSesion()
  if (!supabase) return { ok: false, error: SIN_SESION }

  const parseado = aumentoSchema.safeParse(entrada)
  if (!parseado.success) return { ok: false, error: mensajeDeZod(parseado.error) }

  const a = parseado.data

  const { data, error } = await supabase.rpc('aumento_masivo', {
    p_rubro: a.rubro,
    p_obra_social: a.obra_social_id,
    p_solo_particular: a.solo_particular,
    p_pct: a.pct,
    p_desde: a.desde,
  })

  if (error) return { ok: false, error: mensajeDeError(error.message) }

  const n = typeof data === 'number' ? data : Number(data ?? 0)
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'El aumento no se pudo aplicar. Probá de nuevo en un momento.' }
  }

  revalidarCatalogo()
  return { ok: true, data: n }
}
