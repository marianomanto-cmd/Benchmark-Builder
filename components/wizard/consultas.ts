'use client'

/**
 * Lecturas y altas del wizard contra Supabase desde el navegador.
 *
 * Todo pasa por el cliente de browser con la sesión del usuario: la RLS
 * es la que autoriza, no el código. Las altas de entidades sueltas
 * (paciente, obra social, profesional, prestación) son inserts porque
 * no tienen lógica de dominio; el arancel, en cambio, va por la RPC
 * `nueva_vigencia` porque cerrar la vigencia anterior y abrir la nueva
 * tiene que ser atómico.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import { isoDate } from '@/lib/formato'
import type {
  Arancel,
  CoberturaTipo,
  ObraSocial,
  Paciente,
  Prestacion,
  Profesional,
} from '@/lib/types'

/**
 * Un solo cliente para todo el wizard: `createClient()` levanta un
 * cliente nuevo en cada llamada y no queremos uno por combobox.
 */
let clienteMemo: ReturnType<typeof createClient> | null = null
function db() {
  if (!clienteMemo) clienteMemo = createClient()
  return clienteMemo
}

/** El consultorio maneja cientos, no millones: se traen todos y se filtra en el combobox. */
const TOPE = 1000

export const CLAVES = {
  pacientes: ['wizard', 'pacientes'] as const,
  profesionales: ['wizard', 'profesionales'] as const,
  obrasSociales: ['wizard', 'obras-sociales'] as const,
  prestaciones: ['wizard', 'prestaciones'] as const,
  profesionalPropio: ['wizard', 'profesional-propio'] as const,
}

/* ═══════════════════════════════════════════════════════════
   Lecturas
   ═══════════════════════════════════════════════════════════ */

export function usePacientes() {
  return useQuery({
    queryKey: CLAVES.pacientes,
    queryFn: async (): Promise<Paciente[]> => {
      const { data, error } = await db()
        .from('pacientes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(TOPE)
      if (error) throw new Error(error.message)
      return (data ?? []) as Paciente[]
    },
  })
}

export function useProfesionales() {
  return useQuery({
    queryKey: CLAVES.profesionales,
    queryFn: async (): Promise<Profesional[]> => {
      const { data, error } = await db()
        .from('profesionales')
        .select('*')
        .eq('activo', true)
        .order('nombre')
      if (error) throw new Error(error.message)
      return (data ?? []) as Profesional[]
    },
  })
}

export function useObrasSociales() {
  return useQuery({
    queryKey: CLAVES.obrasSociales,
    queryFn: async (): Promise<ObraSocial[]> => {
      const { data, error } = await db()
        .from('obras_sociales')
        .select('*')
        .eq('activa', true)
        .order('nombre')
      if (error) throw new Error(error.message)
      return (data ?? []) as ObraSocial[]
    },
  })
}

export function usePrestaciones() {
  return useQuery({
    queryKey: CLAVES.prestaciones,
    queryFn: async (): Promise<Prestacion[]> => {
      const { data, error } = await db()
        .from('prestaciones')
        .select('*')
        .eq('activa', true)
        .order('nombre')
        .limit(TOPE)
      if (error) throw new Error(error.message)
      return (data ?? []) as Prestacion[]
    },
  })
}

/**
 * La ficha de `profesionales` del usuario logueado. Es el default del
 * paso 1: en el 99 % de los casos el que carga el presupuesto es el que
 * lo firma, y hacerlo elegir su propio nombre todos los días es fricción
 * pura. Queda editable igual.
 */
export function useProfesionalPropio() {
  return useQuery({
    queryKey: CLAVES.profesionalPropio,
    queryFn: async (): Promise<Profesional | null> => {
      const supabase = db()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('profesionales')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data as Profesional | null) ?? null
    },
    staleTime: 5 * 60_000,
  })
}

/* ═══════════════════════════════════════════════════════════
   Consultas puntuales (imperativas)
   ═══════════════════════════════════════════════════════════ */

/**
 * Arancel vigente de una prestación para una obra social.
 * `obraSocialId === null` es el valor particular.
 *
 * Sólo se usa para *proponer* monto y cobertura al agregar el ítem. Una
 * vez agregado, el ítem es un snapshot: no se vuelve a consultar.
 */
export async function buscarArancelVigente(
  prestacionId: string,
  obraSocialId: string | null,
): Promise<Arancel | null> {
  // Se resuelve con la RPC `arancel_vigente` y no con un
  // `vigente_hasta is null` acá: si el consultorio dejó programado el
  // aumento del mes que viene, esa fila también tiene `vigente_hasta`
  // en null y se cotizaría un precio que todavía no rige. Además la
  // fecha la pone Postgres, así que no puede quedar desfasada respecto
  // del reloj del navegador.
  const { data, error } = await db().rpc('arancel_vigente', {
    p_prestacion: prestacionId,
    p_obra_social: obraSocialId,
  })

  if (error) throw new Error(error.message)

  const fila = (Array.isArray(data) ? data[0] : data) as Arancel | null
  // La función devuelve una fila vacía cuando no hay vigencia.
  return fila?.id ? fila : null
}

