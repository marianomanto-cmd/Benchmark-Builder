'use client'

/**
 * Los cuatro comboboxes del wizard.
 *
 * Todos siguen el mismo patrón cmdk que ya implementa `Combobox`:
 * resultados → «Crear «lo tipeado»» siempre visible → recientes. El
 * mini-form no vive acá: el picker sólo avisa "quiero crear esto" con
 * `onCrear(texto)` y la pantalla decide qué formulario abrir en la capa.
 */

import * as React from 'react'

import { Combobox, MicroBadge, type OpcionCombobox } from '@/components/ui'
import type { ObraSocial, Paciente, Prestacion, Profesional } from '@/lib/types'

import {
  useObrasSociales,
  usePacientes,
  usePrestaciones,
  useProfesionales,
} from './consultas'

/** Cuántos recientes se muestran cuando el buscador está vacío. */
const RECIENTES = 5

/** Valor sentinela: presupuesto sin obra social. */
export const PARTICULAR = '__particular__'

interface PropsBase {
  id: string
  onCrear: (texto: string) => void
  invalido?: boolean
  disabled?: boolean
}

/** Nombre completo de la obra social: "OSDE 210". */
export function nombreObraSocial(os: ObraSocial): string {
  return os.plan ? `${os.nombre} ${os.plan}` : os.nombre
}

/* ═══════════════════════════════════════════════════════════
   Paciente
   ═══════════════════════════════════════════════════════════ */

export function PickerPaciente({
  id,
  value,
  onChange,
  onCrear,
  invalido,
  disabled,
}: PropsBase & {
  value: string | null
  onChange: (paciente: Paciente) => void
}) {
  const { data: pacientes = [], isPending } = usePacientes()
  const { data: obras = [] } = useObrasSociales()

  const nombrePorId = React.useMemo(() => {
    const mapa = new Map<string, string>()
    for (const os of obras) mapa.set(os.id, nombreObraSocial(os))
    return mapa
  }, [obras])

  const opciones = React.useMemo<OpcionCombobox[]>(
    () =>
      pacientes.map((p) => ({
        value: p.id,
        label: p.nombre,
        detalle: [
          p.dni ? `DNI ${p.dni}` : null,
          p.obra_social_id ? nombrePorId.get(p.obra_social_id) : 'Particular',
        ]
          .filter(Boolean)
          .join(' · '),
        busqueda: `${p.dni ?? ''} ${p.telefono ?? ''} ${p.nro_afiliado ?? ''}`,
      })),
    [pacientes, nombrePorId],
  )

  // La consulta ya viene ordenada por alta descendente: los primeros
  // son los últimos pacientes cargados.
  const recientes = React.useMemo(() => opciones.slice(0, RECIENTES), [opciones])

  return (
    <Combobox
      id={id}
      value={value}
      opciones={opciones}
      recientes={recientes}
      cargando={isPending}
      disabled={disabled}
      invalido={invalido}
      placeholder="Buscar por nombre, DNI o teléfono…"
      vacio="Ningún paciente coincide"
      etiquetaCrear="Crear paciente"
      onCrear={onCrear}
      onChange={(valor) => {
        const paciente = pacientes.find((p) => p.id === valor)
        if (paciente) onChange(paciente)
      }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   Profesional
   ═══════════════════════════════════════════════════════════ */

export function PickerProfesional({
  id,
  value,
  onChange,
  onCrear,
  invalido,
  disabled,
}: PropsBase & {
  value: string | null
  onChange: (profesional: Profesional) => void
}) {
  const { data: profesionales = [], isPending } = useProfesionales()

  const opciones = React.useMemo<OpcionCombobox[]>(
    () =>
      profesionales.map((p) => ({
        value: p.id,
        label: p.nombre,
        detalle: [p.especialidad, p.matricula ? `Mat. ${p.matricula}` : null]
          .filter(Boolean)
          .join(' · '),
      })),
    [profesionales],
  )

  return (
    <Combobox
      id={id}
      value={value}
      opciones={opciones}
      cargando={isPending}
      disabled={disabled}
      invalido={invalido}
      placeholder="Buscar profesional…"
      vacio="Ningún profesional coincide"
      etiquetaCrear="Crear profesional"
      onCrear={onCrear}
      onChange={(valor) => {
        const profesional = profesionales.find((p) => p.id === valor)
        if (profesional) onChange(profesional)
      }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   Obra social
   ═══════════════════════════════════════════════════════════ */

export function PickerObraSocial({
  id,
  value,
  onChange,
  onCrear,
  invalido,
  disabled,
}: PropsBase & {
  /** `null` = particular. */
  value: string | null
  onChange: (obraSocial: ObraSocial | null) => void
}) {
  const { data: obras = [], isPending } = useObrasSociales()

  const opciones = React.useMemo<OpcionCombobox[]>(
    () => [
      // "Particular" es una opción de primera, no la ausencia de una:
      // buena parte de los presupuestos del consultorio no tienen obra social.
      {
        value: PARTICULAR,
        label: 'Particular',
        detalle: 'Sin obra social',
        busqueda: 'sin obra social ninguna particular',
      },
      ...obras.map((os) => ({
        value: os.id,
        label: nombreObraSocial(os),
        detalle: os.plan ? `Plan ${os.plan}` : undefined,
      })),
    ],
    [obras],
  )

  return (
    <Combobox
      id={id}
      value={value ?? PARTICULAR}
      opciones={opciones}
      cargando={isPending}
      disabled={disabled}
      invalido={invalido}
      placeholder="Buscar obra social…"
      vacio="Ninguna obra social coincide"
      etiquetaCrear="Crear obra social"
      onCrear={onCrear}
      onChange={(valor) => {
        if (valor === PARTICULAR) {
          onChange(null)
          return
        }
        const os = obras.find((o) => o.id === valor)
        if (os) onChange(os)
      }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════
   Prestación
   ═══════════════════════════════════════════════════════════ */

export function PickerPrestacion({
  id,
  onChange,
  onCrear,
  disabled,
  yaCargadas = [],
}: PropsBase & {
  onChange: (prestacion: Prestacion) => void
  /** ids ya agregados al presupuesto: se marcan, pero se pueden repetir. */
  yaCargadas?: string[]
}) {
  const { data: prestaciones = [], isPending } = usePrestaciones()

  const opciones = React.useMemo<OpcionCombobox[]>(
    () =>
      prestaciones.map((p) => ({
        value: p.id,
        label: p.nombre,
        detalle: [p.codigo, p.rubro].filter(Boolean).join(' · '),
        busqueda: p.descripcion ?? '',
        // Una misma prestación puede ir dos veces (dos piezas): no se
        // deshabilita, sólo se avisa que ya está en la lista.
        accesorio: yaCargadas.includes(p.id) ? (
          <MicroBadge tono="primary">en la lista</MicroBadge>
        ) : undefined,
      })),
    [prestaciones, yaCargadas],
  )

  return (
    <Combobox
      id={id}
      // El buscador de prestaciones no retiene selección: elegir una la
      // agrega a la tabla y el campo vuelve a quedar libre para la próxima.
      value={null}
      opciones={opciones}
      cargando={isPending}
      disabled={disabled}
      placeholder="Buscar prestación por nombre, código o rubro…"
      vacio="Ninguna prestación coincide"
      etiquetaCrear="Crear prestación"
      onCrear={onCrear}
      onChange={(valor) => {
        const prestacion = prestaciones.find((p) => p.id === valor)
        if (prestacion) onChange(prestacion)
      }}
    />
  )
}
