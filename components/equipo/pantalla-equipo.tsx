'use client'

import { KeyRound, ShieldCheck, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import {
  cambiarActivo,
  cambiarContrasena,
  cambiarPermiso,
  crearUsuario,
  type MiembroEquipo,
} from '@/app/actions/equipo'
import {
  Banner,
  Button,
  Card,
  Field,
  Input,
  MicroBadge,
  ResponsiveModal,
  Switch,
  Tabla,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/components/ui'
import { MIN_CONTRASENA, validarContrasena, validarUsuario } from '@/lib/auth/usuarios'
import { cn } from '@/lib/utils'

export function PantallaEquipo({
  equipo,
  usuarioActual,
}: {
  equipo: MiembroEquipo[]
  usuarioActual: string
}) {
  const router = useRouter()
  const [altaAbierta, setAltaAbierta] = React.useState(false)
  const [claveDe, setClaveDe] = React.useState<MiembroEquipo | null>(null)

  return (
    <div className="flex flex-col gap-5 animate-enter">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="t-h2">Equipo y accesos</h1>
          <p className="mt-1 t-helper">
            Quién entra a la app y con qué permisos. Las fichas no se borran: se desactivan,
            porque viven en presupuestos ya emitidos.
          </p>
        </div>

        <Button variant="primary" onClick={() => setAltaAbierta(true)}>
          <UserPlus aria-hidden />
          Nuevo usuario
        </Button>
      </header>

      {/* Desktop */}
      <Card className="hidden overflow-hidden md:block">
        <Tabla>
          <Thead>
            <tr>
              <Th className="pl-5">Nombre</Th>
              <Th>Usuario</Th>
              <Th>Matrícula</Th>
              <Th>Administra</Th>
              <Th className="pr-5 text-right">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {equipo.map((m) => (
              <Tr key={m.profesionalId} className={cn(!m.activo && 'opacity-55')}>
                <Td className="pl-5">
                  <span className="font-medium text-ink">{m.nombre}</span>
                  {m.especialidad && <span className="block t-helper">{m.especialidad}</span>}
                </Td>
                <Td>
                  {m.usuario ? (
                    <span className="font-sans text-[13px] text-body">{m.usuario}</span>
                  ) : (
                    <MicroBadge>Sin acceso</MicroBadge>
                  )}
                </Td>
                <Td>{m.matricula ?? '—'}</Td>
                <Td>
                  <Switch
                    checked={m.esAdmin}
                    aria-label={`${m.nombre} administra el equipo`}
                    onCheckedChange={async (valor) => {
                      const res = await cambiarPermiso({
                        profesionalId: m.profesionalId,
                        esAdmin: valor,
                      })
                      if (!res.ok) return toast.error(res.error)
                      toast.success(
                        valor ? `${m.nombre} ahora administra.` : `${m.nombre} ya no administra.`,
                      )
                      router.refresh()
                    }}
                  />
                </Td>
                <Td className="pr-5">
                  <div className="flex justify-end gap-2">
                    {m.userId && (
                      <Button size="sm" variant="secondary" onClick={() => setClaveDe(m)}>
                        <KeyRound aria-hidden />
                        Contraseña
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={m.activo ? 'danger' : 'secondary'}
                      onClick={async () => {
                        const res = await cambiarActivo(m.profesionalId, !m.activo)
                        if (!res.ok) return toast.error(res.error)
                        router.refresh()
                      }}
                    >
                      {m.activo ? 'Desactivar' : 'Reactivar'}
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
      </Card>

      {/* Mobile: nunca tabla */}
      <div className="flex flex-col gap-3 md:hidden">
        {equipo.map((m) => (
          <Card key={m.profesionalId} className={cn('p-4', !m.activo && 'opacity-55')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-sans text-[15px] font-semibold text-ink">{m.nombre}</p>
                <p className="t-helper">
                  {m.usuario ?? 'sin acceso'}
                  {m.matricula && ` · ${m.matricula}`}
                </p>
              </div>
              {m.esAdmin && (
                <MicroBadge tono="primary">
                  <ShieldCheck className="mr-1 size-3" aria-hidden />
                  Admin
                </MicroBadge>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {m.userId && (
                <Button size="sm" variant="secondary" onClick={() => setClaveDe(m)}>
                  <KeyRound aria-hidden />
                  Contraseña
                </Button>
              )}
              <Button
                size="sm"
                variant={m.activo ? 'danger' : 'secondary'}
                onClick={async () => {
                  const res = await cambiarActivo(m.profesionalId, !m.activo)
                  if (!res.ok) return toast.error(res.error)
                  router.refresh()
                }}
              >
                {m.activo ? 'Desactivar' : 'Reactivar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Banner tono="info" titulo="Sobre las contraseñas">
        No se pueden ver, sólo reemplazar: quedan guardadas cifradas. Si alguien la olvida,
        ponele una nueva desde acá y avisale. Vos entrás como{' '}
        <strong className="font-semibold">{usuarioActual}</strong>.
      </Banner>

      <ModalAlta
        abierto={altaAbierta}
        onCerrar={() => setAltaAbierta(false)}
        onListo={() => {
          setAltaAbierta(false)
          router.refresh()
        }}
      />

      <ModalContrasena
        miembro={claveDe}
        onCerrar={() => setClaveDe(null)}
        onListo={() => setClaveDe(null)}
      />
    </div>
  )
}

function ModalAlta({
  abierto,
  onCerrar,
  onListo,
}: {
  abierto: boolean
  onCerrar: () => void
  onListo: () => void
}) {
  const [usuario, setUsuario] = React.useState('')
  const [contrasena, setContrasena] = React.useState('')
  const [nombre, setNombre] = React.useState('')
  const [matricula, setMatricula] = React.useState('')
  const [especialidad, setEspecialidad] = React.useState('')
  const [esAdmin, setEsAdmin] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [guardando, setGuardando] = React.useState(false)

  function limpiar() {
    setUsuario('')
    setContrasena('')
    setNombre('')
    setMatricula('')
    setEspecialidad('')
    setEsAdmin(false)
    setError(null)
  }

  async function guardar() {
    const motivoUsuario = validarUsuario(usuario)
    if (motivoUsuario) return setError(motivoUsuario)
    const motivoClave = validarContrasena(contrasena)
    if (motivoClave) return setError(motivoClave)
    if (!nombre.trim()) return setError('El nombre es el que firma los presupuestos.')

    setError(null)
    setGuardando(true)
    try {
      const res = await crearUsuario({
        usuario,
        contrasena,
        nombre,
        matricula,
        especialidad,
        esAdmin,
      })
      if (!res.ok) return setError(res.error ?? 'No se pudo crear.')

      toast.success(`${nombre} ya puede entrar con el usuario ${usuario.toLowerCase()}.`)
      limpiar()
      onListo()
    } catch {
      setError('No se pudo conectar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ResponsiveModal
      open={abierto}
      onOpenChange={(v) => {
        if (!v && !guardando) {
          limpiar()
          onCerrar()
        }
      }}
      ancho="md"
      titulo="Nuevo usuario"
      descripcion="Crea el acceso y la ficha del profesional de una sola vez."
      footer={
        <>
          <Button variant="ghost" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="primary" loading={guardando} onClick={() => void guardar()}>
            Crear usuario
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <Banner tono="warm" titulo="Revisá esto">
            {error}
          </Banner>
        )}

        <Field
          label="Nombre y apellido"
          htmlFor="eq-nombre"
          requerido
          helper="Es el que sale firmando el presupuesto."
        >
          <Input
            id="eq-nombre"
            autoFocus
            placeholder="Álvarez, María"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Usuario"
            htmlFor="eq-usuario"
            requerido
            helper="Con esto entra. Sin espacios ni acentos."
          >
            <Input
              id="eq-usuario"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="maria"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </Field>

          <Field
            label="Contraseña"
            htmlFor="eq-clave"
            requerido
            helper={`Al menos ${MIN_CONTRASENA} caracteres.`}
          >
            <Input
              id="eq-clave"
              type="text"
              autoComplete="off"
              placeholder="la que le vas a pasar"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Matrícula" htmlFor="eq-matricula">
            <Input
              id="eq-matricula"
              placeholder="MP 12.345"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
            />
          </Field>

          <Field label="Especialidad" htmlFor="eq-especialidad">
            <Input
              id="eq-especialidad"
              placeholder="Endodoncia"
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-input border border-hairline p-3.5">
          <Switch checked={esAdmin} onCheckedChange={setEsAdmin} />
          <span className="min-w-0">
            <span className="block font-sans text-[14px] font-medium text-ink">
              Puede administrar el equipo
            </span>
            <span className="block t-helper">
              Crear usuarios, cambiar contraseñas y dar de baja. Dáselo sólo a quien lo necesite.
            </span>
          </span>
        </label>
      </div>
    </ResponsiveModal>
  )
}

function ModalContrasena({
  miembro,
  onCerrar,
  onListo,
}: {
  miembro: MiembroEquipo | null
  onCerrar: () => void
  onListo: () => void
}) {
  const [contrasena, setContrasena] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [guardando, setGuardando] = React.useState(false)

  async function guardar() {
    if (!miembro?.userId) return
    const motivo = validarContrasena(contrasena)
    if (motivo) return setError(motivo)

    setError(null)
    setGuardando(true)
    try {
      const res = await cambiarContrasena({ userId: miembro.userId, contrasena })
      if (!res.ok) return setError(res.error ?? 'No se pudo cambiar.')

      toast.success(`Contraseña nueva para ${miembro.nombre}. Pasásela.`)
      setContrasena('')
      onListo()
    } catch {
      setError('No se pudo conectar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ResponsiveModal
      // Cada apertura arranca limpia: la clave del anterior no queda escrita.
      key={miembro?.profesionalId ?? 'cerrado'}
      open={miembro !== null}
      onOpenChange={(v) => {
        if (!v && !guardando) {
          setContrasena('')
          setError(null)
          onCerrar()
        }
      }}
      ancho="sm"
      titulo="Contraseña nueva"
      descripcion={miembro ? `Para ${miembro.nombre} (${miembro.usuario})` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="primary" loading={guardando} onClick={() => void guardar()}>
            Cambiar contraseña
          </Button>
        </>
      }
    >
      <Field
        label="Contraseña"
        htmlFor="nueva-clave"
        error={error}
        helper={`Al menos ${MIN_CONTRASENA} caracteres. Anotala: después no se puede ver.`}
      >
        <Input
          id="nueva-clave"
          type="text"
          autoFocus
          autoComplete="off"
          invalido={Boolean(error)}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
      </Field>
    </ResponsiveModal>
  )
}
