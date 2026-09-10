'use client'

/**
 * Paso 2 · Qué.
 *
 * Buscador de prestación + lista de ítems. Al elegir una prestación se
 * autocompletan monto y cobertura desde el arancel vigente para la obra
 * social del paso 1; ese número es una **propuesta**, el documento
 * definitivo lo congela la base al guardar.
 *
 * Si esa obra social no tiene arancel, el flujo no se corta: se ofrece
 * cargarlo ahí mismo o usar el valor particular.
 */

import { CircleAlert, Loader2, Wallet } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Banner, Button, EmptyState, Field, Kbd, Monto } from '@/components/ui'
import { calcularTotales } from '@/lib/calculo'
import { money } from '@/lib/formato'
import type { Arancel, BorradorPresupuesto, ItemBorrador, Prestacion } from '@/lib/types'

import { abrirBuscador } from './atajos'
import { itemComoParticular, itemDesdeArancel } from './borrador'
import { Capa, enfocar } from './capa'
import { buscarAranceles } from './consultas'
import { FormArancel } from './form-arancel'
import { FormPrestacion } from './form-prestacion'
import { ListaItems } from './items'
import { PickerPrestacion } from './pickers'

const ID_BUSCADOR = 'w2-prestacion'

/** Deja el buscador de prestaciones listo para tipear. Lo usa el atajo `/`. */
export function enfocarBuscadorPrestacion(): void {
  abrirBuscador(ID_BUSCADOR)
}

/** Prestación elegida que quedó esperando una decisión de arancel. */
interface Pendiente {
  prestacion: Prestacion
  particular: Arancel | null
}

type CapaAbierta =
  | { tipo: 'prestacion'; texto: string }
  | { tipo: 'arancel'; prestacion: Prestacion; particular: Arancel | null }
  | null

