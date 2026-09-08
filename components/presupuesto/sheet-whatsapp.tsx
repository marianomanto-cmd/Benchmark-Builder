'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Download, MessageCircle, Paperclip, Phone, TriangleAlert } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import {
  Button,
  Field,
  Input,
  Monto,
  ResponsiveModal,
  Segmented,
  Skeleton,
  Switch,
  Textarea,
} from '@/components/ui'
import {
  guardarTelefonoPaciente,
  obtenerLinkPdf,
  registrarEnvioWhatsapp,
} from '@/app/actions/seguimiento'
import { fechaLarga, telefonoWhatsApp, vigenciaTexto } from '@/lib/formato'
import { createClient } from '@/lib/supabase/client'
import type { EstadoPresupuesto } from '@/lib/types'
import {
  armarMensaje,
  conLinkPdf,
  descripcionEnvio,
  linkWhatsApp,
  nombreArchivoPdf,
  PLANTILLAS,
  type PlantillaWhatsApp,
} from '@/lib/whatsapp'

import { monto, texto, textoOpcional, type FilaCruda } from './tipos'

/* ═══════════════════════════════════════════════════════════
   Pantalla 14 · Enviar por WhatsApp
   ═══════════════════════════════════════════════════════════ */

/**
 * El sheet se trae sus propios datos: la home lo abriría desde una fila
 * que no tiene el teléfono ni el total completos, y el detalle no
 * debería tener que pasárselos. Con el `presupuestoId` alcanza.
 */
interface DatosEnvio {
  id: string
  numero: string
  estado: EstadoPresupuesto
  pacienteId: string
  pacienteNombre: string
  /** El de la ficha si está; si no, el que quedó en el snapshot. */
  telefono: string | null
  tieneWhatsapp: boolean
  montoACargo: number
  validoHasta: string
  profesionalNombre: string
  profesionalMatricula: string | null
  esDuplicado: boolean
  /** Si ya se mandó alguna vez, según el historial append-only. */
  yaSeEnvio: boolean
}

const CONSULTORIO = process.env.NEXT_PUBLIC_CONSULTORIO_NOMBRE ?? null

async function traerDatos(presupuestoId: string): Promise<DatosEnvio | null> {
  const supabase = createClient()
  const [{ data, error }, envios] = await Promise.all([
    supabase
      .from('presupuestos')
      .select(
        'id, numero, estado, paciente_id, paciente_nombre, paciente_telefono, total_a_cargo, valido_hasta, profesional_nombre, profesional_matricula, duplicado_de, paciente:pacientes(telefono, tiene_whatsapp)',
      )
      .eq('id', presupuestoId)
      .maybeSingle(),
    // El estado no alcanza para saber si es el primer envío: el wizard
    // guarda como «Enviado» y recién después abre este sheet. Lo que sí
    // lo sabe es el historial, que es append-only.
    supabase
      .from('presupuesto_eventos')
      .select('id', { count: 'exact', head: true })
      .eq('presupuesto_id', presupuestoId)
      .eq('tipo', 'enviado_whatsapp'),
  ])

  if (error) throw new Error(error.message)
  if (!data) return null

  const fila = data as unknown as FilaCruda
  // El embed llega como objeto o como array de uno según la versión del
  // cliente; se normaliza acá y no en cada uso.
  const embed = fila.paciente
  const ficha = (Array.isArray(embed) ? embed[0] : embed) as FilaCruda | null | undefined

  return {
    id: texto(fila.id),
    numero: texto(fila.numero),
    estado: fila.estado as EstadoPresupuesto,
    pacienteId: texto(fila.paciente_id),
    pacienteNombre: texto(fila.paciente_nombre),
    // La ficha manda: el snapshot del documento congela precios, no
    // datos de contacto. Si el paciente cambió de número, se usa el nuevo.
    telefono: textoOpcional(ficha?.telefono) ?? textoOpcional(fila.paciente_telefono),
    tieneWhatsapp: ficha?.tiene_whatsapp == null ? true : Boolean(ficha.tiene_whatsapp),
    montoACargo: monto(fila.total_a_cargo),
    validoHasta: texto(fila.valido_hasta),
    profesionalNombre: texto(fila.profesional_nombre),
    profesionalMatricula: textoOpcional(fila.profesional_matricula),
    esDuplicado: textoOpcional(fila.duplicado_de) !== null,
    yaSeEnvio: (envios.count ?? 0) > 0,
  }
}

