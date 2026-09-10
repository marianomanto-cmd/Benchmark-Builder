import 'server-only'

import type { CoberturaTipo } from '@/lib/calculo'
import type { EstadoPresupuesto } from '@/lib/types'
import type { createClient } from '@/lib/supabase/server'

import { datosConsultorio, type DatosConsultorio } from './consultorio'

/**
 * Lo que el documento necesita saber, y **nada más**.
 *
 * El tipo es angosto a propósito: acá no entran `editado`,
 * `motivo_override`, `cobertura_original_*` ni `nota_interna`. Los
 * overrides de cobertura y las notas son información interna del
 * consultorio; el paciente recibe el precio, no la discusión de cómo
 * se llegó a ese precio. Al no existir el campo en el tipo, ningún
 * cambio futuro del documento los puede filtrar sin querer.
 *
 * Los montos vienen del snapshot de `presupuesto_items`, nunca de un
 * join a `aranceles`: el presupuesto emitido es un documento.
 */

export interface ItemPdf {
  nombre: string
  codigo: string | null
  descripcion: string | null
  detalle: string | null
  monto: number
  coberturaTipo: CoberturaTipo
  coberturaValor: number
  coberturaMonto: number
  aCargo: number
}

export interface CuotaPdf {
  etiqueta: string
  porcentaje: number | null
  monto: number
}

export interface DatosPdf {
  numero: string
  fechaEmision: string
  validoHasta: string
  pacienteNombre: string
  pacienteDni: string | null
  obraSocial: string | null
  nroAfiliado: string | null
  profesionalNombre: string
  profesionalMatricula: string | null
  items: ItemPdf[]
  cuotas: CuotaPdf[]
  subtotal: number
  totalCobertura: number
  totalACargo: number
  observaciones: string | null
  consultorio: DatosConsultorio
}

/**
 * La cabecera: lo que alcanza para decidir si hay que renderizar.
 *
 * Se lee sola, en una consulta, porque el 90 % de las visitas al PDF
 * terminan en el archivo que ya está en Storage. Traer ítems y cuotas
 * para después no usarlos era pedirle dos consultas de más a un celular
 * con señal mala.
 */
export interface CabeceraPdf {
  id: string
  numero: string
  estado: EstadoPresupuesto
  /** Ruta del PDF ya cacheado en Storage, si existe. */
  pdfPath: string | null
}

/** Lo que devuelve la carga completa: cabecera + el documento armado. */
export interface PresupuestoParaPdf extends CabeceraPdf {
  datos: DatosPdf
}

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>

/** PostgREST puede mandar `numeric` como string; el documento no puede. */
function aNumero(valor: unknown): number {
  const n = typeof valor === 'string' ? Number(valor) : (valor as number | null)
  return Number.isFinite(n) ? Math.round(n as number) : 0
}

function aTexto(valor: unknown): string | null {
  const texto = typeof valor === 'string' ? valor.trim() : ''
  return texto ? texto : null
}

const COLUMNAS_PRESUPUESTO = [
  'id',
  'numero',
  'estado',
  'fecha_emision',
  'valido_hasta',
  'paciente_nombre',
  'paciente_dni',
  'paciente_afiliado',
  'obra_social_nombre',
  'profesional_nombre',
  'profesional_matricula',
  'subtotal',
  'total_cobertura',
  'total_a_cargo',
  'observaciones',
  'pdf_path',
].join(', ')

// `editado`, `motivo_override` y `cobertura_original_*` no se piden.
const COLUMNAS_ITEM = [
  'orden',
  'nombre',
  'codigo',
  'descripcion',
  'detalle',
  'monto',
  'cobertura_tipo',
  'cobertura_valor',
  'cobertura_monto',
  'a_cargo',
].join(', ')

const COLUMNAS_CUOTA = ['orden', 'etiqueta', 'porcentaje', 'monto'].join(', ')

/**
 * La fila de `presupuestos`, sin ítems ni cuotas.
 *
 * La RLS ya filtra por sesión: si el usuario no puede verlo, la consulta
 * vuelve vacía y devolvemos `null` (el llamador responde 404, no 403,
 * para no confirmar que el presupuesto existe).
 */
export async function cargarCabeceraPdf(
  supabase: ClienteSupabase,
  id: string,
): Promise<{ cabecera: CabeceraPdf; fila: Record<string, unknown> } | null> {
  const { data, error } = await supabase
    .from('presupuestos')
    .select(COLUMNAS_PRESUPUESTO)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  const fila = data as unknown as Record<string, unknown>

  return {
    fila,
    cabecera: {
      id: String(fila.id),
      numero: String(fila.numero ?? ''),
      estado: (fila.estado as EstadoPresupuesto) ?? 'borrador',
      pdfPath: aTexto(fila.pdf_path),
    },
  }
}

