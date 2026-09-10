'use client'

import { History, SearchX } from 'lucide-react'
import * as React from 'react'

import {
  Button,
  Card,
  EmptyState,
  MicroBadge,
  Monto,
  Tabla,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/components/ui'
import { fechaCorta, isoDate, normalizar, numero } from '@/lib/formato'
import { useAtajos } from '@/lib/hooks/use-atajos'

import { CampoBusqueda } from './campo-busqueda'
import { estadoVigencia, etiquetaCobertura, type FilaHistorico } from './tipos'

const ID_BUSQUEDA = 'busqueda-historico'

/**
 * Vista «Histórico completo»: todas las vigencias, abiertas y cerradas,
 * de la más nueva a la más vieja.
 *
 * Es la prueba de que nada se pisó. Una grilla no puede mostrar esto
 * —cada celda tendría varios valores—, así que el histórico es una
 * lista cronológica y no una segunda grilla.
 */
export function HistoricoAranceles({
  filas,
  truncado,
  limite,
  busquedaInicial,
}: {
  filas: FilaHistorico[]
  truncado: boolean
  limite: number
  /** Lo que se venía buscando en la grilla: cruza de vista con uno. */
  busquedaInicial?: string
}) {
  const [busqueda, setBusqueda] = React.useState(busquedaInicial ?? '')

  useAtajos({
    '/': () => {
      const campo = document.getElementById(ID_BUSQUEDA)
      if (campo instanceof HTMLInputElement) {
        campo.focus()
        campo.select()
      }
    },
  })

  const visibles = React.useMemo(() => {
    const q = normalizar(busqueda)
    if (!q) return filas
    return filas.filter((f) =>
      normalizar(`${f.prestacion} ${f.codigo ?? ''} ${f.rubro ?? ''} ${f.obra_social}`).includes(q),
    )
  }, [filas, busqueda])

  if (filas.length === 0) {
    return (
      <EmptyState
        icono={<History className="size-7" aria-hidden />}
        titulo="Todavía no hay vigencias cargadas"
        descripcion="En cuanto cargues el primer arancel, acá va a quedar registrado cada cambio de precio con su rango de fechas."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <CampoBusqueda
        id={ID_BUSQUEDA}
        valor={busqueda}
        onCambiar={setBusqueda}
        placeholder="Buscar prestación, rubro u obra social"
        etiqueta="Buscar en el histórico de vigencias"
        className="sm:max-w-[340px]"
      />

      {visibles.length === 0 ? (
        <EmptyState
          icono={<SearchX className="size-7" aria-hidden />}
          titulo="Ninguna vigencia coincide"
          descripcion={
            // Culpar al truncado cuando no lo hay manda a buscar un
            // problema de paginado que no existe: con 32 vigencias
            // cargadas de un tope de 300, lo que falla es la búsqueda.
            truncado
              ? `Nada en el histórico cargado responde a «${busqueda}». Puede estar más atrás: se muestran las ${numero(limite)} más recientes.`
              : `Ninguna de las ${numero(filas.length)} vigencias del histórico responde a «${busqueda}». Se busca por prestación, código, rubro y obra social.`
          }
          acciones={
            <Button variant="secondary" size="touch" onClick={() => setBusqueda('')}>
              Limpiar la búsqueda
            </Button>
          }
        />
      ) : (
        <ListaHistorico filas={visibles} totales={filas.length} truncado={truncado} limite={limite} />
      )}
    </div>
  )
}

/**
 * Cómo se ve una vigencia según en qué momento está.
 *
 * Antes esto era un `f.vigente_hasta === null ? … : …` repetido cuatro
 * veces —dos en la tabla, dos en las cards— y con la semántica vieja:
 * la abierta se pintaba como la que rige. Ahora hay tres estados y una
 * sola definición.
 */
function EtiquetaVigencia({ fila, hoy }: { fila: FilaHistorico; hoy: string }) {
  const estado = estadoVigencia(fila, hoy)

  if (estado === 'rige') {
    return (
      <span className="flex items-center gap-2">
        <MicroBadge tono="primary">Vigente</MicroBadge>
        <span className="t-helper tabular-nums">
          desde {fechaCorta(fila.vigente_desde)}
          {/*
            Una vigencia que rige hoy Y tiene fecha de cierre es
            justamente la que tiene un aumento programado detrás: decir
            hasta cuándo es la mitad útil del dato.
          */}
          {fila.vigente_hasta !== null && ` · hasta ${fechaCorta(fila.vigente_hasta)}`}
        </span>
      </span>
    )
  }

  if (estado === 'programada') {
    return (
      <span className="flex items-center gap-2">
        <MicroBadge tono="warm">Programada</MicroBadge>
        <span className="t-helper tabular-nums">
          desde {fechaCorta(fila.vigente_desde)}
        </span>
      </span>
    )
  }

  return (
    <span className="t-helper tabular-nums">
      {fechaCorta(fila.vigente_desde)} → {fechaCorta(fila.vigente_hasta)}
    </span>
  )
}

function ListaHistorico({
  filas,
  totales,
  truncado,
  limite,
}: {
  filas: FilaHistorico[]
  totales: number
  truncado: boolean
  limite: number
}) {
  // Una sola lectura del día para toda la lista: si se calculara por
  // fila, una vigencia que arranca mañana podría caer de un lado en la
  // tabla y del otro en las cards al cruzar la medianoche.
  const hoy = isoDate()

  return (
    <div className="flex flex-col gap-3">
      <p className="t-label" aria-live="polite">
        {numero(filas.length)} {filas.length === 1 ? 'vigencia' : 'vigencias'}
        {filas.length !== totales && ` de ${numero(totales)}`}
        {truncado && ` · se cargaron las últimas ${numero(limite)}`}
      </p>

      {truncado && (
        <p className="t-helper">
          Se muestran las {numero(limite)} más recientes. Para ver el historial completo de una
          combinación, abrila desde la grilla de vigentes.
        </p>
      )}

      {/*
        El estado se decide con la fecha de hoy, no con `vigente_hasta
        === null`: la vigencia abierta puede ser un aumento programado
        que todavía no cotiza nadie. Ver `estadoVigencia`.
      */}
      <div className="hidden overflow-hidden rounded-card border border-hairline bg-card shadow-rest md:block">
        <Tabla>
          <Thead>
            <tr>
              <Th className="pl-5">Prestación</Th>
              <Th>Obra social</Th>
              <Th numerico>Monto</Th>
              <Th>Cobertura</Th>
              <Th>Vigencia</Th>
              <Th numerico className="pr-5">
                Usos
              </Th>
            </tr>
          </Thead>

          <Tbody>
            {filas.map((f) => (
              <Tr key={f.id}>
                <Td className="pl-5">
                  <span className="font-medium text-ink">{f.prestacion}</span>
                  {f.rubro && <span className="block t-helper">{f.rubro}</span>}
                </Td>
                <Td>{f.obra_social}</Td>
                <Td numerico>
                  <Monto
                    valor={f.monto}
                    jerarquia={estadoVigencia(f, hoy) === 'rige' ? 'fuerte' : 'apagado'}
                  />
                </Td>
                <Td>{etiquetaCobertura(f.cobertura_tipo, Number(f.cobertura_valor))}</Td>
                <Td>
                  <EtiquetaVigencia fila={f} hoy={hoy} />
                </Td>
                <Td numerico className="pr-5">
                  {numero(f.usos)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {filas.map((f) => (
          <li key={f.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-[15px] font-medium text-ink">{f.prestacion}</p>
                  <p className="t-helper">{f.obra_social}</p>
                </div>
                <Monto
                  valor={f.monto}
                  jerarquia={estadoVigencia(f, hoy) === 'rige' ? 'fuerte' : 'apagado'}
                  className="shrink-0"
                />
              </div>

              <p className="mt-2 t-helper">
                {etiquetaCobertura(f.cobertura_tipo, Number(f.cobertura_valor))} ·{' '}
                {numero(f.usos)} {f.usos === 1 ? 'uso' : 'usos'}
              </p>

              <p className="mt-2 flex items-center gap-2">
                <EtiquetaVigencia fila={f} hoy={hoy} />
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