/** Plantilla que conviene según dónde está parado el presupuesto. */
function plantillaSugerida(datos: DatosEnvio): PlantillaWhatsApp {
  if (datos.esDuplicado) return 'actualizacion'
  // Sólo es recordatorio si de verdad ya se mandó una vez. Mirar el
  // estado no alcanza: «Guardar y enviar por WhatsApp» deja el
  // presupuesto en `enviado` y recién ahí abre este sheet, así que el
  // primer envío llegaba acá proponiendo un recordatorio.
  if (datos.yaSeEnvio) return 'recordatorio'
  return 'primer_envio'
}

export function SheetWhatsApp({
  presupuestoId,
  open,
  onOpenChange,
}: {
  presupuestoId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()

  const consulta = useQuery({
    queryKey: ['presupuesto-envio', presupuestoId],
    queryFn: () => traerDatos(presupuestoId),
    enabled: open,
  })

  const datos = consulta.data ?? null

  const [plantilla, setPlantilla] = React.useState<PlantillaWhatsApp>('primer_envio')
  const [mensaje, setMensaje] = React.useState('')
  const [editado, setEditado] = React.useState(false)
  const [adjuntar, setAdjuntar] = React.useState(true)
  const [marcarEnviado, setMarcarEnviado] = React.useState(true)
  const [telefonoNuevo, setTelefonoNuevo] = React.useState('')
  const [paso, setPaso] = React.useState<'redactar' | 'enviado'>('redactar')
  const [enviando, setEnviando] = React.useState(false)
  const [registrado, setRegistrado] = React.useState(true)

  /**
   * El PDF se pide apenas se abre el sheet, no al tocar "Enviar".
   *
   * `navigator.share()` necesita activación reciente del usuario: si
   * entre el clic y la llamada hay un `await fetch` de varios segundos,
   * Safari descarta el share sin decir nada. Teniendo el archivo listo,
   * el handler dispara el share en el mismo gesto.
   */
  const pdf = useQuery({
    queryKey: ['presupuesto-pdf', presupuestoId],
    enabled: open && adjuntar,
    staleTime: Infinity,
    retry: 0,
    queryFn: async () => {
      const res = await fetch(`/api/presupuestos/${presupuestoId}/pdf`)
      if (!res.ok) throw new Error('No se pudo generar el PDF')
      return res.blob()
    },
  })

  /**
   * Link firmado al PDF cacheado en Storage. Es el plan B: cuando el
   * navegador no puede compartir archivos, el paciente recibe el texto
   * con un enlace en vez del adjunto.
   */
  const link = useQuery({
    queryKey: ['presupuesto-pdf-link', presupuestoId],
    enabled: open && adjuntar && pdf.isSuccess,
    staleTime: 1000 * 60 * 30,
    retry: 0,
    queryFn: async () => {
      const res = await obtenerLinkPdf(presupuestoId)
      return res.ok ? res.url : null
    },
  })

  /**
   * Se arma el borrador una sola vez por apertura.
   *
   * El `ref` no es un detalle: después de mandar se invalida la consulta
   * para traer el estado nuevo, y sin la guarda ese dato fresco
   * reiniciaría el sheet y se llevaría puesta la pantalla de
   * confirmación que el usuario está leyendo.
   */
  const inicializado = React.useRef(false)

  React.useEffect(() => {
    if (!open) {
      inicializado.current = false
      return
    }
    if (inicializado.current || !datos) return
    inicializado.current = true

    setPaso('redactar')
    setEditado(false)
    setRegistrado(true)
    const sugerida = plantillaSugerida(datos)
    setPlantilla(sugerida)
    setMensaje(
      armarMensaje(sugerida, {
        pacienteNombre: datos.pacienteNombre,
        numero: datos.numero,
        montoACargo: datos.montoACargo,
        validoHasta: datos.validoHasta,
        profesionalNombre: datos.profesionalNombre,
        profesionalMatricula: datos.profesionalMatricula,
        consultorio: CONSULTORIO,
      }),
    )
  }, [open, datos])

  function elegirPlantilla(nueva: PlantillaWhatsApp) {
    if (!datos) return
    if (
      editado &&
      !window.confirm('Cambiar de plantilla reemplaza lo que escribiste. ¿Seguimos?')
    ) {
      return
    }
    setPlantilla(nueva)
    setEditado(false)
    setMensaje(
      armarMensaje(nueva, {
        pacienteNombre: datos.pacienteNombre,
        numero: datos.numero,
        montoACargo: datos.montoACargo,
        validoHasta: datos.validoHasta,
        profesionalNombre: datos.profesionalNombre,
        profesionalMatricula: datos.profesionalMatricula,
        consultorio: CONSULTORIO,
      }),
    )
  }

  const guardarTelefono = useMutation({
    mutationFn: async () => {
      if (!datos) throw new Error('Sin datos del presupuesto')
      const res = await guardarTelefonoPaciente(datos.pacienteId, telefonoNuevo)
      if (!res.ok) throw new Error(res.error)
      return res.telefono
    },
    onSuccess: (telefono) => {
      toast.success(`Guardamos ${telefono} en la ficha del paciente.`)
      setTelefonoNuevo('')
      queryClient.invalidateQueries({ queryKey: ['presupuesto-envio', presupuestoId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const hayTelefono = telefonoWhatsApp(datos?.telefono) !== null

  async function enviar() {
    if (!datos) return
    setEnviando(true)

    const blob = adjuntar ? (pdf.data ?? null) : null
    const archivo = blob
      ? new File([blob], nombreArchivoPdf(datos.numero), { type: 'application/pdf' })
      : null
    // Con el adjunto apagado, el link tampoco viaja: la consulta puede
    // tener un valor cacheado de cuando el toggle estaba prendido.
    const urlPdf = adjuntar ? (link.data ?? null) : null

    const puedeCompartirArchivo =
      archivo !== null &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      Boolean(navigator.canShare?.({ files: [archivo] }))

    /**
     * El share va PRIMERO y sin `await` previo.
     *
     * Tanto `navigator.share()` como `window.open()` exigen activación
     * reciente del usuario: si antes se espera un viaje al servidor, el
     * navegador descarta la llamada sin avisar. Por eso el PDF se
     * precarga al abrir el sheet y el registro del envío queda para
     * después de disparar.
     */
    let disparado = false

    if (puedeCompartirArchivo && archivo) {
      // Sin `await`: el sheet no espera a que WhatsApp devuelva nada.
      // Un `AbortError` sólo significa que el usuario cerró el selector.
      navigator.share({ files: [archivo], text: mensaje }).catch(() => {})
      disparado = true
    } else {
      const url = linkWhatsApp(datos.telefono, conLinkPdf(mensaje, urlPdf))
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
        disparado = true
      }
    }

    if (!disparado) {
      toast.error('Falta el teléfono del paciente para abrir WhatsApp.')
      setEnviando(false)
      return
    }

    /**
     * DECISIÓN DELIBERADA: el estado se marca al **disparar** el envío,
     * no cuando el usuario vuelve de WhatsApp.
     *
     * Ni `navigator.share()` ni `wa.me` devuelven si el mensaje se mandó
     * de verdad: `share()` resuelve igual cuando el usuario elige la app
     * y cancela adentro, y la pestaña de `wa.me` no informa nada. Pedir
     * una confirmación después sería inventar un dato. Registramos el
     * intento —que sí ocurrió— y el consultorio corrige el estado a mano
     * si el envío se cayó.
     */
    const registro = await registrarEnvioWhatsapp(
      datos.id,
      marcarEnviado,
      descripcionEnvio(plantilla, archivo !== null || urlPdf !== null),
    )

    // El mensaje ya salió: si el registro falla no se puede deshacer
    // nada, así que se avisa y la confirmación lo dice sin mentir.
    setRegistrado(registro.ok)
    if (!registro.ok) toast.error(registro.error)

    setEnviando(false)
    setPaso('enviado')
    queryClient.invalidateQueries({ queryKey: ['presupuesto-envio', presupuestoId] })
  }

  /* ── Contenido ─────────────────────────────────────────── */

  let cuerpo: React.ReactNode
  let footer: React.ReactNode

  if (consulta.isPending) {
    cuerpo = (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
    footer = null
  } else if (consulta.isError || !datos) {
    cuerpo = (
      <p className="text-[14px] text-warm-ink">
        No se pudieron traer los datos del presupuesto. Cerrá el envío y volvé a intentar en un
        rato.
      </p>
    )
    footer = (
      <Button variant="secondary" full onClick={() => onOpenChange(false)}>
        Cerrar
      </Button>
    )
  } else if (paso === 'enviado') {
    cuerpo = (
      <div className="flex flex-col gap-4">
        <div
          className={
            registrado
              ? 'flex items-start gap-3 rounded-card border border-primary/20 bg-tint p-4'
              : 'flex items-start gap-3 rounded-card border border-warm-line/25 bg-warm-soft p-4'
          }
        >
          {registrado ? (
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          ) : (
            <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warm-line" />
          )}
          <div className="min-w-0">
            <p
              className={
                registrado
                  ? 'font-sans text-[13.5px] font-semibold text-ink'
                  : 'font-sans text-[13.5px] font-semibold text-warm-ink'
              }
            >
              Se abrió WhatsApp con el mensaje
            </p>
            <p
              className={
                registrado
                  ? 'mt-1 text-[13px] leading-relaxed text-body'
                  : 'mt-1 text-[13px] leading-relaxed text-warm-ink/85'
              }
            >
              {registrado
                ? `${registroTexto(marcarEnviado)} Quedó anotado en el historial del ${datos.numero} con tu nombre y la fecha.`
                : `El envío no se pudo anotar en el historial del ${datos.numero}. Si el mensaje salió, cambiá el estado a mano desde el detalle.`}
            </p>
          </div>
        </div>

        <div className="rounded-card border border-hairline bg-card p-4">
          <p className="font-sans text-[13.5px] font-semibold text-ink">
            Si no contesta, te lo recordamos
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-body">
            A los 7 días sin respuesta el presupuesto pasa solo a <strong>Pendiente</strong> y
            aparece marcado en la home, para que sepas a quién volver a escribirle. No tenés que
            acordarte vos.
          </p>
          <p className="t-helper mt-2">
            {datos.validoHasta ? `Los valores ${vigenciaTexto(datos.validoHasta)}.` : null}
          </p>
        </div>
      </div>
    )
    footer = (
      <>
        <Button variant="ghost" onClick={() => setPaso('redactar')}>
          Volver al mensaje
        </Button>
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Listo
        </Button>
      </>
    )
  } else {
    const plantillaActual = PLANTILLAS.find((p) => p.id === plantilla)

    cuerpo = (
      <div className="flex flex-col gap-5">
        {/* Resumen de lo que se manda */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-card bg-tint px-4 py-3">
          <div className="min-w-0">
            <p className="t-label">A cargo del paciente</p>
            <p className="mt-0.5 text-[13px] text-body">
              {datos.pacienteNombre} · {datos.numero}
            </p>
          </div>
          <Monto valor={datos.montoACargo} jerarquia="fuerte" className="text-[20px]" />
        </div>

        {/* Plantillas */}
        <Field label="Plantilla" helper={plantillaActual?.cuando}>
          <div className="overflow-x-auto no-scrollbar">
            <Segmented
              value={plantilla}
              onChange={elegirPlantilla}
              opciones={PLANTILLAS.map((p) => ({ value: p.id, label: p.etiqueta }))}
            />
          </div>
        </Field>

        {/* Mensaje editable */}
        <Field
          label="Mensaje"
          htmlFor="mensaje-whatsapp"
          helper={
            datos.validoHasta
              ? `El presupuesto ${vigenciaTexto(datos.validoHasta)} (${fechaLarga(datos.validoHasta)}).`
              : undefined
          }
        >
          <Textarea
            id="mensaje-whatsapp"
            value={mensaje}
            onChange={(e) => {
              setMensaje(e.target.value)
              setEditado(true)
            }}
            rows={10}
            className="min-h-[210px] text-[13.5px]"
          />
        </Field>

        {/* Opciones */}
        <div className="flex flex-col divide-y divide-hairline rounded-card border border-hairline">
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <span className="flex min-w-0 items-start gap-2.5">
              <Paperclip aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="block font-sans text-[13.5px] font-medium text-ink">
                  Adjuntar el PDF
                </span>
                <span className="t-helper block">{textoAdjunto(adjuntar, pdf, link)}</span>
              </span>
            </span>
            <Switch checked={adjuntar} onCheckedChange={setAdjuntar} />
          </label>

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <span className="flex min-w-0 items-start gap-2.5">
              <MessageCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="block font-sans text-[13.5px] font-medium text-ink">
                  Marcar como enviado
                </span>
                <span className="t-helper block">
                  {datos.estado === 'borrador' || datos.estado === 'realizado'
                    ? 'Pasa el presupuesto a Enviado y empieza a contar los 7 días.'
                    : 'Ya está en seguimiento: el envío se anota, pero el estado no retrocede.'}
                </span>
              </span>
            </span>
            <Switch checked={marcarEnviado} onCheckedChange={setMarcarEnviado} />
          </label>
        </div>

        {/* Paciente sin teléfono: se carga acá mismo */}
        {!hayTelefono && (
          <div className="flex flex-col gap-3 rounded-card border border-warm-line/25 bg-warm-soft p-4">
            <div className="flex items-start gap-2.5">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warm-line" />
              <div className="min-w-0">
                <p className="font-sans text-[13.5px] font-semibold text-warm-ink">
                  {datos.pacienteNombre} no tiene teléfono cargado
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-warm-ink/85">
                  Cargalo acá y queda en la ficha para la próxima. Si no lo tenés a mano, podés
                  bajar el PDF y mandarlo por otro lado.
                </p>
              </div>
            </div>

            <Field label="Teléfono" htmlFor="telefono-paciente">
              <div className="flex gap-2">
                <Input
                  id="telefono-paciente"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="351 555-1234"
                  value={telefonoNuevo}
                  onChange={(e) => setTelefonoNuevo(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => guardarTelefono.mutate()}
                  loading={guardarTelefono.isPending}
                  disabled={telefonoNuevo.replace(/\D/g, '').length < 8}
                >
                  <Phone aria-hidden />
                  Guardar
                </Button>
              </div>
            </Field>
          </div>
        )}

        {hayTelefono && !datos.tieneWhatsapp && (
          <p className="t-helper">
            En la ficha figura que este teléfono no tiene WhatsApp. Si igual querés probar, mandalo;
            si no, bajá el PDF.
          </p>
        )}
      </div>
    )

    footer = (
      <>
        <Button asChild variant="ghost">
          <a href={`/api/presupuestos/${presupuestoId}/pdf`} target="_blank" rel="noopener noreferrer">
            <Download aria-hidden />
            Solo descargar PDF
          </a>
        </Button>
        <Button
          variant="primary"
          onClick={enviar}
          loading={enviando}
          disabled={!hayTelefono || mensaje.trim().length === 0}
        >
          <MessageCircle aria-hidden />
          Enviar por WhatsApp
        </Button>
      </>
    )
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      ancho="md"
      titulo="Enviar por WhatsApp"
      descripcion="Revisá el mensaje antes de mandarlo: se puede editar."
      footer={footer}
    >
      {cuerpo}
    </ResponsiveModal>
  )
}

/* ── Textos auxiliares ───────────────────────────────────── */

function registroTexto(marcado: boolean): string {
  return marcado
    ? 'Registramos el envío y el presupuesto quedó como Enviado.'
    : 'Registramos el envío sin tocar el estado.'
}

function textoAdjunto(
  adjuntar: boolean,
  pdf: { isPending: boolean; isError: boolean; isSuccess: boolean },
  link: { data?: string | null },
): string {
  if (!adjuntar) return 'Se manda sólo el texto, sin el documento.'
  if (pdf.isPending) return 'Preparando el PDF…'
  if (pdf.isError) return 'El PDF no se pudo preparar: se va a mandar sólo el texto.'
  if (pdf.isSuccess && link.data) {
    return 'Se adjunta si el teléfono lo permite; si no, va como link.'
  }
  return 'Se adjunta si el teléfono lo permite.'
}
