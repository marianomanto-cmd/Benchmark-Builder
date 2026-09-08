'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { actualizarPaciente, crearPaciente } from '@/app/actions/catalogo'
import {
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@/components/ui'
import type { FilaPaciente, OpcionObraSocial } from './tipos'
import { DrawerForm, FilaCampos, FilaSwitch } from './drawer-form'

/** Radix no acepta value vacío: `particular` es el centinela de "sin obra social". */
const PARTICULAR = 'particular'

/**
 * Alta y edición de pacientes.
 *
 * La obra social del paciente es la que el wizard propone por defecto,
 * y de ahí sale la cobertura de cada ítem: tenerla bien cargada evita
 * que el presupuesto salga con el número equivocado.
 */
export function DrawerPaciente({
  paciente,
  obrasSociales,
  onCerrar,
  onGuardado,
}: {
  /** `null` = alta. */
  paciente: FilaPaciente | null
  obrasSociales: OpcionObraSocial[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = React.useState(paciente?.nombre ?? '')
  const [dni, setDni] = React.useState(paciente?.dni ?? '')
  const [telefono, setTelefono] = React.useState(paciente?.telefono ?? '')
  const [tieneWhatsapp, setTieneWhatsapp] = React.useState(paciente?.tiene_whatsapp ?? true)
  const [email, setEmail] = React.useState(paciente?.email ?? '')
  const [obraSocialId, setObraSocialId] = React.useState(paciente?.obra_social_id ?? PARTICULAR)
  const [afiliado, setAfiliado] = React.useState(paciente?.nro_afiliado ?? '')
  const [notas, setNotas] = React.useState(paciente?.notas_internas ?? '')

  const [error, setError] = React.useState<string | null>(null)
  const [guardando, iniciar] = React.useTransition()

  // Una obra social desactivada después de cargar al paciente sigue
  // siendo la suya: hay que poder verla en el select sin reactivarla.
  const opciones = React.useMemo(() => {
    const propia = paciente?.obra_social_id
    if (!propia) return obrasSociales.filter((o) => o.activa)
    const activas = obrasSociales.filter((o) => o.activa || o.id === propia)
    return activas
  }, [obrasSociales, paciente?.obra_social_id])

  function guardar() {
    setError(null)

    iniciar(async () => {
      const entrada = {
        nombre,
        dni,
        telefono,
        tiene_whatsapp: tieneWhatsapp,
        email,
        obra_social_id: obraSocialId === PARTICULAR ? null : obraSocialId,
        nro_afiliado: afiliado,
        notas_internas: notas,
      }

      const resultado = paciente
        ? await actualizarPaciente(paciente.id, entrada)
        : await crearPaciente(entrada)

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      toast.success(paciente ? 'Paciente actualizado' : 'Paciente creado')
      onGuardado()
      onCerrar()
    })
  }

  return (
    <DrawerForm
      open
      onOpenChange={(v) => {
        if (!v) onCerrar()
      }}
      titulo={paciente ? 'Editar paciente' : 'Nuevo paciente'}
      descripcion="El nombre y el DNI se copian dentro del presupuesto al emitirlo."
      formId="form-paciente"
      guardando={guardando}
      error={error}
      onSubmit={guardar}
      textoGuardar={paciente ? 'Guardar cambios' : 'Crear paciente'}
    >
      <Field
        label="Nombre"
        requerido
        htmlFor="paciente-nombre"
        helper="Cargalo como «Apellido, Nombre» para que la lista quede ordenada."
      >
        <Input
          id="paciente-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Gómez, Renata"
          autoFocus
        />
      </Field>

      <FilaCampos>
        <Field label="DNI" htmlFor="paciente-dni">
          <Input
            id="paciente-dni"
            inputMode="numeric"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="30.123.456"
            className="tabular-nums"
          />
        </Field>

        <Field label="Teléfono" htmlFor="paciente-telefono" helper="Con característica, sin 0 ni 15.">
          <Input
            id="paciente-telefono"
            inputMode="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="11 5555 4444"
            className="tabular-nums"
          />
        </Field>
      </FilaCampos>

      <FilaSwitch
        id="paciente-whatsapp"
        titulo="Tiene WhatsApp"
        ayuda="Si no lo tiene, el presupuesto se manda por otro canal."
      >
        <Switch
          id="paciente-whatsapp"
          checked={tieneWhatsapp}
          onCheckedChange={setTieneWhatsapp}
        />
      </FilaSwitch>

      <Field label="Mail" htmlFor="paciente-email">
        <Input
          id="paciente-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="renata@mail.com"
        />
      </Field>

      <FilaCampos>
        <Field label="Obra social" htmlFor="paciente-os">
          <Select value={obraSocialId} onValueChange={setObraSocialId}>
            <SelectTrigger id="paciente-os">
              <SelectValue placeholder="Elegí una" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PARTICULAR}>Particular (sin obra social)</SelectItem>
              {opciones.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nombre}
                  {!o.activa && ' · inactiva'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="N.º de afiliado" htmlFor="paciente-afiliado">
          <Input
            id="paciente-afiliado"
            value={afiliado}
            onChange={(e) => setAfiliado(e.target.value)}
            placeholder="61234567801"
            className="tabular-nums"
            disabled={obraSocialId === PARTICULAR}
          />
        </Field>
      </FilaCampos>

      <Field
        label="Notas internas"
        htmlFor="paciente-notas"
        helper="Sólo las ve el consultorio. Nunca salen en el PDF."
      >
        <Textarea
          id="paciente-notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Viene derivada por la Dra. Paz. Pide presupuesto por escrito."
        />
      </Field>
    </DrawerForm>
  )
}
