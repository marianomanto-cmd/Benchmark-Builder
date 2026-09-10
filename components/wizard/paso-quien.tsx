'use client'

/**
 * Paso 1 · Quién.
 *
 * Paciente, obra social, profesional, fecha y vigencia. La obra social
 * se precarga desde la ficha del paciente y queda editable **sólo para
 * este presupuesto**: el consultorio necesita poder presupuestar por
 * otra cobertura sin ensuciar la ficha, y necesita que quede dicho en
 * pantalla que eso es lo que está pasando.
 */

import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Field, Input, Segmented } from '@/components/ui'
import { fechaLarga } from '@/lib/formato'
import type { BorradorPresupuesto, ObraSocial, Paciente, Profesional } from '@/lib/types'

import { calcularValidoHasta, recotizarItem, VIGENCIAS_RAPIDAS } from './borrador'
import { Capa, enfocar } from './capa'
import {
  buscarAranceles,
  buscarObraSocial,
  useObrasSociales,
  usePacientes,
  useProfesionalPropio,
} from './consultas'
import { FormObraSocial, FormPaciente, FormProfesional } from './form-entidades'
import { nombreObraSocial, PickerObraSocial, PickerPaciente, PickerProfesional } from './pickers'

type ModoVigencia = '30' | '60' | 'otra'

type CapaAbierta =
  | { tipo: 'paciente'; texto: string }
  | { tipo: 'obra-social'; texto: string }
  | { tipo: 'profesional'; texto: string }
  | null

const ID = {
  paciente: 'w1-paciente',
  obraSocial: 'w1-obra-social',
  profesional: 'w1-profesional',
  fecha: 'w1-fecha',
  dias: 'w1-dias',
}