export function PasoQue({
  borrador,
  setItems,
  esDesktop,
}: {
  borrador: BorradorPresupuesto
  setItems: (fn: (items: ItemBorrador[]) => ItemBorrador[]) => void
  esDesktop: boolean
}) {
  const [capa, setCapa] = React.useState<CapaAbierta>(null)
  const [pendiente, setPendiente] = React.useState<Pendiente | null>(null)
  const [buscando, setBuscando] = React.useState(false)
  /** Nombre del último ítem agregado: confirma sin robar el foco. */
  const [ultimo, setUltimo] = React.useState<string | null>(null)

  const nombreObraSocial = borrador.obra_social_nombre ?? 'Particular'
  const totales = calcularTotales(borrador.items)

  /**
   * Ids ya cargados, memoizados.
   *
   * Sin esto la lista se rearmaba en cada tecla de cualquier campo del
   * paso —incluido el detalle de cada ítem—, y con la biblioteca entera
   * adentro eso se siente al escribir.
   */
  const yaCargadas = React.useMemo(
    () =>
      borrador.items
        .map((i) => i.prestacion_id)
        .filter((id): id is string => id !== null),
    [borrador.items],
  )

  /**
   * Un plan de tratamiento son cinco o seis prestaciones seguidas.
   *
   * Después de agregar una, el buscador vuelve a quedar abierto y con
   * el cursor adentro: se sigue tipeando la próxima sin tocar el mouse
   * ni apretar una tecla de más. En mobile no se reabre —abriría el
   * teclado virtual encima de la lista recién cargada— y alcanza con
   * que el foco vuelva al campo.
   */
  function agregar(item: ItemBorrador, seguirCargando = true) {
    setItems((items) => [...items, item])
    setPendiente(null)
    setUltimo(item.nombre)
    if (seguirCargando && esDesktop) abrirBuscador(ID_BUSCADOR)
    else enfocar(ID_BUSCADOR)
  }

  /**
   * Quitar con vuelta atrás.
   *
   * Una fila del paso 2 no es sólo un renglón: puede llevar el detalle
   * de la pieza, un monto editado a mano y el motivo del override. Con
   * el botón de quitar al lado del de editar y un dedo en el celular,
   * un toque de más costaba volver a cargar todo eso de memoria.
   */
  function quitar(key: string) {
    const posicion = borrador.items.findIndex((i) => i.key === key)
    const quitado = borrador.items[posicion]
    setItems((items) => items.filter((i) => i.key !== key))
    if (!quitado) return

    toast(`${quitado.nombre} ya no está en el presupuesto`, {
      action: {
        label: 'Deshacer',
        onClick: () =>
          setItems((items) => {
            // Idempotente: dos toques en "Deshacer" no lo duplican.
            if (items.some((i) => i.key === quitado.key)) return items
            // Vuelve a su lugar, no al final: el orden del presupuesto
            // es el orden del tratamiento.
            const copia = [...items]
            copia.splice(Math.min(posicion, copia.length), 0, quitado)
            return copia
          }),
      },
    })
  }

  async function elegirPrestacion(prestacion: Prestacion) {
    setPendiente(null)
    setBuscando(true)
    try {
      const { deObraSocial, particular } = await buscarAranceles(
        prestacion.id,
        borrador.obra_social_id,
      )
      if (deObraSocial) {
        agregar(itemDesdeArancel(prestacion, deObraSocial))
        return
      }
      // Sin arancel para esta obra social: el paso no avanza solo, se
      // le ofrecen las dos salidas al usuario.
      setPendiente({ prestacion, particular })
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No se pudo leer el arancel. Probá de nuevo.',
      )
    } finally {
      setBuscando(false)
    }
  }

  return (
    <>
      <Capa abierta={capa?.tipo === 'prestacion'}>
        <FormPrestacion
          textoInicial={capa?.tipo === 'prestacion' ? capa.texto : ''}
          obraSocialId={borrador.obra_social_id}
          obraSocialNombre={nombreObraSocial}
          onCancelar={() => setCapa(null)}
          onListo={(prestacion, arancel) => {
            setCapa(null)
            // Recién creada: primero se mira cómo quedó, no se sigue
            // buscando a ciegas.
            agregar(itemDesdeArancel(prestacion, arancel), false)
          }}
        />
      </Capa>

      <Capa abierta={capa?.tipo === 'arancel'}>
        {capa?.tipo === 'arancel' && (
          <FormArancel
            prestacion={capa.prestacion}
            obraSocialId={borrador.obra_social_id}
            obraSocialNombre={nombreObraSocial}
            inicial={
              capa.particular
                ? {
                    // El valor particular arranca como referencia: casi
                    // siempre el de la obra social se escribe mirándolo.
                    monto: Math.round(Number(capa.particular.monto)),
                    cobertura_tipo: 'porcentaje',
                    cobertura_valor: 0,
                  }
                : undefined
            }
            onCancelar={() => setCapa(null)}
            onListo={(arancel) => {
              const prestacion = capa.prestacion
              setCapa(null)
              agregar(itemDesdeArancel(prestacion, arancel), false)
            }}
          />
        )}
      </Capa>

      <div className="flex flex-col gap-5">
        <Field
          label="Agregar prestación"
          htmlFor={ID_BUSCADOR}
          helper={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Se autocompleta con el arancel vigente para {nombreObraSocial}. Elegí una y el
                buscador queda listo para la próxima.
              </span>
              <span className="hidden items-center gap-1 md:inline-flex">
                <Kbd>/</Kbd> para volver acá
              </span>
            </span>
          }
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <PickerPrestacion
                id={ID_BUSCADOR}
                onChange={(p) => void elegirPrestacion(p)}
                onCrear={(texto) => setCapa({ tipo: 'prestacion', texto })}
                yaCargadas={yaCargadas}
                disabled={buscando}
              />
            </div>
            {buscando && <Loader2 className="size-4 animate-spin text-faint" aria-hidden />}
          </div>
        </Field>

        {/* En pantalla la confirmación es la fila nueva y el total que
            cambia. Con lector de pantalla eso no se ve, y como el foco
            se queda en el buscador tampoco se oye: de ahí este aviso. */}
        <p role="status" aria-live="polite" className="sr-only">
          {ultimo ? `${ultimo} agregada. ${borrador.items.length} en el presupuesto.` : ''}
        </p>

        {pendiente && (
          <Banner
            tono="warm"
            icono={<CircleAlert className="size-5" />}
            titulo={`${pendiente.prestacion.nombre} no tiene arancel para ${nombreObraSocial}`}
            acciones={
              <>
                <Button
                  variant="primary"
                  size="touch"
                  className="md:h-[34px]"
                  onClick={() =>
                    setCapa({
                      tipo: 'arancel',
                      prestacion: pendiente.prestacion,
                      particular: pendiente.particular,
                    })
                  }
                >
                  Cargar arancel ahora
                </Button>
                {pendiente.particular && (
                  <Button
                    variant="secondary"
                    size="touch"
                    className="md:h-[34px]"
                    onClick={() => {
                      const particular = pendiente.particular
                      if (!particular) return
                      agregar(itemComoParticular(pendiente.prestacion, particular))
                      toast.success('Se cargó con el valor particular, sin cobertura')
                    }}
                  >
                    Usar valor particular
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="touch"
                  className="md:h-[34px]"
                  onClick={() => setPendiente(null)}
                >
                  Cancelar
                </Button>
              </>
            }
          >
            {pendiente.particular ? (
              <>
                El valor particular vigente es{' '}
                <strong className="font-semibold">
                  {money(Number(pendiente.particular.monto))}
                </strong>
                . Podés cargar el arancel de {nombreObraSocial} —queda vigente para todos los
                presupuestos— o usar el particular sólo para éste.
              </>
            ) : (
              <>
                Tampoco hay un valor particular cargado, así que hay que darle un precio antes de
                poder presupuestarla.
              </>
            )}
          </Banner>
        )}

        {borrador.items.length === 0 ? (
          <EmptyState
            icono={<Wallet className="size-8" strokeWidth={1.5} />}
            titulo="Todavía no hay prestaciones"
            descripcion="Buscá la primera arriba. El monto y la cobertura se completan solos con el arancel vigente."
          />
        ) : (
          <ListaItems
            items={borrador.items}
            esDesktop={esDesktop}
            onCambiar={(key, nuevo) =>
              setItems((items) => items.map((i) => (i.key === key ? nuevo : i)))
            }
            onQuitar={quitar}
          />
        )}

        {borrador.items.length > 0 && (
          <div
            className={[
              'sticky bottom-0 z-10 -mx-5 border-t border-hairline bg-card/95 px-5 pb-1 pt-3',
              'backdrop-blur-sm md:-mx-6 md:px-6',
            ].join(' ')}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex gap-6">
                <div>
                  <p className="t-label">Subtotal</p>
                  <Monto valor={totales.subtotal} />
                </div>
                <div>
                  <p className="t-label">Cubre la obra social</p>
                  <Monto valor={totales.cobertura} />
                </div>
              </div>

              <div className="text-right">
                <p className="t-label">A cargo del paciente</p>
                <Monto valor={totales.aCargo} jerarquia="hero" />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
