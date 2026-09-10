import type { Metadata } from 'next'
import { TriangleAlert } from 'lucide-react'

import { PanelObrasSociales } from '@/components/biblioteca/panel-obras-sociales'
import { PanelPacientes } from '@/components/biblioteca/panel-pacientes'
import { PanelPrestaciones } from '@/components/biblioteca/panel-prestaciones'
import { PanelProfesionales } from '@/components/biblioteca/panel-profesionales'
import { TabsBiblioteca } from '@/components/biblioteca/tabs-biblioteca'
import {
  nombreObraSocial,
  parseTab,
  type CoberturaResumen,
  type FilaObraSocial,
  type FilaPaciente,
  type FilaPrestacion,
  type FilaProfesional,
  type OpcionObraSocial,
} from '@/components/biblioteca/tipos'
import { Banner } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import type { CoberturaTipo } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Biblioteca',
}

/**
 * Pantalla 09 — Biblioteca.
 *
 * Las pestañas son links con `?tab=`: cada una resuelve su consulta en
 * el servidor y no se traen las cinco listas a la vez. Aranceles no es
 * una pestaña, es la pantalla 10 (`/biblioteca/aranceles`), porque la
 * grilla prestación × obra social no entra en un panel.
 */

/** Tope de pacientes por consulta. Arriba de esto se busca por apellido. */
const LIMITE_PACIENTES = 400

export default async function BibliotecaPage(props: PageProps<'/biblioteca'>) {
  const searchParams = await props.searchParams
  const tab = parseTab(searchParams.tab)

  return (
    <div className="animate-enter flex flex-col gap-5">
      <header>
        <h1 className="t-h2">Biblioteca</h1>
        <p className="mt-1 t-helper">
          Lo que el wizard ofrece al armar un presupuesto: prestaciones, precios, obras sociales,
          pacientes y profesionales.
        </p>
      </header>

      <TabsBiblioteca activa={tab} />

      {tab === 'prestaciones' && <TabPrestaciones />}
      {tab === 'obras-sociales' && <TabObrasSociales />}
      {tab === 'pacientes' && <TabPacientes />}
      {tab === 'profesionales' && <TabProfesionales />}
    </div>
  )
}

/** Banner único de falla de lectura: la pantalla no se rompe, se explica. */
function FallaLectura({ que }: { que: string }) {
  return (
    <Banner
      tono="warm"
      icono={<TriangleAlert className="size-4" />}
      titulo={`No se pudieron leer ${que}`}
    >
      Puede ser un problema de conexión con la base. Recargá la pantalla en un momento.
    </Banner>
  )
}

/* ═══════════════════════════════════════════════════════════
   Prestaciones
   ═══════════════════════════════════════════════════════════ */

interface FilaPrestacionBase {
  id: string
  nombre: string
  codigo: string | null
  rubro: string | null
  descripcion: string | null
  vigencia_dias: number
  activa: boolean
}

interface VigenteBase {
  prestacion_id: string
  obra_social_id: string | null
  monto: number
  cobertura_tipo: CoberturaTipo
  cobertura_valor: number
}

