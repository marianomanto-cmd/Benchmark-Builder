'use client'

import Link from 'next/link'
import * as React from 'react'
import { toast } from 'sonner'

import { actualizarProfesional, crearProfesional } from '@/app/actions/catalogo'
import { Field, Input } from '@/components/ui'
import type { FilaProfesional } from './tipos'
import { DrawerForm, FilaCampos } from './drawer-form'

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

  const [error, setError] = React.useState<string | null>(null)
  const [guardando, iniciar] = React.useTransition()

  function guardar() {
    setError(null)

    iniciar(async () => {
      const entrada = { nombre, matricula, especialidad }

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

      {/* La baja del profesional se hace en «Equipo y accesos» y no
          acá: ahí es donde además se le corta el acceso a la app, se
          verifica que quien la da sea admin y que no quede el
          consultorio sin ninguno. Este mismo interruptor cambiaba la
          columna a secas, y después `/equipo` mostraba «De baja» a
          alguien que seguía entrando. */}
      <p className="t-helper">
        Para dar de baja a alguien del equipo —y cortarle el acceso— entrá a{' '}
        <Link href="/equipo" className="text-primary underline-offset-4 hover:underline">
          Equipo y accesos
        </Link>
        .
      </p>
    </DrawerForm>
  )
}
