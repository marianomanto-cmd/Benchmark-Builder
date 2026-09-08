import 'server-only'

import type { CoberturaTipo } from '@/lib/calculo'
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

/** Lo que devuelve la carga: el documento + lo que decide el cacheo. */
export interface PresupuestoParaPdf {
  id: string
  numero: string
  /** Última modificación del presupuesto. Contra esto se mide el caché. */
  actualizadoEn: string
  /** Ruta del PDF ya cacheado en Storage, si existe. */
  pdfPath: string | null
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
  'updated_at',
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
 * Trae presupuesto + ítems + cuotas. La RLS ya filtra por sesión: si
 * el usuario no puede verlo, la consulta vuelve vacía y devolvemos
 * `null` (el llamador responde 404, no 403, para no confirmar que el
 * presupuesto existe).
 */
export async function cargarDatosPdf(
  supabase: ClienteSupabase,
  id: string,
): Promise<PresupuestoParaPdf | null> {
  const { data: presupuesto, error } = await supabase
    .from('presupuestos')
    .select(COLUMNAS_PRESUPUESTO)
    .eq('id', id)
    .maybeSingle()

  if (error || !presupuesto) return null

  const fila = presupuesto as unknown as Record<string, unknown>

  const [{ data: items }, { data: cuotas }] = await Promise.all([
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

  const filasItems = (items ?? []) as unknown as Record<string, unknown>[]
  const filasCuotas = (cuotas ?? []) as unknown as Record<string, unknown>[]

  const datos: DatosPdf = {
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

  return {
    id: String(fila.id),
    numero: datos.numero,
    actualizadoEn: String(fila.updated_at ?? ''),
    pdfPath: aTexto(fila.pdf_path),
    datos,
  }
}