/**
 * Los dos aranceles que necesita el paso 2 al elegir una prestación:
 * el de la obra social del presupuesto y el particular (que se muestra
 * como referencia cuando el primero no existe).
 */
export async function buscarAranceles(
  prestacionId: string,
  obraSocialId: string | null,
): Promise<{ deObraSocial: Arancel | null; particular: Arancel | null }> {
  if (!obraSocialId) {
    const particular = await buscarArancelVigente(prestacionId, null)
    return { deObraSocial: particular, particular }
  }
  const [deObraSocial, particular] = await Promise.all([
    buscarArancelVigente(prestacionId, obraSocialId),
    buscarArancelVigente(prestacionId, null),
  ])
  return { deObraSocial, particular }
}

/** Plantilla de condiciones de pago de una prestación. */
export async function buscarCuotasPlantilla(
  prestacionId: string,
): Promise<{ etiqueta: string; porcentaje: number }[]> {
  const { data, error } = await db()
    .from('prestacion_cuotas')
    .select('etiqueta, porcentaje, orden')
    .eq('prestacion_id', prestacionId)
    .order('orden')
  if (error) throw new Error(error.message)
  return ((data ?? []) as { etiqueta: string; porcentaje: number }[]).map((c) => ({
    etiqueta: c.etiqueta,
    porcentaje: Number(c.porcentaje),
  }))
}

/* ═══════════════════════════════════════════════════════════
   Altas al vuelo
   ═══════════════════════════════════════════════════════════ */

export interface NuevoPaciente {
  nombre: string
  dni: string | null
  telefono: string | null
  tiene_whatsapp: boolean
  email: string | null
  obra_social_id: string | null
  nro_afiliado: string | null
}

export function useCrearPaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (datos: NuevoPaciente): Promise<Paciente> => {
      const { data, error } = await db().from('pacientes').insert(datos).select('*').single()
      if (error) throw new Error(error.message)
      return data as Paciente
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVES.pacientes })
    },
  })
}

export interface NuevoProfesional {
  nombre: string
  matricula: string | null
  especialidad: string | null
}

export function useCrearProfesional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (datos: NuevoProfesional): Promise<Profesional> => {
      const { data, error } = await db()
        .from('profesionales')
        .insert({ ...datos, activo: true })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as Profesional
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVES.profesionales })
    },
  })
}

export interface NuevaObraSocial {
  nombre: string
  plan: string | null
}

export function useCrearObraSocial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (datos: NuevaObraSocial): Promise<ObraSocial> => {
      const { data, error } = await db()
        .from('obras_sociales')
        .insert({ ...datos, activa: true })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as ObraSocial
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVES.obrasSociales })
    },
  })
}

export interface NuevaPrestacion {
  nombre: string
  codigo: string | null
  rubro: string | null
  descripcion: string | null
  vigencia_dias: number
}

export function useCrearPrestacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (datos: NuevaPrestacion): Promise<Prestacion> => {
      const { data, error } = await db()
        .from('prestaciones')
        .insert({ ...datos, activa: true })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as Prestacion
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVES.prestaciones })
    },
  })
}

export interface NuevaVigencia {
  prestacion_id: string
  /** null = valor particular. */
  obra_social_id: string | null
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
  /** Por defecto hoy. */
  desde?: string
}

/**
 * Alta de arancel por RPC: cierra la vigencia abierta e inserta la
 * nueva en una transacción. `aranceles` es append-only, nunca un UPDATE
 * de monto.
 */
export function useCrearArancel() {
  return useMutation({
    mutationFn: async (datos: NuevaVigencia): Promise<Arancel> => {
      const desde = datos.desde ?? isoDate()
      const { data: id, error } = await db().rpc('nueva_vigencia', {
        p_prestacion: datos.prestacion_id,
        p_obra_social: datos.obra_social_id,
        p_monto: datos.monto,
        p_cob_tipo: datos.cobertura_tipo,
        p_cob_valor: datos.cobertura_valor,
        p_desde: desde,
      })
      if (error) throw new Error(error.message)

      // La RPC devuelve sólo el id; el resto lo conocemos porque lo
      // acabamos de mandar, así se evita un round-trip para el ítem.
      return {
        id: String(id),
        prestacion_id: datos.prestacion_id,
        obra_social_id: datos.obra_social_id,
        monto: datos.monto,
        cobertura_tipo: datos.cobertura_tipo,
        cobertura_valor: datos.cobertura_valor,
        vigente_desde: desde,
        vigente_hasta: null,
        created_at: new Date().toISOString(),
        created_by: null,
      }
    },
  })
}
