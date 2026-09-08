'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { actualizarProfesional, crearProfesional } from '@/app/actions/catalogo'
import { Field, Input, Switch } from '@/components/ui'
import type { FilaProfesional } from './tipos'
import { DrawerForm, FilaCampos, FilaSwitch } from './drawer-form'

/**
 * Alta y edición de profesionales.
 *
 * Nombre y matrícula se copian dentro del presupuesto: son los datos
 * del que firma. Un profesional sin login se carga igual desde acá; la
 * vinculación con un usuario de la app se hace desde Mi cuenta.
 */
export function DrawerProfesional({
  profesional,
  onCerrar,
  onGuardado,
}: {
  /** `null` = alta. */
  profesional: FilaProfesional | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = React.useState(profesional?.nombre ?? '')
  const [matricula, setMatricula] = React.useState(profesional?.matricula ?? '')
  const [especialidad, setEspecialidad] = React.useState(profesional?.especialidad ?? '')
  const [activo, setActivo] = React.useState(profesional?.activo ?? true)

  const [error, setError] = React.useState<string | null>(null)
  const [guardando, iniciar] = React.useTransition()

  function guardar() {
    setError(null)

    iniciar(async () => {
      const entrada = { nombre, matricula, especialidad, activo }

      const resultado = profesional
        ? await actualizarProfesional(profesional.id, entrada)
        : await crearProfesional(entrada)

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      toast.success(profesional ? 'Profesional actualizado' : 'Profesional creado')
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
      titulo={profesional ? 'Editar profesional' : 'Nuevo profesional'}
      descripcion="El nombre y la matrícula salen en el encabezado del presupuesto."
      formId="form-profesional"
      guardando={guardando}
      error={error}
      onSubmit={guardar}
      textoGuardar={profesional ? 'Guardar cambios' : 'Crear profesional'}
    >
      <Field label="Nombre" requerido htmlFor="profesional-nombre">
        <Input
          id="profesional-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Dra. Laura Pérez"
          autoFocus
        />
      </Field>

      <FilaCampos>
        <Field label="Matrícula" htmlFor="profesional-matricula">
          <Input
            id="profesional-matricula"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            placeholder="MN 45.678"
          />
        </Field>

        <Field label="Especialidad" htmlFor="profesional-especialidad">
          <Input
            id="profesional-especialidad"
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            placeholder="Endodoncia"
          />
        </Field>
      </FilaCampos>

      <FilaSwitch
        id="profesional-activo"
        titulo="Activo"
        ayuda="Los inactivos no se ofrecen al emitir, pero siguen firmando los presupuestos viejos."
      >
        <Switch id="profesional-activo" checked={activo} onCheckedChange={setActivo} />
      </FilaSwitch>
    </DrawerForm>
  )
}
