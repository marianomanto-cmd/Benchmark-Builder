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

import { Check } from 'lucide-react'
import * as React from 'react'

import { Field, Input, MicroBadge, Segmented } from '@/components/ui'
import { fechaLarga, hora } from '@/lib/formato'
import type { BorradorPresupuesto, ObraSocial, Paciente, Profesional } from '@/lib/types'

import { calcularValidoHasta, VIGENCIAS_RAPIDAS } from './borrador'
import { Capa, enfocar } from './capa'
import { useObrasSociales, usePacientes, useProfesionalPropio } from './consultas'
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
  guardadoEn,
}: {
  borrador: BorradorPresupuesto
  parche: (cambios: Partial<BorradorPresupuesto>) => void
  guardadoEn: string | null
}) {
  const [capa, setCapa] = React.useState<CapaAbierta>(null)

  const { data: pacientes = [] } = usePacientes()
  const { data: obras = [] } = useObrasSociales()
  const { data: profesionalPropio } = useProfesionalPropio()

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

  function elegirPaciente(p: Paciente) {
    const osFicha = p.obra_social_id ? obras.find((o) => o.id === p.obra_social_id) : null
    parche({
      paciente_id: p.id,
      paciente_nombre: p.nombre,
      // La obra social viaja con el paciente: en el 90 % de los casos
      // es la correcta y nadie tiene que volver a elegirla.
      obra_social_id: osFicha?.id ?? null,
      obra_social_nombre: osFicha ? nombreObraSocial(osFicha) : null,
    })
  }

  function elegirObraSocial(os: ObraSocial | null) {
    parche({
      obra_social_id: os?.id ?? null,
      obra_social_nombre: os ? nombreObraSocial(os) : null,
    })
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
            elegirPaciente(p)
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

        <Field label="Obra social" htmlFor={ID.obraSocial} helper={ayudaObraSocial}>
          <PickerObraSocial
            id={ID.obraSocial}
            value={borrador.obra_social_id}
            onChange={elegirObraSocial}
            onCrear={(texto) => setCapa({ tipo: 'obra-social', texto })}
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

        {guardadoEn && (
          <p className="t-helper flex items-center gap-1.5">
            <MicroBadge tono="primary">
              <Check className="mr-1 size-3" aria-hidden />
              Guardado {hora(guardadoEn)}
            </MicroBadge>
            <span>El borrador queda en este dispositivo hasta que lo emitas.</span>
          </p>
        )}
      </div>
    </>
  )
}
