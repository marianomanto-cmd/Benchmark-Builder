import type { Metadata } from 'next'
import { TriangleAlert } from 'lucide-react'

import { PantallaAranceles } from '@/components/biblioteca/pantalla-aranceles'
import {
  nombreObraSocial,
  parseVista,
  PARTICULAR,
  type CeldaVigente,
  type ColumnaObraSocial,
  type FilaHistorico,
  type PrestacionGrilla,
} from '@/components/biblioteca/tipos'
import { Banner } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import type { CoberturaTipo } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Aranceles',
}

/**
 * Pantalla 10 — Aranceles.
 *
 * La grilla se arma en el servidor con `aranceles_vigentes`, que ya
 * trae el conteo de usos por vigencia: es lo que decide si una celda
 * lleva el sello de «no editable».
 *
 * El histórico completo es una lectura aparte y bajo demanda (`?vista=`)
 * porque trae todas las vigencias cerradas, que son muchas más que las
 * abiertas y casi nunca se miran.
 */

/** Tope de vigencias del histórico. Arriba de esto se mira por celda. */
const LIMITE_HISTORICO = 300

interface PrestacionBase {
  id: string
  nombre: string
  codigo: string | null
  rubro: string | null
  activa: boolean
}

interface ObraSocialBase {
  id: string
  nombre: string
  plan: string | null
  activa: boolean
}

interface ArancelBase {
  id: string
  prestacion_id: string
  obra_social_id: string | null
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
  vigente_desde: string
  vigente_hasta: string | null
}