async function TabPrestaciones() {
  const supabase = await createClient()

  const [prestacionesRes, obrasRes, vigentesRes] = await Promise.all([
    supabase
      .from('prestaciones')
      .select('id, nombre, codigo, rubro, descripcion, vigencia_dias, activa')
      .order('activa', { ascending: false })
      .order('nombre'),
    supabase.from('obras_sociales').select('id, nombre, plan, activa').order('nombre'),
    supabase
      .from('aranceles_vigentes')
      .select('prestacion_id, obra_social_id, monto, cobertura_tipo, cobertura_valor'),
  ])

  if (prestacionesRes.error || obrasRes.error || vigentesRes.error) {
    return <FallaLectura que="las prestaciones" />
  }

  const prestaciones = (prestacionesRes.data ?? []) as FilaPrestacionBase[]
  const obras = (obrasRes.data ?? []) as {
    id: string
    nombre: string
    plan: string | null
    activa: boolean
  }[]
  const vigentes = (vigentesRes.data ?? []) as VigenteBase[]

  const obrasActivas = obras.filter((o) => o.activa)
  const nombrePorOs = new Map(
    obras.map((o) => [o.id, nombreObraSocial(o.nombre, o.plan)] as const),
  )
  const idsActivas = new Set(obrasActivas.map((o) => o.id))

  // El conteo de usos sólo se muestra en las inactivas: es la razón por
  // la que no se borran. Se pide con `count` y sólo para ésas — traerse
  // `presupuesto_items` entero para contarlo en memoria se cortaba en el
  // `max_rows` de PostgREST (1000 filas) y devolvía menos usos de los
  // reales, además de mover toda la tabla por la red en cada visita.
  const inactivas = prestaciones.filter((p) => !p.activa)
  const usosPorPrestacion = new Map<string, number>()

  if (inactivas.length > 0) {
    const conteos = await Promise.all(
      inactivas.map((p) =>
        supabase
          .from('presupuesto_items')
          .select('id', { count: 'exact', head: true })
          .eq('prestacion_id', p.id),
      ),
    )
    conteos.forEach((res, i) => usosPorPrestacion.set(inactivas[i].id, res.count ?? 0))
  }

  const vigentesPorPrestacion = new Map<string, VigenteBase[]>()
  for (const v of vigentes) {
    const lista = vigentesPorPrestacion.get(v.prestacion_id)
    if (lista) lista.push(v)
    else vigentesPorPrestacion.set(v.prestacion_id, [v])
  }

  const filas: FilaPrestacion[] = prestaciones.map((p) => {
    const propias = vigentesPorPrestacion.get(p.id) ?? []
    const particular = propias.find((v) => v.obra_social_id === null)

    const coberturas: CoberturaResumen[] = propias
      .filter((v) => v.obra_social_id !== null && idsActivas.has(v.obra_social_id))
      .map((v) => ({
        obra_social_id: v.obra_social_id as string,
        obra_social: nombrePorOs.get(v.obra_social_id as string) ?? 'Obra social',
        tipo: v.cobertura_tipo,
        valor: Number(v.cobertura_valor),
        monto: Number(v.monto),
      }))
      .sort((a, b) => a.obra_social.localeCompare(b.obra_social, 'es'))

    return {
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
      rubro: p.rubro,
      descripcion: p.descripcion,
      vigencia_dias: p.vigencia_dias,
      activa: p.activa,
      particular: particular ? Number(particular.monto) : null,
      coberturas,
      // La cuenta que importa: obras sociales activas que todavía no
      // tienen arancel vigente para esta prestación.
      faltan: Math.max(0, obrasActivas.length - coberturas.length),
      usos: usosPorPrestacion.get(p.id) ?? 0,
    }
  })

  const rubros = Array.from(
    new Set(prestaciones.map((p) => p.rubro).filter((r): r is string => Boolean(r))),
  ).sort((a, b) => a.localeCompare(b, 'es'))

  return (
    <PanelPrestaciones
      filas={filas}
      rubros={rubros}
      obrasSocialesActivas={obrasActivas.length}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   Obras sociales
   ═══════════════════════════════════════════════════════════ */

async function TabObrasSociales() {
  const supabase = await createClient()

  const obrasRes = await supabase
    .from('obras_sociales')
    .select('id, nombre, plan, activa, notas')
    .order('activa', { ascending: false })
    .order('nombre')

  if (obrasRes.error) return <FallaLectura que="las obras sociales" />

  const obras = (obrasRes.data ?? []) as {
    id: string
    nombre: string
    plan: string | null
    activa: boolean
    notas: string | null
  }[]

  // Dos conteos por obra social, con `count` y sin traer una sola fila.
  // Agrupar en memoria exigía bajarse `pacientes` y `aranceles_vigentes`
  // enteras, que con el consultorio andando pasan el `max_rows` de
  // PostgREST: las dos columnas de contexto empezaban a mentir sin avisar.
  const conteos = await Promise.all(
    obras.map((o) =>
      Promise.all([
        supabase
          .from('pacientes')
          .select('id', { count: 'exact', head: true })
          .eq('obra_social_id', o.id),
        supabase
          .from('aranceles_vigentes')
          .select('id', { count: 'exact', head: true })
          .eq('obra_social_id', o.id),
      ]),
    ),
  )

  const filas: FilaObraSocial[] = obras.map((o, i) => ({
    id: o.id,
    nombre: o.nombre,
    plan: o.plan,
    activa: o.activa,
    notas: o.notas,
    pacientes: conteos[i][0].count ?? 0,
    aranceles: conteos[i][1].count ?? 0,
  }))

  return <PanelObrasSociales filas={filas} />
}

/* ═══════════════════════════════════════════════════════════
   Pacientes
   ═══════════════════════════════════════════════════════════ */

async function TabPacientes() {
  const supabase = await createClient()

  const [pacientesRes, obrasRes] = await Promise.all([
    supabase
      .from('pacientes')
      .select(
        'id, nombre, dni, telefono, tiene_whatsapp, email, obra_social_id, nro_afiliado, notas_internas',
        // El total exacto se pide junto con la página: «los primeros 400»
        // no dice nada si no se sabe de cuántos. Con el número, el
        // mostrador entiende por qué tiene que buscar por apellido.
        { count: 'exact' },
      )
      .order('nombre')
      // Se pide uno más que el límite sólo para saber si quedó gente afuera.
      .limit(LIMITE_PACIENTES + 1),
    supabase.from('obras_sociales').select('id, nombre, plan, activa').order('nombre'),
  ])

  if (pacientesRes.error) return <FallaLectura que="los pacientes" />

  const crudos = (pacientesRes.data ?? []) as {
    id: string
    nombre: string
    dni: string | null
    telefono: string | null
    tiene_whatsapp: boolean
    email: string | null
    obra_social_id: string | null
    nro_afiliado: string | null
    notas_internas: string | null
  }[]

  const obras = (obrasRes.data ?? []) as {
    id: string
    nombre: string
    plan: string | null
    activa: boolean
  }[]

  const nombrePorOs = new Map(
    obras.map((o) => [o.id, nombreObraSocial(o.nombre, o.plan)] as const),
  )

  const truncado = crudos.length > LIMITE_PACIENTES
  const total = pacientesRes.count ?? crudos.length
  const filas: FilaPaciente[] = crudos.slice(0, LIMITE_PACIENTES).map((p) => ({
    ...p,
    obra_social: p.obra_social_id ? (nombrePorOs.get(p.obra_social_id) ?? null) : null,
  }))

  const opciones: OpcionObraSocial[] = obras.map((o) => ({
    id: o.id,
    nombre: nombreObraSocial(o.nombre, o.plan),
    activa: o.activa,
  }))

  return (
    <PanelPacientes
      filas={filas}
      obrasSociales={opciones}
      truncado={truncado}
      limite={LIMITE_PACIENTES}
      total={total}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   Profesionales
   ═══════════════════════════════════════════════════════════ */

async function TabProfesionales() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profesionales')
    .select('id, nombre, matricula, especialidad, activo, user_id')
    .order('activo', { ascending: false })
    .order('nombre')

  if (error) return <FallaLectura que="los profesionales" />

  const filas: FilaProfesional[] = ((data ?? []) as {
    id: string
    nombre: string
    matricula: string | null
    especialidad: string | null
    activo: boolean
    user_id: string | null
  }[]).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    matricula: p.matricula,
    especialidad: p.especialidad,
    activo: p.activo,
    con_usuario: Boolean(p.user_id),
  }))

  return <PanelProfesionales filas={filas} />
}
