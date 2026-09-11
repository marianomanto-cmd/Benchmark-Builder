'use client'

import { KeyRound, ShieldCheck, UserPlus, Users } from 'lucide-react'
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
  EmptyState,
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
import {
  MIN_CONTRASENA,
  sugerirContrasena,
  sugerirUsuario,
  validarContrasena,
  validarUsuario,
} from '@/lib/auth/usuarios'
import { cn } from '@/lib/utils'

import { CampoContrasena } from './campo-contrasena'
import { PanelCredenciales } from './credenciales'

/** Lo que se puede mover en el aire antes de que conteste el servidor. */
type Parche = Partial<Pick<MiembroEquipo, 'esAdmin' | 'activo'>>

export function PantallaEquipo({
  equipo,
  usuarioActual,
  profesionalActual,
}: {
  equipo: MiembroEquipo[]
  usuarioActual: string
  /** La ficha de quien está mirando, para no ofrecerle darse de baja. */
  profesionalActual: string | null
}) {
  const router = useRouter()
  const [, empezar] = React.useTransition()

  /**
   * Los switches se mueven en el frame del click y vuelven solos si la
   * escritura falla. Antes estaban atados al dato del servidor: se
   * tocaba «Administra» y la perilla no se movía hasta que volvía el
   * `router.refresh()`, que en una conexión de consultorio son dos
   * segundos mirando algo que parece roto.
   *
   * El parche se descarta en cuanto llega data nueva: la verdad es del
   * servidor, esto sólo tapa la espera.
   */
  const [parches, setParches] = React.useState<Record<string, Parche>>({})
  const [equipoVisto, setEquipoVisto] = React.useState(equipo)
  if (equipoVisto !== equipo) {
    setEquipoVisto(equipo)
    setParches({})
  }

  const filas = React.useMemo(
    () => equipo.map((m) => ({ ...m, ...parches[m.profesionalId] })),
    [equipo, parches],
  )

  /**
   * Administradores que además pueden entrar. Una ficha admin dada de
   * baja —o sin acceso— no puede volver a dar de alta a nadie, así que
   * no cuenta para «tiene que quedar al menos uno».
   */
  const adminesConAcceso = filas.filter((m) => m.esAdmin && m.activo && m.userId).length

  const [alta, setAlta] = React.useState<{ n: number; sugerida: string } | null>(null)
  const [clave, setClave] = React.useState<{
    n: number
    miembro: MiembroEquipo
    sugerida: string
  } | null>(null)
  const [bajaDe, setBajaDe] = React.useState<MiembroEquipo | null>(null)
  const [dandoDeBaja, setDandoDeBaja] = React.useState(false)
  const [dejarDeAdministrar, setDejarDeAdministrar] = React.useState<MiembroEquipo | null>(null)

  const refrescar = React.useCallback(() => empezar(() => router.refresh()), [router])

  function parchar(id: string, parche: Parche) {
    setParches((previos) => ({ ...previos, [id]: { ...previos[id], ...parche } }))
  }

  async function alternarPermiso(m: MiembroEquipo, valor: boolean) {
    parchar(m.profesionalId, { esAdmin: valor })
    const res = await cambiarPermiso({ profesionalId: m.profesionalId, esAdmin: valor })
    if (!res.ok) {
      parchar(m.profesionalId, { esAdmin: m.esAdmin })
      return toast.error(res.error ?? 'No se pudo cambiar el permiso.')
    }
    toast.success(valor ? `${m.nombre} ahora administra.` : `${m.nombre} ya no administra.`)
    refrescar()
  }

  /** Reactivar no pide confirmación: devuelve algo, no lo saca. */
  async function reactivar(m: MiembroEquipo) {
    parchar(m.profesionalId, { activo: true })
    const res = await cambiarActivo(m.profesionalId, true)
    if (!res.ok) {
      parchar(m.profesionalId, { activo: m.activo })
      return toast.error(res.error)
    }
    toast.success(`${m.nombre} vuelve a tener acceso.`)
    refrescar()
  }

  async function confirmarBaja() {
    if (!bajaDe) return
    setDandoDeBaja(true)
    const res = await cambiarActivo(bajaDe.profesionalId, false)
    setDandoDeBaja(false)
    if (!res.ok) return toast.error(res.error)
    parchar(bajaDe.profesionalId, { activo: false })
    toast.success(`${bajaDe.nombre} quedó sin acceso.`)
    setBajaDe(null)
    refrescar()
  }

  function pedirPermiso(m: MiembroEquipo, valor: boolean) {
    // Sacarse el permiso a uno mismo es una puerta de una sola mano:
    // para recuperarlo hace falta otro administrador.
    if (!valor && m.profesionalId === profesionalActual) {
      setDejarDeAdministrar(m)
      return
    }
    void alternarPermiso(m, valor)
  }

  function abrirAlta() {
    setAlta({ n: (alta?.n ?? 0) + 1, sugerida: sugerirContrasena() })
  }

  return (
    <div className="flex flex-col gap-5 animate-enter">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="t-h2">Equipo y accesos</h1>
          <p className="mt-1 t-helper">
            Quién entra a la app y con qué permisos. Las fichas no se borran —viven en
            presupuestos ya emitidos—: se dan de baja, y con eso pierden el acceso.
          </p>
        </div>

        <Button variant="primary" onClick={abrirAlta}>
          <UserPlus aria-hidden />
          Nuevo usuario
        </Button>
      </header>

      {filas.length === 0 ? (
        <EmptyState
          icono={<Users className="size-8 stroke-[1.5]" aria-hidden />}
          titulo="Todavía no hay nadie cargado"
          descripcion="Creá el primer acceso: usuario, contraseña y la ficha del profesional, todo de una."
          acciones={
            <Button variant="primary" size="touch" onClick={abrirAlta}>
              <UserPlus aria-hidden />
              Nuevo usuario
            </Button>
          }
        />
      ) : (
        <>
          <p className="t-helper">
            {filas.length === 1 ? '1 persona' : `${filas.length} personas`} ·{' '}
            {adminesConAcceso === 1 ? '1 administra' : `${adminesConAcceso} administran`}
          </p>

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
                {filas.map((m) => {
                  const soyYo = m.profesionalId === profesionalActual
                  return (
                    <Tr key={m.profesionalId} className={cn(!m.activo && 'opacity-55')}>
                      <Td className="pl-5">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-ink">{m.nombre}</span>
                          {soyYo && <MicroBadge tono="primary">Vos</MicroBadge>}
                          {!m.activo && <MicroBadge tono="warm">De baja</MicroBadge>}
                        </span>
                        {m.especialidad && <span className="block t-helper">{m.especialidad}</span>}
                      </Td>
                      <Td>
                        {m.userId ? (
                          <span className="font-sans text-[13px] text-body">{m.usuario ?? '—'}</span>
                        ) : (
                          <MicroBadge>Sin acceso</MicroBadge>
                        )}
                      </Td>
                      <Td>{m.matricula ?? '—'}</Td>
                      <Td>
                        <PerillaAdmin
                          miembro={m}
                          unico={adminesConAcceso <= 1}
                          onCambiar={(valor) => pedirPermiso(m, valor)}
                        />
                      </Td>
                      <Td className="pr-5">
                        {/* `flex-wrap`: «Contraseña» y «Dar de baja» en
                            una línea son 245px de ancho MÍNIMO para la
                            columna, y a 768 la tabla entera no entraba
                            en su caja —se cortaba la derecha sin barra,
                            que es peor que scrollear—. Envolviendo, el
                            mínimo pasa a ser el botón más ancho. Los dos
                            siguen con texto: dar de baja es destructivo
                            y nunca va como ícono solo. */}
                        <div className="flex flex-wrap justify-end gap-2">
                          <Acciones
                            miembro={m}
                            soyYo={soyYo}
                            onClave={() =>
                              setClave({
                                n: (clave?.n ?? 0) + 1,
                                miembro: m,
                                sugerida: sugerirContrasena(),
                              })
                            }
                            onBaja={() => setBajaDe(m)}
                            onReactivar={() => void reactivar(m)}
                          />
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Tabla>
          </Card>

          {/* Mobile: nunca tabla */}
          <div className="flex flex-col gap-3 md:hidden">
            {filas.map((m) => {
              const soyYo = m.profesionalId === profesionalActual
              return (
                <Card key={m.profesionalId} className={cn('p-4', !m.activo && 'opacity-55')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-sans text-[15px] font-semibold text-ink">
                        {m.nombre}
                      </p>
                      <p className="t-helper">
                        {m.userId ? (m.usuario ?? '—') : 'sin acceso'}
                        {m.matricula && ` · ${m.matricula}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {soyYo && <MicroBadge tono="primary">Vos</MicroBadge>}
                      {!m.activo && <MicroBadge tono="warm">De baja</MicroBadge>}
                      {m.esAdmin && (
                        <MicroBadge tono="primary">
                          <ShieldCheck className="mr-1 size-3" aria-hidden />
                          Admin
                        </MicroBadge>
                      )}
                    </div>
                  </div>

                  {/* `div` y no `label`: el Switch de Radix es un
                      `button`, y un label no activa un botón. Envolverlo
                      prometía un área clickeable que no existía. */}
                  <div className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-input border border-hairline px-3">
                    <span className="font-sans text-[13.5px] text-body">Administra el equipo</span>
                    <PerillaAdmin
                      miembro={m}
                      unico={adminesConAcceso <= 1}
                      onCambiar={(valor) => pedirPermiso(m, valor)}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Acciones
                      miembro={m}
                      soyYo={soyYo}
                      onClave={() =>
                        setClave({
                          n: (clave?.n ?? 0) + 1,
                          miembro: m,
                          sugerida: sugerirContrasena(),
                        })
                      }
                      onBaja={() => setBajaDe(m)}
                      onReactivar={() => void reactivar(m)}
                    />
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Banner tono="info" titulo="Sobre las contraseñas">
        No se pueden ver, sólo reemplazar: quedan guardadas cifradas. Si alguien la olvida, ponele
        una nueva desde acá y pasásela con el botón de copiar. Vos entrás como{' '}
        <strong className="font-semibold">{usuarioActual}</strong>.
      </Banner>

      {alta && (
        <ModalAlta
          key={alta.n}
          sugerida={alta.sugerida}
          onCerrar={() => setAlta(null)}
          onOtro={abrirAlta}
          onCreado={refrescar}
        />
      )}

      {clave && (
        <ModalContrasena
          key={clave.n}
          miembro={clave.miembro}
          sugerida={clave.sugerida}
          onCerrar={() => setClave(null)}
        />
      )}

      {/* Dar de baja saca el acceso: se confirma, y se dice qué pasa y
          qué no. La ficha sigue firmando los presupuestos que ya firmó. */}
      <ResponsiveModal
        open={bajaDe !== null}
        onOpenChange={(v) => !v && !dandoDeBaja && setBajaDe(null)}
        ancho="sm"
        titulo="Dar de baja"
        descripcion={bajaDe ? bajaDe.nombre : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBajaDe(null)} disabled={dandoDeBaja}>
              Cancelar
            </Button>
            <Button variant="danger" loading={dandoDeBaja} onClick={() => void confirmarBaja()}>
              Dar de baja
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2 text-[14px] leading-relaxed text-muted">
          <p>
            {bajaDe?.usuario ? (
              <>
                Deja de entrar a la app con el usuario{' '}
                <strong className="font-semibold text-ink">{bajaDe.usuario}</strong> y sale del
                selector de profesional.
              </>
            ) : (
              <>Sale del selector de profesional. Esta ficha no tiene acceso a la app.</>
            )}
          </p>
          <p>
            Los presupuestos que ya firmó no cambian, y se puede reactivar cuando quieras con la
            misma contraseña.
          </p>
        </div>
      </ResponsiveModal>

      {/* Quitarse el permiso a uno mismo no se deshace solo. */}
      <ResponsiveModal
        open={dejarDeAdministrar !== null}
        onOpenChange={(v) => !v && setDejarDeAdministrar(null)}
        ancho="sm"
        titulo="Dejar de administrar"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDejarDeAdministrar(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const quien = dejarDeAdministrar
                setDejarDeAdministrar(null)
                if (quien) void alternarPermiso(quien, false)
              }}
            >
              Dejar de administrar
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-muted">
          Vas a perder esta pantalla: no vas a poder crear usuarios, cambiar contraseñas ni dar de
          baja. Para recuperarlo va a tener que dártelo otro administrador.
        </p>
      </ResponsiveModal>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Piezas de fila
   ═══════════════════════════════════════════════════════════ */

function PerillaAdmin({
  miembro,
  unico,
  onCambiar,
}: {
  miembro: MiembroEquipo
  unico: boolean
  onCambiar: (valor: boolean) => void
}) {
  // El último administrador con acceso no se puede apagar: el servidor
  // lo rechaza igual, pero decirlo antes ahorra el viaje y la sorpresa.
  const bloqueado = miembro.esAdmin && miembro.activo && Boolean(miembro.userId) && unico

  return (
    <span
      title={
        bloqueado
          ? 'Es el único administrador con acceso. Nombrá a otro antes de sacarle el permiso.'
          : undefined
      }
    >
      <Switch
        checked={miembro.esAdmin}
        disabled={bloqueado}
        aria-label={`${miembro.nombre} administra el equipo`}
        onCheckedChange={onCambiar}
      />
    </span>
  )
}

function Acciones({
  miembro,
  soyYo,
  onClave,
  onBaja,
  onReactivar,
}: {
  miembro: MiembroEquipo
  soyYo: boolean
  onClave: () => void
  onBaja: () => void
  onReactivar: () => void
}) {
  const propia = soyYo && miembro.activo

  return (
    <>
      {miembro.userId && (
        <Button size="sm" variant="secondary" onClick={onClave}>
          <KeyRound aria-hidden />
          Contraseña
        </Button>
      )}
      {/* Darse de baja a uno mismo deja la pantalla a medio camino y sin
          nadie del otro lado: el servidor lo rechaza, así que acá ni se
          ofrece. El `title` va en el envoltorio porque un botón
          deshabilitado no recibe eventos del mouse. */}
      <span title={propia ? 'No podés darte de baja a vos mismo.' : undefined}>
        <Button
          size="sm"
          variant={miembro.activo ? 'danger' : 'secondary'}
          disabled={propia}
          onClick={miembro.activo ? onBaja : onReactivar}
        >
          {miembro.activo ? 'Dar de baja' : 'Reactivar'}
        </Button>
      </span>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   Alta
   ═══════════════════════════════════════════════════════════ */

const ID_FORM_ALTA = 'form-alta-usuario'

function ModalAlta({
  sugerida,
  onCerrar,
  onOtro,
  onCreado,
}: {
  sugerida: string
  onCerrar: () => void
  onOtro: () => void
  onCreado: () => void
}) {
  const [usuario, setUsuario] = React.useState('')
  const [usuarioTocado, setUsuarioTocado] = React.useState(false)
  const [contrasena, setContrasena] = React.useState(sugerida)
  const [nombre, setNombre] = React.useState('')
  const [matricula, setMatricula] = React.useState('')
  const [especialidad, setEspecialidad] = React.useState('')
  const [esAdmin, setEsAdmin] = React.useState(false)
  const [errores, setErrores] = React.useState<{
    nombre?: string
    usuario?: string
    contrasena?: string
  }>({})
  const [error, setError] = React.useState<string | null>(null)
  const [guardando, setGuardando] = React.useState(false)
  const [creado, setCreado] = React.useState<{ usuario: string; contrasena: string } | null>(null)

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (guardando) return

    const nuevos = {
      nombre: nombre.trim() ? undefined : 'El nombre es el que firma los presupuestos.',
      usuario: validarUsuario(usuario) ?? undefined,
      contrasena: validarContrasena(contrasena) ?? undefined,
    }
    setErrores(nuevos)
    if (nuevos.nombre || nuevos.usuario || nuevos.contrasena) return

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

      // No se cierra: la contraseña no se puede volver a ver, así que
      // primero hay que poder copiarla.
      setCreado({ usuario: res.usuario ?? usuario.trim().toLowerCase(), contrasena })
      onCreado()
    } catch {
      setError('No se pudo conectar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (creado) {
    return (
      <ResponsiveModal
        open
        onOpenChange={(v) => !v && onCerrar()}
        ancho="md"
        titulo="Usuario creado"
        descripcion="Pasásela ahora: después no se puede ver."
        footer={
          <>
            <Button variant="ghost" onClick={onOtro}>
              <UserPlus aria-hidden />
              Crear otro
            </Button>
            <Button variant="primary" onClick={onCerrar}>
              Listo
            </Button>
          </>
        }
      >
        <PanelCredenciales
          titulo="Ya puede entrar"
          nombre={nombre.trim()}
          usuario={creado.usuario}
          contrasena={creado.contrasena}
        />
      </ResponsiveModal>
    )
  }

  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => {
        if (!v && !guardando) onCerrar()
      }}
      ancho="md"
      titulo="Nuevo usuario"
      descripcion="Crea el acceso y la ficha del profesional de una sola vez."
      footer={
        <>
          <Button variant="ghost" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          {/* `form` para que ⏎ desde cualquier campo mande, que es como
              se completa un formulario de seis campos sin tocar el mouse. */}
          <Button type="submit" form={ID_FORM_ALTA} variant="primary" loading={guardando}>
            Crear usuario
          </Button>
        </>
      }
    >
      <form id={ID_FORM_ALTA} className="flex flex-col gap-4" onSubmit={guardar} noValidate>
        {error && (
          <Banner tono="warm" titulo="No se pudo crear">
            {error}
          </Banner>
        )}

        <Field
          label="Nombre y apellido"
          htmlFor="eq-nombre"
          requerido
          error={errores.nombre}
          helper="Es el que sale firmando el presupuesto."
        >
          <Input
            id="eq-nombre"
            autoFocus
            placeholder="Álvarez, María"
            invalido={Boolean(errores.nombre)}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              // El usuario se propone solo mientras nadie lo haya
              // escrito a mano: son seis campos y éste sale del anterior.
              if (!usuarioTocado) setUsuario(sugerirUsuario(e.target.value))
            }}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Usuario"
            htmlFor="eq-usuario"
            requerido
            error={errores.usuario}
            helper="Con esto entra. Sin espacios ni acentos."
          >
            <Input
              id="eq-usuario"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="maria"
              invalido={Boolean(errores.usuario)}
              value={usuario}
              onChange={(e) => {
                setUsuarioTocado(true)
                setUsuario(e.target.value)
              }}
            />
          </Field>

          <Field
            label="Contraseña"
            htmlFor="eq-clave"
            requerido
            error={errores.contrasena}
            helper={`Al menos ${MIN_CONTRASENA} caracteres. La copiás al final.`}
          >
            <CampoContrasena
              id="eq-clave"
              valor={contrasena}
              onChange={setContrasena}
              invalido={Boolean(errores.contrasena)}
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
      </form>
    </ResponsiveModal>
  )
}

/* ═══════════════════════════════════════════════════════════
   Contraseña nueva
   ═══════════════════════════════════════════════════════════ */

const ID_FORM_CLAVE = 'form-clave-nueva'

function ModalContrasena({
  miembro,
  sugerida,
  onCerrar,
}: {
  miembro: MiembroEquipo
  sugerida: string
  onCerrar: () => void
}) {
  const [contrasena, setContrasena] = React.useState(sugerida)
  const [error, setError] = React.useState<string | null>(null)
  const [guardando, setGuardando] = React.useState(false)
  const [lista, setLista] = React.useState<string | null>(null)

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (guardando || !miembro.userId) return

    const motivo = validarContrasena(contrasena)
    if (motivo) return setError(motivo)

    setError(null)
    setGuardando(true)
    try {
      const res = await cambiarContrasena({ userId: miembro.userId, contrasena })
      if (!res.ok) return setError(res.error ?? 'No se pudo cambiar.')
      setLista(contrasena)
    } catch {
      setError('No se pudo conectar. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (lista) {
    return (
      <ResponsiveModal
        open
        onOpenChange={(v) => !v && onCerrar()}
        ancho="sm"
        titulo="Contraseña cambiada"
        descripcion="Pasásela ahora: después no se puede ver."
        footer={
          <Button variant="primary" onClick={onCerrar}>
            Listo
          </Button>
        }
      >
        <PanelCredenciales
          titulo="Ya puede entrar con la nueva"
          nombre={miembro.nombre}
          usuario={miembro.usuario ?? ''}
          contrasena={lista}
        />
      </ResponsiveModal>
    )
  }

  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => {
        if (!v && !guardando) onCerrar()
      }}
      ancho="sm"
      titulo="Contraseña nueva"
      descripcion={`Para ${miembro.nombre} (${miembro.usuario ?? 'sin usuario'})`}
      footer={
        <>
          <Button variant="ghost" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" form={ID_FORM_CLAVE} variant="primary" loading={guardando}>
            Cambiar contraseña
          </Button>
        </>
      }
    >
      <form id={ID_FORM_CLAVE} onSubmit={guardar} noValidate>
        <Field
          label="Contraseña"
          htmlFor="nueva-clave"
          error={error}
          helper={`Al menos ${MIN_CONTRASENA} caracteres. La copiás en el paso siguiente.`}
        >
          <CampoContrasena
            id="nueva-clave"
            valor={contrasena}
            onChange={setContrasena}
            invalido={Boolean(error)}
            autoFocus
          />
        </Field>
      </form>
    </ResponsiveModal>
  )
}
