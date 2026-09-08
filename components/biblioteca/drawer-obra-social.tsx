'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { actualizarObraSocial, crearObraSocial } from '@/app/actions/catalogo'
import { Field, Input, Switch, Textarea } from '@/components/ui'
import type { FilaObraSocial } from './tipos'
import { DrawerForm, FilaCampos, FilaSwitch } from './drawer-form'

/**
 * Alta y edición de obras sociales.
 *
 * Nombre y plan son la clave única: OSDE 210 y OSDE 310 son dos filas,
 * porque cubren distinto y por eso tienen aranceles distintos.
 */
export function DrawerObraSocial({
  obraSocial,
  onCerrar,
  onGuardado,
}: {
  /** `null` = alta. */
  obraSocial: FilaObraSocial | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = React.useState(obraSocial?.nombre ?? '')
  const [plan, setPlan] = React.useState(obraSocial?.plan ?? '')
  const [activa, setActiva] = React.useState(obraSocial?.activa ?? true)
  const [notas, setNotas] = React.useState(obraSocial?.notas ?? '')

  const [error, setError] = React.useState<string | null>(null)
  const [guardando, iniciar] = React.useTransition()

  function guardar() {
    setError(null)

    iniciar(async () => {
      const entrada = { nombre, plan, activa, notas }

      const resultado = obraSocial
        ? await actualizarObraSocial(obraSocial.id, entrada)
        : await crearObraSocial(entrada)

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      toast.success(obraSocial ? 'Obra social actualizada' : 'Obra social creada')
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
      titulo={obraSocial ? 'Editar obra social' : 'Nueva obra social'}
      descripcion="Cada plan va como una obra social aparte: cubren distinto y tienen aranceles propios."
      formId="form-obra-social"
      guardando={guardando}
      error={error}
      onSubmit={guardar}
      textoGuardar={obraSocial ? 'Guardar cambios' : 'Crear obra social'}
    >
      <FilaCampos>
        <Field label="Nombre" requerido htmlFor="os-nombre">
          <Input
            id="os-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="OSDE"
            autoFocus
          />
        </Field>

        <Field label="Plan" htmlFor="os-plan" helper="Dejalo vacío si no tiene planes.">
          <Input
            id="os-plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="210"
          />
        </Field>
      </FilaCampos>

      <Field
        label="Notas internas"
        htmlFor="os-notas"
        helper="Sólo las ve el consultorio. No salen en el presupuesto."
      >
        <Textarea
          id="os-notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Autoriza por sistema. Coseguro fijo en prótesis."
        />
      </Field>

      <FilaSwitch
        id="os-activa"
        titulo="Activa"
        ayuda="Las inactivas no se ofrecen al cargar un paciente ni cuentan en la grilla de aranceles."
      >
        <Switch id="os-activa" checked={activa} onCheckedChange={setActiva} />
      </FilaSwitch>
    </DrawerForm>
  )
}
