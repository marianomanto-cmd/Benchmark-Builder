'use client'

import { IdCard, TriangleAlert } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { guardarPerfil } from '@/app/actions/auth'
import { ESTADO_PERFIL_INICIAL } from '@/app/actions/auth-estado'
import {
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from '@/components/ui'
import type { Profesional } from '@/lib/types'

/**
 * Ficha del profesional. Si todavía no existe fila en `profesionales`, no
 * se muestra un formulario vacío disfrazado: se ofrece crearla, porque
 * hasta que exista los presupuestos no pueden salir a nombre de nadie.
 */
export function PerfilForm({
  email,
  nombreSugerido,
  profesional,
}: {
  email: string
  nombreSugerido: string
  profesional: Profesional | null
}) {
  const [estado, accion, pendiente] = React.useActionState(guardarPerfil, ESTADO_PERFIL_INICIAL)
  const [creando, setCreando] = React.useState(false)

  const tieneFicha = Boolean(profesional)
  const mostrarFormulario = tieneFicha || creando

  // El toast es la confirmación; el banner de error queda a la vista para
  // poder leerlo con calma.
  const ultimoMensaje = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!estado.mensaje || estado.mensaje === ultimoMensaje.current) return
    ultimoMensaje.current = estado.mensaje
    if (estado.ok) toast.success(estado.mensaje)
  }, [estado])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ficha profesional</CardTitle>
      </CardHeader>

      <CardBody>
        {!mostrarFormulario ? (
          <div className="space-y-4">
            <Banner tono="info" icono={<IdCard className="size-4" />} titulo="Todavía no tenés ficha">
              Sin ficha no podés figurar como profesional que emite el presupuesto. Se carga una
              vez y se edita cuando haga falta.
            </Banner>
            <Button variant="primary" size="touch" onClick={() => setCreando(true)}>
              Crear mi ficha
            </Button>
          </div>
        ) : (
          <form action={accion} className="space-y-4">
            {estado.mensaje && !estado.ok && (
              <Banner
                tono="warm"
                icono={<TriangleAlert className="size-4" />}
                titulo="No se guardó"
              >
                {estado.mensaje}
              </Banner>
            )}

            <Field
              label="Nombre y apellido"
              htmlFor="nombre"
              requerido
              helper="Así figura firmando el presupuesto."
            >
              <Input
                id="nombre"
                name="nombre"
                autoComplete="name"
                required
                maxLength={120}
                placeholder="Ej.: Dra. Lucía Fernández"
                defaultValue={profesional?.nombre ?? nombreSugerido}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Matrícula" htmlFor="matricula" helper="Opcional. Sale junto al nombre.">
                <Input
                  id="matricula"
                  name="matricula"
                  maxLength={40}
                  placeholder="Ej.: MP 12.345"
                  defaultValue={profesional?.matricula ?? ''}
                />
              </Field>

              <Field label="Especialidad" htmlFor="especialidad" helper="Opcional.">
                <Input
                  id="especialidad"
                  name="especialidad"
                  maxLength={60}
                  placeholder="Ej.: Endodoncia"
                  defaultValue={profesional?.especialidad ?? ''}
                />
              </Field>
            </div>

            <Field label="Mail" htmlFor="email" helper="Es con el que entrás. No se cambia desde acá.">
              <Input id="email" name="email" value={email} readOnly disabled />
            </Field>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button type="submit" variant="primary" size="touch" loading={pendiente}>
                {tieneFicha ? 'Guardar cambios' : 'Crear ficha'}
              </Button>
              {!tieneFicha && (
                <Button
                  type="button"
                  variant="ghost"
                  size="touch"
                  disabled={pendiente}
                  onClick={() => setCreando(false)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  )
}