/**
 * Completa el documento con sus ítems y sus condiciones de pago.
 *
 * Se llama **sólo cuando hay que renderizar**: las dos consultas van en
 * paralelo porque no dependen entre sí.
 */
export async function cargarDocumentoPdf(
  supabase: ClienteSupabase,
  fila: Record<string, unknown>,
): Promise<DatosPdf> {
  const id = String(fila.id)

  const [resItems, resCuotas] = await Promise.all([
    supabase
      .from('presupuesto_items')
      .select(COLUMNAS_ITEM)
      .eq('presupuesto_id', id)
      .order('orden', { ascending: true }),
    supabase
      .from('presupuesto_cuotas')
      .select(COLUMNAS_CUOTA)
      .eq('presupuesto_id', id)
      .order('orden', { ascending: true }),
  ])

  /*
   * Acá NO se puede seguir de largo con `?? []`.
   *
   * Los totales vienen de la cabecera, que ya llegó. Si la lectura de
   * los ítems falla —timeout de la sentencia, 500 de PostgREST, pool
   * agotado, un corte en cualquiera de los viajes paralelos— y se la
   * trata como «este presupuesto no tiene prestaciones», el documento
   * sale con la tabla PRESTACIONES vacía y «A CARGO DEL PACIENTE
   * $ 260.400» abajo. Un presupuesto que cobra sin decir por qué es
   * justo lo que la regla del snapshot existe para impedir, y encima
   * ese PDF se sube al bucket y queda cacheado COMO el documento: la
   * próxima visita ni siquiera vuelve a intentar.
   *
   * Un error acá termina en 502 y el consultorio ve que algo falló, que
   * es lo único honesto que se puede mostrar.
   */
  if (resItems.error) {
    throw new Error(`No se pudieron leer las prestaciones: ${resItems.error.message}`)
  }
  if (resCuotas.error) {
    throw new Error(`No se pudieron leer las condiciones de pago: ${resCuotas.error.message}`)
  }

  const filasItems = (resItems.data ?? []) as unknown as Record<string, unknown>[]
  const filasCuotas = (resCuotas.data ?? []) as unknown as Record<string, unknown>[]

  // Cero ítems en un documento emitido es un estado imposible: la RPC
  // exige al menos una prestación y `guard_item_emitido` no deja
  // sacarlas después. Si igual llega vacío, algo se rompió y no hay PDF
  // que valga la pena imprimir.
  if (filasItems.length === 0 && fila.estado !== 'borrador') {
    throw new Error(`El presupuesto ${String(fila.numero ?? id)} volvió sin prestaciones`)
  }

  return {
    numero: String(fila.numero ?? ''),
    fechaEmision: String(fila.fecha_emision ?? ''),
    validoHasta: String(fila.valido_hasta ?? ''),
    pacienteNombre: String(fila.paciente_nombre ?? ''),
    pacienteDni: aTexto(fila.paciente_dni),
    // Sin obra social el paciente es particular; el documento lo dice
    // con todas las letras en vez de dejar el campo vacío.
    obraSocial: aTexto(fila.obra_social_nombre),
    nroAfiliado: aTexto(fila.paciente_afiliado),
    profesionalNombre: String(fila.profesional_nombre ?? ''),
    profesionalMatricula: aTexto(fila.profesional_matricula),
    items: filasItems.map((item) => ({
      nombre: String(item.nombre ?? ''),
      codigo: aTexto(item.codigo),
      descripcion: aTexto(item.descripcion),
      detalle: aTexto(item.detalle),
      monto: aNumero(item.monto),
      coberturaTipo: (item.cobertura_tipo as CoberturaTipo) ?? 'ninguna',
      coberturaValor: aNumero(item.cobertura_valor),
      coberturaMonto: aNumero(item.cobertura_monto),
      aCargo: aNumero(item.a_cargo),
    })),
    cuotas: filasCuotas.map((cuota) => ({
      etiqueta: String(cuota.etiqueta ?? ''),
      porcentaje:
        cuota.porcentaje === null || cuota.porcentaje === undefined
          ? null
          : Number(cuota.porcentaje),
      monto: aNumero(cuota.monto),
    })),
    subtotal: aNumero(fila.subtotal),
    totalCobertura: aNumero(fila.total_cobertura),
    totalACargo: aNumero(fila.total_a_cargo),
    observaciones: aTexto(fila.observaciones),
    consultorio: datosConsultorio(),
  }
}

/** Presupuesto + ítems + cuotas, para cuando hay que renderizar sí o sí. */
export async function cargarDatosPdf(
  supabase: ClienteSupabase,
  id: string,
): Promise<PresupuestoParaPdf | null> {
  const encabezado = await cargarCabeceraPdf(supabase, id)
  if (!encabezado) return null

  return {
    ...encabezado.cabecera,
    datos: await cargarDocumentoPdf(supabase, encabezado.fila),
  }
}
