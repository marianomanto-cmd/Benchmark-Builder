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

import { Banner, Button, EmptyState, Field, Monto } from '@/components/ui'
import { calcularTotales } from '@/lib/calculo'
import { money } from '@/lib/formato'
import type { Arancel, BorradorPresupuesto, ItemBorrador, Prestacion } from '@/lib/types'

import { itemComoParticular, itemDesdeArancel } from './borrador'
import { Capa, enfocar } from './capa'
import { buscarAranceles } from './consultas'
import { FormArancel } from './form-arancel'
import { FormPrestacion } from './form-prestacion'
import { ListaItems } from './items'
import { PickerPrestacion } from './pickers'

const ID_BUSCADOR = 'w2-prestacion'

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

  const nombreObraSocial = borrador.obra_social_nombre ?? 'Particular'
  const totales = calcularTotales(borrador.items)

  function agregar(item: ItemBorrador) {
    setItems((items) => [...items, item])
    setPendiente(null)
    enfocar(ID_BUSCADOR)
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
            agregar(itemDesdeArancel(prestacion, arancel))
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
              agregar(itemDesdeArancel(prestacion, arancel))
            }}
          />
        )}
      </Capa>

      <div className="flex flex-col gap-5">
        <Field
          label="Agregar prestación"
          htmlFor={ID_BUSCADOR}
          helper={`Se autocompleta con el arancel vigente para ${nombreObraSocial}.`}
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <PickerPrestacion
                id={ID_BUSCADOR}
                onChange={(p) => void elegirPrestacion(p)}
                onCrear={(texto) => setCapa({ tipo: 'prestacion', texto })}
                yaCargadas={borrador.items
                  .map((i) => i.prestacion_id)
                  .filter((id): id is string => id !== null)}
                disabled={buscando}
              />
            </div>
            {buscando && <Loader2 className="size-4 animate-spin text-faint" aria-hidden />}
          </div>
        </Field>

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
            onQuitar={(key) => setItems((items) => items.filter((i) => i.key !== key))}
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
