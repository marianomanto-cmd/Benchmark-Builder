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
import { palabrasBusqueda } from '@/lib/busqueda'
import type { ObraSocial, Paciente, Prestacion, Profesional } from '@/lib/types'

import {
  TOPE_BUSQUEDA,
  useBuscarPacientes,
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
  /*
   * La búsqueda va contra la BASE, no contra lo que ya se bajó.
   *
   * `usePacientes()` trae las 1.000 fichas más nuevas, que es lo que se
   * ofrece antes de tipear nada. Filtrar sobre esas 1.000 era el bug:
   * con una agenda real de 5.523, el 82 % era invisible para el
   * wizard, y lo único que la pantalla ofrecía a continuación era
   * «Crear paciente». Así se llena una agenda de fichas duplicadas de
   * gente que ya estaba, con el historial partido entre las dos.
   */
  const [texto, setTexto] = React.useState('')
  const { data: recientesRaw = [], isPending } = usePacientes()
  const { data: encontrados = [], isFetching: buscando } = useBuscarPacientes(texto)
  const { data: obras = [] } = useObrasSociales()

  const hayBusqueda = palabrasBusqueda(texto).join('').length >= 2
  const pacientes = hayBusqueda ? encontrados : recientesRaw

  const nombrePorId = React.useMemo(() => {
    const mapa = new Map<string, string>()
    for (const os of obras) mapa.set(os.id, nombreObraSocial(os))
    return mapa
  }, [obras])

  const aOpcion = React.useCallback(
    (p: Paciente): OpcionCombobox => ({
      value: p.id,
      label: p.nombre,
      detalle: [
        p.dni ? `DNI ${p.dni}` : null,
        p.obra_social_id ? nombrePorId.get(p.obra_social_id) : 'Particular',
      ]
        .filter(Boolean)
        .join(' · '),
      busqueda: `${p.dni ?? ''} ${p.telefono ?? ''} ${p.nro_afiliado ?? ''}`,
    }),
    [nombrePorId],
  )

  const opciones = React.useMemo(() => pacientes.map(aOpcion), [pacientes, aOpcion])

  // Los últimos cargados, para cuando todavía no se escribió nada: la
  // consulta viene ordenada por alta descendente.
  const recientes = React.useMemo(
    () => recientesRaw.slice(0, RECIENTES).map(aOpcion),
    [recientesRaw, aOpcion],
  )

  return (
    <Combobox
      id={id}
      value={value}
      opciones={opciones}
      recientes={recientes}
      cargando={isPending || buscando}
      disabled={disabled}
      invalido={invalido}
      placeholder="Buscar por nombre, DNI o teléfono…"
      vacio="Ningún paciente coincide"
      etiquetaCrear="Crear paciente"
      onCrear={onCrear}
      onTextoCambia={setTexto}
      nota={
        hayBusqueda && encontrados.length >= TOPE_BUSQUEDA
          ? `Se muestran los primeros ${TOPE_BUSQUEDA}. Escribí también el nombre para achicar la lista.`
          : undefined
      }
      // Con búsqueda, `opciones` ya viene filtrada por la base: volver a
      // pasarle el filtro local le sacaría filas que sí coinciden.
      filtrarEnMemoria={!hayBusqueda}
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
  elegidaFueraDeLista,
}: PropsBase & {
  /** `null` = particular. */
  value: string | null
  onChange: (obraSocial: ObraSocial | null) => void
  /**
   * La obra social elegida, cuando no está en el listado de activas.
   *
   * `useObrasSociales()` filtra `activa = true`, así que la obra social
   * de un paciente cuya cobertura se dio de baja NO estaba entre las
   * opciones y el campo se veía VACÍO —con el placeholder en gris—
   * mientras el presupuesto se cotizaba y se emitía con ella igual. Lo
   * que la pantalla decía y lo que el documento guardaba eran dos cosas
   * distintas.
   */
  elegidaFueraDeLista?: ObraSocial | null
}) {
  const { data: obras = [], isPending } = useObrasSociales()

  const opciones = React.useMemo<OpcionCombobox[]>(() => {
    const activas = obras.map((os) => ({
      value: os.id,
      label: nombreObraSocial(os),
      detalle: os.plan ? `Plan ${os.plan}` : undefined,
    }))

    // La dada de baja se agrega SÓLO si es la elegida, y dice que lo
    // está: se puede seguir con ella —el paciente la tiene— pero nadie
    // la elige por error desde el listado.
    const deBaja =
      elegidaFueraDeLista && !obras.some((o) => o.id === elegidaFueraDeLista.id)
        ? [
            {
              value: elegidaFueraDeLista.id,
              label: nombreObraSocial(elegidaFueraDeLista),
              detalle: 'Dada de baja en la biblioteca',
            },
          ]
        : []

    return [
      // "Particular" es una opción de primera, no la ausencia de una:
      // buena parte de los presupuestos del consultorio no tienen obra social.
      {
        value: PARTICULAR,
        label: 'Particular',
        detalle: 'Sin obra social',
        busqueda: 'sin obra social ninguna particular',
      },
      ...deBaja,
      ...activas,
    ]
  }, [obras, elegidaFueraDeLista])

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
