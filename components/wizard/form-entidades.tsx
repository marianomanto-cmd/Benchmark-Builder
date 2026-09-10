'use client'

/**
 * Mini-forms de creación al vuelo: paciente, profesional y obra social.
 *
 * Todos tienen **un solo campo obligatorio**. El resto se completa
 * después desde la biblioteca: cortar el alta del presupuesto para
 * pedir un email es la forma más rápida de que el consultorio deje de
 * cargar presupuestos.
 *
 * Al guardar, el formulario devuelve la entidad ya creada y quien lo
 * abrió la deja seleccionada y mueve el foco al campo siguiente.
 */

import * as React from 'react'
import { toast } from 'sonner'

import { Field, Input, Switch } from '@/components/ui'
import type { ObraSocial, Paciente, Profesional } from '@/lib/types'

import { CabeceraCapa, MarcoCapa, PieCapa } from './capa'
import {
  useCrearObraSocial,
  useCrearPaciente,
  useCrearProfesional,
} from './consultas'
import { PickerObraSocial } from './pickers'

/* ═══════════════════════════════════════════════════════════
   Paciente
   ═══════════════════════════════════════════════════════════ */

export function FormPaciente({
  textoInicial,
  onListo,
  onCancelar,
}: {
  textoInicial: string
  onListo: (paciente: Paciente) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = React.useState(textoInicial)
  const [dni, setDni] = React.useState('')
  const [telefono, setTelefono] = React.useState('')
  const [tieneWhatsApp, setTieneWhatsApp] = React.useState(true)
  const [email, setEmail] = React.useState('')
  const [obraSocial, setObraSocial] = React.useState<ObraSocial | null>(null)
  const [afiliado, setAfiliado] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  // Crear una obra social sin salir del alta de paciente: la capa es
  // una sola, así que el sub-form reemplaza a este mientras dura.
  const [creandoObraSocial, setCreandoObraSocial] = React.useState<string | null>(null)

  const crear = useCrearPaciente()

  async function guardar() {
    const limpio = nombre.trim()
    if (limpio.length < 2) {
      setError('Escribí el nombre del paciente: es lo único que necesitamos ahora.')
      return
    }
    try {
      const paciente = await crear.mutateAsync({
        nombre: limpio,
        dni: dni.trim() || null,
        telefono: telefono.trim() || null,
        tiene_whatsapp: tieneWhatsApp,
        email: email.trim() || null,
        obra_social_id: obraSocial?.id ?? null,
        nro_afiliado: afiliado.trim() || null,
      })
      toast.success(`${paciente.nombre} quedó en la agenda`)
      onListo(paciente)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el paciente.')
    }
  }

  if (creandoObraSocial !== null) {
    return (
      <FormObraSocial
        textoInicial={creandoObraSocial}
        onCancelar={() => setCreandoObraSocial(null)}
        onListo={(os) => {
          setObraSocial(os)
          setCreandoObraSocial(null)
        }}
      />
    )
  }

  return (
    <MarcoCapa onEnviar={() => void guardar()}>
      <CabeceraCapa
        titulo="Nuevo paciente"
        ayuda="Con el nombre alcanza. El resto lo podés completar más adelante."
        onVolver={onCancelar}
      />

      <div className="flex flex-col gap-4">
        <Field label="Nombre y apellido" requerido htmlFor="np-nombre" error={error}>
          <Input
            id="np-nombre"
            autoFocus
            value={nombre}
            invalido={Boolean(error)}
            placeholder="Gómez, Renata"
            onChange={(e) => {
              setNombre(e.target.value)
              setError(null)
            }}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="DNI" htmlFor="np-dni">
            <Input
              id="np-dni"
              inputMode="numeric"
              value={dni}
              placeholder="30.123.456"
              onChange={(e) => setDni(e.target.value)}
            />
          </Field>

          <Field label="Teléfono" htmlFor="np-tel" helper="Con característica, para el WhatsApp.">
            <Input
              id="np-tel"
              inputMode="tel"
              value={telefono}
              placeholder="351 555-1234"
              onChange={(e) => setTelefono(e.target.value)}
            />
          </Field>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-input border border-hairline bg-card px-3 py-2.5">
          <span className="min-w-0">
            <span className="block font-sans text-[14px] text-ink">Tiene WhatsApp</span>
            <span className="t-helper block">
              Si no lo tiene, el presupuesto se manda por mail o se imprime.
            </span>
          </span>
          <Switch checked={tieneWhatsApp} onCheckedChange={setTieneWhatsApp} />
        </label>

        <Field label="Email" htmlFor="np-email">
          <Input
            id="np-email"
            type="email"
            value={email}
            placeholder="renata@ejemplo.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Obra social"
            htmlFor="np-os"
            helper="Queda en la ficha y se precarga en cada presupuesto."
          >
            <PickerObraSocial
              id="np-os"
              value={obraSocial?.id ?? null}
              onChange={setObraSocial}
              onCrear={(texto) => setCreandoObraSocial(texto)}
            />
          </Field>

          <Field label="Nro de afiliado" htmlFor="np-afiliado">
            <Input
              id="np-afiliado"
              value={afiliado}
              onChange={(e) => setAfiliado(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <PieCapa
        etiqueta="Crear paciente"
        onCancelar={onCancelar}
        onGuardar={() => void guardar()}
        guardando={crear.isPending}
        deshabilitado={nombre.trim().length < 2}
      />
    </MarcoCapa>
  )
}

/* ═══════════════════════════════════════════════════════════
   Profesional
   ═══════════════════════════════════════════════════════════ */

export function FormProfesional({
  textoInicial,
  onListo,
  onCancelar,
}: {
  textoInicial: string
  onListo: (profesional: Profesional) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = React.useState(textoInicial)
  const [matricula, setMatricula] = React.useState('')
  const [especialidad, setEspecialidad] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const crear = useCrearProfesional()

  async function guardar() {
    const limpio = nombre.trim()
    if (limpio.length < 3) {
      setError('Escribí el nombre completo: es el que sale firmando el presupuesto.')
      return
    }
    try {
      const profesional = await crear.mutateAsync({
        nombre: limpio,
        matricula: matricula.trim() || null,
        especialidad: especialidad.trim() || null,
      })
      toast.success(`${profesional.nombre} quedó cargado`)
      onListo(profesional)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el profesional.')
    }
  }

  return (
    <MarcoCapa onEnviar={() => void guardar()}>
      <CabeceraCapa
        titulo="Nuevo profesional"
        ayuda="El nombre sale impreso en el presupuesto, así que escribilo como firma."
        onVolver={onCancelar}
      />

      <div className="flex flex-col gap-4">
        <Field label="Nombre y apellido" requerido htmlFor="npr-nombre" error={error}>
          <Input
            id="npr-nombre"
            autoFocus
            value={nombre}
            invalido={Boolean(error)}
            placeholder="Dra. Lucía Fernández"
            onChange={(e) => {
              setNombre(e.target.value)
              setError(null)
            }}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Matrícula" htmlFor="npr-mat">
            <Input
              id="npr-mat"
              value={matricula}
              placeholder="MP 12345"
              onChange={(e) => setMatricula(e.target.value)}
            />
          </Field>

          <Field label="Especialidad" htmlFor="npr-esp">
            <Input
              id="npr-esp"
              value={especialidad}
              placeholder="Endodoncia"
              onChange={(e) => setEspecialidad(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <PieCapa
        etiqueta="Crear profesional"
        onCancelar={onCancelar}
        onGuardar={() => void guardar()}
        guardando={crear.isPending}
        deshabilitado={nombre.trim().length < 3}
      />
    </MarcoCapa>
  )
}

/* ═══════════════════════════════════════════════════════════
   Obra social
   ═══════════════════════════════════════════════════════════ */

export function FormObraSocial({
  textoInicial,
  onListo,
  onCancelar,
}: {
  textoInicial: string
  onListo: (obraSocial: ObraSocial) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = React.useState(textoInicial)
  const [plan, setPlan] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const crear = useCrearObraSocial()

  async function guardar() {
    const limpio = nombre.trim()
    if (limpio.length < 2) {
      setError('Escribí el nombre de la obra social.')
      return
    }
    try {
      const os = await crear.mutateAsync({ nombre: limpio, plan: plan.trim() || null })
      toast.success(`${os.nombre}${os.plan ? ` ${os.plan}` : ''} quedó cargada`)
      onListo(os)
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo crear la obra social.'
      setError(
        mensaje.includes('duplicate') || mensaje.includes('unique')
          ? 'Ya existe una obra social con ese nombre y plan.'
          : mensaje,
      )
    }
  }

  return (
    <MarcoCapa onEnviar={() => void guardar()}>
      <CabeceraCapa
        titulo="Nueva obra social"
        ayuda="El plan va aparte del nombre: así “OSDE 210” y “OSDE 310” son dos coberturas distintas."
        onVolver={onCancelar}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" requerido htmlFor="nos-nombre" error={error}>
          <Input
            id="nos-nombre"
            autoFocus
            value={nombre}
            invalido={Boolean(error)}
            placeholder="OSDE"
            onChange={(e) => {
              setNombre(e.target.value)
              setError(null)
            }}
          />
        </Field>

        <Field label="Plan" htmlFor="nos-plan" helper="Opcional. Por ejemplo 210 o 310.">
          <Input
            id="nos-plan"
            value={plan}
            placeholder="210"
            onChange={(e) => setPlan(e.target.value)}
          />
        </Field>
      </div>

      <PieCapa
        etiqueta="Crear obra social"
        onCancelar={onCancelar}
        onGuardar={() => void guardar()}
        guardando={crear.isPending}
        deshabilitado={nombre.trim().length < 2}
      />
    </MarcoCapa>
  )
}