export default async function ArancelesPage(props: PageProps<'/biblioteca/aranceles'>) {
  const searchParams = await props.searchParams
  const vista = parseVista(searchParams.vista)

  const supabase = await createClient()

  const [prestacionesRes, obrasRes, vigentesRes, programadosRes] = await Promise.all([
    supabase
      .from('prestaciones')
      .select('id, nombre, codigo, rubro, activa')
      .order('rubro', { ascending: true, nullsFirst: false })
      .order('nombre'),
    supabase.from('obras_sociales').select('id, nombre, plan, activa').order('nombre'),
    supabase
      .from('aranceles_vigentes')
      .select(
        'id, prestacion_id, obra_social_id, monto, cobertura_tipo, cobertura_valor, vigente_desde, usos',
      ),
    // Aumentos ya cargados que todavía no arrancaron. No se cotizan,
    // pero la celda tiene que avisar que existen: si no, alguien que
    // programó el aumento de octubre no lo ve en septiembre y lo carga
    // de nuevo.
    supabase
      .from('aranceles_programados')
      .select('prestacion_id, obra_social_id, monto, vigente_desde')
      .order('vigente_desde'),
  ])

  // `programadosRes` no entra en esta guarda a propósito: si esa lectura
  // falla, la grilla sigue sirviendo con los precios de hoy y sólo se
  // pierde el aviso de los aumentos programados.
  if (prestacionesRes.error || obrasRes.error || vigentesRes.error) {
    return (
      <div className="animate-enter">
        <h1 className="t-h2">Aranceles</h1>
        <Banner
          className="mt-4"
          tono="warm"
          icono={<TriangleAlert className="size-4" />}
          titulo="No se pudieron leer los aranceles"
        >
          Puede ser un problema de conexión con la base. Recargá la pantalla en un momento.
        </Banner>
      </div>
    )
  }

  const prestaciones = (prestacionesRes.data ?? []) as PrestacionBase[]
  const obras = (obrasRes.data ?? []) as ObraSocialBase[]

  // La vista devuelve numeric y bigint: se normalizan a number acá para
  // que el cliente no tenga que desconfiar de cada campo.
  const vigentes: CeldaVigente[] = ((vigentesRes.data ?? []) as (ArancelBase & {
    usos: number | string
  })[]).map((v) => ({
    id: v.id,
    prestacion_id: v.prestacion_id,
    obra_social_id: v.obra_social_id,
    monto: Number(v.monto),
    cobertura_tipo: v.cobertura_tipo,
    cobertura_valor: Number(v.cobertura_valor),
    vigente_desde: v.vigente_desde,
    usos: Number(v.usos ?? 0),
  }))

  // El primero por fecha es el que va a arrancar: si hubiera más de uno
  // programado para la misma celda, el resto llega después.
  const programados = new Map<string, { monto: number; vigente_desde: string }>()
  for (const p of (programadosRes.data ?? []) as {
    prestacion_id: string
    obra_social_id: string | null
    monto: number | string
    vigente_desde: string
  }[]) {
    const clave = `${p.prestacion_id}:${p.obra_social_id ?? ''}`
    if (!programados.has(clave)) {
      programados.set(clave, { monto: Number(p.monto), vigente_desde: p.vigente_desde })
    }
  }

  for (const celda of vigentes) {
    celda.programado =
      programados.get(`${celda.prestacion_id}:${celda.obra_social_id ?? ''}`) ?? null
  }

  const conVigencia = new Set(vigentes.map((v) => v.prestacion_id))
  const osConVigencia = new Set(
    vigentes.map((v) => v.obra_social_id).filter((id): id is string => Boolean(id)),
  )

  // Una prestación inactiva con arancel abierto tiene que verse igual:
  // si no, su vigencia quedaría invisible y nadie podría cerrarla.
  const filasGrilla: PrestacionGrilla[] = prestaciones
    .filter((p) => p.activa || conVigencia.has(p.id))
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
      rubro: p.rubro,
      activa: p.activa,
    }))

  // Particular siempre es la primera columna: es el precio de lista, el
  // que existe aunque el paciente no tenga obra social.
  const columnas: ColumnaObraSocial[] = [
    { id: null, nombre: PARTICULAR, activa: true },
    ...obras
      .filter((o) => o.activa || osConVigencia.has(o.id))
      .map((o) => ({
        id: o.id,
        nombre: nombreObraSocial(o.nombre, o.plan),
        activa: o.activa,
      })),
  ]

  const rubros = Array.from(
    new Set(prestaciones.map((p) => p.rubro).filter((r): r is string => Boolean(r))),
  ).sort((a, b) => a.localeCompare(b, 'es'))

  let historico: FilaHistorico[] | null = null
  let historicoTruncado = false

  if (vista === 'historico') {
    const [arancelesRes, itemsRes] = await Promise.all([
      supabase
        .from('aranceles')
        .select(
          'id, prestacion_id, obra_social_id, monto, cobertura_tipo, cobertura_valor, vigente_desde, vigente_hasta',
        )
        .order('vigente_desde', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(LIMITE_HISTORICO + 1),
      // Una fila por arancel, no una por ítem: PostgREST corta en
      // `max_rows` (1000 por defecto) y, pasado ese punto, traer
      // `presupuesto_items` entero devolvía conteos de más abajo de los
      // reales. De ese conteo depende el sello «no editable», así que
      // mentir hacia abajo dejaría editable una vigencia ya usada.
      supabase.from('aranceles_usos').select('arancel_id, usos'),
    ])

    const crudos = (arancelesRes.data ?? []) as ArancelBase[]
    historicoTruncado = crudos.length > LIMITE_HISTORICO

    const usos = new Map<string, number>()
    for (const fila of (itemsRes.data ?? []) as {
      arancel_id: string
      usos: number | string
    }[]) {
      usos.set(fila.arancel_id, Number(fila.usos ?? 0))
    }

    const nombrePrestacion = new Map(prestaciones.map((p) => [p.id, p] as const))
    const nombreOs = new Map(
      obras.map((o) => [o.id, nombreObraSocial(o.nombre, o.plan)] as const),
    )

    historico = crudos.slice(0, LIMITE_HISTORICO).map((a) => {
      const prestacion = nombrePrestacion.get(a.prestacion_id)
      return {
        id: a.id,
        prestacion_id: a.prestacion_id,
        prestacion: prestacion?.nombre ?? 'Prestación',
        rubro: prestacion?.rubro ?? null,
        obra_social_id: a.obra_social_id,
        obra_social: a.obra_social_id
          ? (nombreOs.get(a.obra_social_id) ?? 'Obra social')
          : PARTICULAR,
        monto: Number(a.monto),
        cobertura_tipo: a.cobertura_tipo,
        cobertura_valor: Number(a.cobertura_valor),
        vigente_desde: a.vigente_desde,
        vigente_hasta: a.vigente_hasta,
        usos: usos.get(a.id) ?? 0,
      }
    })
  }

  return (
    <PantallaAranceles
      vista={vista}
      prestaciones={filasGrilla}
      columnas={columnas}
      vigentes={vigentes}
      rubros={rubros}
      historico={historico}
      historicoTruncado={historicoTruncado}
      limiteHistorico={LIMITE_HISTORICO}
    />
  )
}