export function PasoQuien({
  borrador,
  parche,
}: {
  borrador: BorradorPresupuesto
  parche: (cambios: Partial<BorradorPresupuesto>) => void
}) {
  const [capa, setCapa] = React.useState<CapaAbierta>(null)
  const [recotizando, setRecotizando] = React.useState(false)

  const { data: pacientes = [] } = usePacientes()
  const { data: obras = [] } = useObrasSociales()
  const { data: profesionalPropio } = useProfesionalPropio()

  /**
   * Sólo la última re-cotización manda.
   *
   * Cambiar de paciente dos veces seguidas (pasa: alguien se equivoca y
   * corrige) dispara dos re-cotizaciones contra obras sociales
   * distintas. Si la primera vuelve última, la cabecera dice una obra
   * social y los ítems quedan cotizados con la otra — un documento
   * mintiendo sobre su propia cobertura, que es justo lo que este
   * producto no puede hacer.
   */
  const turno = React.useRef(0)

  const paciente = React.useMemo(
    () => pacientes.find((p) => p.id === borrador.paciente_id) ?? null,
    [pacientes, borrador.paciente_id],
  )

  // Default del profesional: el usuario logueado. Se aplica una sola
  // vez, y sólo si el campo está vacío, para no pisar una elección hecha.
  React.useEffect(() => {
    if (borrador.profesional_id || !profesionalPropio) return
    parche({
      profesional_id: profesionalPropio.id,
      profesional_nombre: profesionalPropio.nombre,
    })
  }, [borrador.profesional_id, profesionalPropio, parche])

  /**
   * Cambiar la cobertura con ítems ya cargados obliga a re-cotizarlos.
   *
   * Si no, el presupuesto sale con «OSDE 210» en la cabecera y los
   * ítems con la cobertura de la obra social anterior: el documento
   * mentiría sobre su propia cobertura, que es justo lo que este
   * producto no puede hacer.
   */
  async function cambiarCobertura(
    obraSocialId: string | null,
    obraSocialNombre: string | null,
    /** Turno pedido por quien inició la elección. Ver `turno`. */
    mio: number = ++turno.current,
  ) {
    const cambio = { obra_social_id: obraSocialId, obra_social_nombre: obraSocialNombre }
    if (mio !== turno.current) return

    if (borrador.obra_social_id === obraSocialId || borrador.items.length === 0) {
      setRecotizando(false)
      parche(cambio)
      return
    }

    const conPrestacion = borrador.items.filter((i) => i.prestacion_id)
    const overridesPrevios = borrador.items.filter((i) => i.editado).length

    let recotizados = 0
    let sinArancel = 0
    /**
     * Lecturas que NO se pudieron hacer: red caída, Supabase sin
     * responder, sesión vencida.
     *
     * Hay que contarlas aparte de `sinArancel`. «No hay arancel para
     * esta obra social» es una respuesta —el ítem cae a particular o se
     * queda sin cobertura, y eso es correcto—; «no pude preguntar» no lo
     * es. Antes las dos caían en el mismo contador y el ítem se
     * devolvía intacto: el presupuesto quedaba con «OSDE 210» en la
     * cabecera y la cobertura de Swiss Medical en las líneas, y el
     * cartel decía «1 quedó sin arancel para esta obra social», que es
     * una explicación creíble de algo que nunca se comprobó.
     */
    let fallaron = 0

    setRecotizando(true)
    const nuevos = await Promise.all(
      borrador.items.map(async (item) => {
        if (!item.prestacion_id) return item
        try {
          const { deObraSocial, particular } = await buscarAranceles(
            item.prestacion_id,
            obraSocialId,
          )
          const r = recotizarItem(item, deObraSocial, particular)
          if (r.recotizado) recotizados++
          else sinArancel++
          return r.item
        } catch {
          fallaron++
          return item
        }
      }),
    )

    // Llegó tarde: ya hay otra cobertura elegida y otra re-cotización
    // en curso. Escribir esto pisaría la cobertura correcta.
    if (mio !== turno.current) return

    setRecotizando(false)

    // Con una sola lectura fallida no se aplica NADA: se deja la obra
    // social anterior, que es la que sí concuerda con lo cotizado. Un
    // documento a medio recotizar es peor que uno sin cambiar, porque
    // no se nota mirándolo.
    if (fallaron > 0) {
      toast.error(
        `No se pudo recalcular ${fallaron} prestación(es) con la cobertura nueva. ` +
          'Se dejó la obra social anterior para que el presupuesto no quede mezclado: probá de nuevo.',
      )
      return
    }

    parche({ ...cambio, items: nuevos })

    if (conPrestacion.length === 0) return

    const partes = [`Se recalcularon ${recotizados} prestación(es) con la cobertura nueva`]
    if (sinArancel > 0) {
      partes.push(`${sinArancel} quedó sin arancel para esta obra social`)
    }
    if (overridesPrevios > 0) {
      partes.push(`se perdieron ${overridesPrevios} cobertura(s) editada(s) a mano`)
    }
    toast.info(`${partes.join(' · ')}.`)
  }

  /**
   * La obra social del borrador cuando no está entre las activas.
   *
   * Se da de baja una obra social en la biblioteca y los pacientes que
   * la tenían en la ficha la siguen teniendo. El picker sólo lista las
   * activas, así que el campo se veía VACÍO —placeholder gris— mientras
   * el presupuesto se cotizaba y se emitía con ella igual: la pantalla
   * decía una cosa y el documento guardaba otra.
   *
   * Se arma con lo que el borrador ya tiene, sin pedirle nada más a la
   * base: el nombre viene congelado desde que se eligió el paciente.
   */
  const obraSocialDeBaja = React.useMemo(() => {
    const id = borrador.obra_social_id
    if (!id) return null
    if (obras.some((o) => o.id === id)) return null
    return {
      id,
      nombre: borrador.obra_social_nombre ?? 'Obra social dada de baja',
      plan: null,
      activa: false,
    } as ObraSocial
  }, [borrador.obra_social_id, borrador.obra_social_nombre, obras])

  async function elegirPaciente(p: Paciente) {
    // El turno se pide acá y no en `cambiarCobertura`: entre medio hay
    // un `await` para resolver la obra social de la ficha, y sin
    // reservar el lugar antes, dos elecciones seguidas podían terminar
    // aplicándose al revés.
    const mio = ++turno.current
    parche({ paciente_id: p.id, paciente_nombre: p.nombre })

    // La obra social viaja con el paciente: en el 90 % de los casos es
    // la correcta y nadie tiene que volver a elegirla.
    if (!p.obra_social_id) {
      await cambiarCobertura(null, null, mio)
      return
    }

    // Si el listado todavía no resolvió, se pregunta por esta obra
    // social en particular. Caer a Particular porque la consulta no
    // llegó sería emitir un documento con la cobertura equivocada, y
    // sin avisar.
    let osFicha = obras.find((o) => o.id === p.obra_social_id) ?? null
    if (!osFicha) {
      setRecotizando(true)
      try {
        osFicha = await buscarObraSocial(p.obra_social_id)
      } catch {
        osFicha = null
      }
    }

    if (mio !== turno.current) return

    if (!osFicha) {
      toast.error(
        'No se pudo leer la obra social del paciente. Elegila a mano antes de seguir.',
      )
      await cambiarCobertura(null, null, mio)
      return
    }

    await cambiarCobertura(osFicha.id, nombreObraSocial(osFicha), mio)
  }

  function elegirObraSocial(os: ObraSocial | null) {
    void cambiarCobertura(os?.id ?? null, os ? nombreObraSocial(os) : null)
  }

  function elegirProfesional(p: Profesional) {
    parche({ profesional_id: p.id, profesional_nombre: p.nombre })
  }

  function cambiarFecha(fecha: string) {
    parche({
      fecha_emision: fecha,
      valido_hasta: calcularValidoHasta(fecha, borrador.vigencia_dias),
    })
  }

  function cambiarDias(dias: number) {
    parche({
      vigencia_dias: dias,
      valido_hasta: calcularValidoHasta(borrador.fecha_emision, dias),
    })
  }

  const modo: ModoVigencia =
    borrador.vigencia_dias === 30 ? '30' : borrador.vigencia_dias === 60 ? '60' : 'otra'

  // Helper de la obra social: siempre dice de dónde salió el valor.
  const osDeLaFicha = paciente?.obra_social_id ?? null
  const cambiadaAMano = Boolean(paciente) && borrador.obra_social_id !== osDeLaFicha
  const nombreOsFicha = osDeLaFicha
    ? (obras.find((o) => o.id === osDeLaFicha)?.nombre ?? 'la de su ficha')
    : 'Particular'

  const ayudaObraSocial = !paciente ? (
    'Elegí primero el paciente: la obra social se precarga desde su ficha.'
  ) : cambiadaAMano ? (
    <>
      Cambiada sólo para este presupuesto. En la ficha de {paciente.nombre} sigue{' '}
      <strong className="font-semibold text-ink">{nombreOsFicha}</strong>.
    </>
  ) : (
    <>
      Viene de la ficha de <strong className="font-semibold text-ink">{paciente.nombre}</strong>.
      Podés cambiarla sólo para este presupuesto.
    </>
  )

  return (
    <>
      <Capa abierta={capa?.tipo === 'paciente'}>
        <FormPaciente
          textoInicial={capa?.tipo === 'paciente' ? capa.texto : ''}
          onCancelar={() => setCapa(null)}
          onListo={(p) => {
            setCapa(null)
            void elegirPaciente(p)
            enfocar(ID.obraSocial)
          }}
        />
      </Capa>

      <Capa abierta={capa?.tipo === 'obra-social'}>
        <FormObraSocial
          textoInicial={capa?.tipo === 'obra-social' ? capa.texto : ''}
          onCancelar={() => setCapa(null)}
          onListo={(os) => {
            setCapa(null)
            elegirObraSocial(os)
            enfocar(ID.profesional)
          }}
        />
      </Capa>

      <Capa abierta={capa?.tipo === 'profesional'}>
        <FormProfesional
          textoInicial={capa?.tipo === 'profesional' ? capa.texto : ''}
          onCancelar={() => setCapa(null)}
          onListo={(p) => {
            setCapa(null)
            elegirProfesional(p)
            enfocar(ID.fecha)
          }}
        />
      </Capa>

      <div className="flex flex-col gap-5">
        <Field label="Paciente" requerido htmlFor={ID.paciente}>
          <PickerPaciente
            id={ID.paciente}
            value={borrador.paciente_id}
            onChange={elegirPaciente}
            onCrear={(texto) => setCapa({ tipo: 'paciente', texto })}
          />
        </Field>

        <Field
          label="Obra social"
          htmlFor={ID.obraSocial}
          helper={
            recotizando ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Recalculando las prestaciones ya cargadas con esta cobertura…
              </span>
            ) : (
              ayudaObraSocial
            )
          }
        >
          <PickerObraSocial
            id={ID.obraSocial}
            value={borrador.obra_social_id}
            onChange={elegirObraSocial}
            onCrear={(texto) => setCapa({ tipo: 'obra-social', texto })}
            elegidaFueraDeLista={obraSocialDeBaja}
          />
        </Field>

        <Field
          label="Profesional"
          requerido
          htmlFor={ID.profesional}
          helper={
            profesionalPropio && borrador.profesional_id === profesionalPropio.id
              ? 'Sos vos. Cambialo si el tratamiento lo hace otra persona del equipo.'
              : undefined
          }
        >
          <PickerProfesional
            id={ID.profesional}
            value={borrador.profesional_id}
            onChange={elegirProfesional}
            onCrear={(texto) => setCapa({ tipo: 'profesional', texto })}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Fecha de emisión" htmlFor={ID.fecha}>
            <Input
              id={ID.fecha}
              type="date"
              value={borrador.fecha_emision}
              onChange={(e) => cambiarFecha(e.target.value)}
            />
          </Field>

          <Field label="Vigencia">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented<ModoVigencia>
                value={modo}
                opciones={[
                  { value: '30', label: '30 días' },
                  { value: '60', label: '60 días' },
                  { value: 'otra', label: 'Otra' },
                ]}
                onChange={(v) => {
                  if (v === 'otra') {
                    // Se arranca en un valor distinto de 30/60 para que
                    // el segmented no vuelva solo a una de las opciones rápidas.
                    if (VIGENCIAS_RAPIDAS.includes(borrador.vigencia_dias as 30 | 60)) {
                      cambiarDias(45)
                    }
                    enfocar(ID.dias)
                    return
                  }
                  cambiarDias(Number(v))
                }}
              />
              {modo === 'otra' && (
                <div className="flex items-center gap-2">
                  <Input
                    id={ID.dias}
                    inputMode="numeric"
                    className="w-20 text-right tabular-nums"
                    value={borrador.vigencia_dias === 0 ? '' : String(borrador.vigencia_dias)}
                    onChange={(e) => {
                      const limpio = e.target.value.replace(/[^\d]/g, '')
                      cambiarDias(limpio === '' ? 0 : Math.min(365, Number(limpio)))
                    }}
                  />
                  <span className="text-[14px] text-muted">días</span>
                </div>
              )}
            </div>
          </Field>
        </div>

        <p className="t-helper -mt-2">
          Válido hasta el{' '}
          <strong className="font-semibold text-ink">{fechaLarga(borrador.valido_hasta)}</strong>.
        </p>

        {/* La hora del autoguardado vive en la barra de pasos, a la
            vista en los tres. Acá queda sólo lo que hay que saber una
            vez: dónde está el borrador mientras tanto. */}
        <p className="t-helper">
          Lo que cargues queda en este dispositivo hasta que emitas el presupuesto.
        </p>
      </div>
    </>
  )
}
