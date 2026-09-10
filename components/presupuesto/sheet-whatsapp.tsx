'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Download,
  Eye,
  MessageCircle,
  Paperclip,
  Pencil,
  Phone,
  RotateCw,
  TriangleAlert,
} from 'lucide-react'
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
import { datosConsultorio } from '@/lib/pdf/consultorio'
import { fechaLarga, nombreDePila, telefonoWhatsApp, vigenciaTexto } from '@/lib/formato'
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

import { AvisoLinkPendiente, VistaPreviaWhatsApp } from './vista-previa-whatsapp'
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
  /** Si la obra social cubrió algo: define cómo se redacta el mensaje. */
  hayCobertura: boolean
  validoHasta: string
  profesionalNombre: string
  profesionalMatricula: string | null
  esDuplicado: boolean
  /** Si ya se mandó alguna vez, según el historial append-only. */
  yaSeEnvio: boolean
}

/**
 * Por dónde va a salir el mensaje. Se decide ANTES de mandar porque de
 * eso depende lo que el paciente recibe —y por lo tanto lo que la vista
 * previa tiene que mostrar—:
 *
 *  - `adjunto`   el teléfono puede compartir archivos: va el PDF de verdad.
 *  - `chat`      se abre el chat del paciente en wa.me, con el link al PDF.
 *  - `compartir` sin teléfono, pero el equipo puede elegir el contacto.
 *  - `ninguna`   no hay por dónde: falta el teléfono y no hay para compartir.
 */
type Via = 'adjunto' | 'chat' | 'compartir' | 'ninguna'

const CONSULTORIO = datosConsultorio().nombre

async function traerDatos(presupuestoId: string): Promise<DatosEnvio | null> {
  const supabase = createClient()
  const [{ data, error }, envios] = await Promise.all([
    supabase
      .from('presupuestos')
      .select(
        'id, numero, estado, paciente_id, paciente_nombre, paciente_telefono, total_a_cargo, total_cobertura, valido_hasta, profesional_nombre, profesional_matricula, duplicado_de, paciente:pacientes(telefono, tiene_whatsapp)',
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
    // Por el monto y no por la obra social: un presupuesto con obra
    // social que no cubrió nada tampoco tiene «cobertura descontada».
    hayCobertura: monto(fila.total_cobertura) > 0,
    validoHasta: texto(fila.valido_hasta),
    profesionalNombre: texto(fila.profesional_nombre),
    profesionalMatricula: textoOpcional(fila.profesional_matricula),
    esDuplicado: textoOpcional(fila.duplicado_de) !== null,
    yaSeEnvio: (envios.count ?? 0) > 0,
  }
}

/**
 * Plantilla que conviene según dónde está parado el presupuesto.
 *
 * El historial manda por encima de todo lo demás: si YA se le mandó
 * este mismo documento, lo que corresponde es un recordatorio. Un
 * duplicado que ya se envió una vez volvía a proponer «te paso el
 * presupuesto con los valores de hoy: reemplaza al anterior», que es
 * exactamente el mensaje que el paciente ya había recibido.
 */
function plantillaSugerida(datos: DatosEnvio): PlantillaWhatsApp {
  if (datos.yaSeEnvio) return 'recordatorio'
  if (datos.esDuplicado) return 'actualizacion'
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
  const [editando, setEditando] = React.useState(false)
  const [adjuntar, setAdjuntar] = React.useState(true)
  const [marcarEnviado, setMarcarEnviado] = React.useState(true)
  const [telefonoNuevo, setTelefonoNuevo] = React.useState('')
  const [paso, setPaso] = React.useState<'redactar' | 'enviado'>('redactar')
  const [enviando, setEnviando] = React.useState(false)
  const [registrado, setRegistrado] = React.useState(true)
  /** Por dónde salió, para que la confirmación cuente lo que pasó. */
  const [viaUsada, setViaUsada] = React.useState<Via>('chat')
  /** Lo que quedó a medias, si algo quedó a medias. */
  const [avisoEnvio, setAvisoEnvio] = React.useState<string | null>(null)
  /**
   * Si el estado se movió DE VERDAD, según lo que devolvió el servidor.
   *
   * No alcanza con el toggle: `registrarEnvioWhatsapp` sólo pasa a
   * `enviado` cuando el presupuesto venía de `borrador` o `realizado`.
   * Uno que ya estaba en `interesado` o `aceptado` no se pisa —
   * volverlo a `enviado` sería perder seguimiento— y la confirmación
   * tiene que decir lo que pasó, no lo que se pidió.
   */
  const [estadoCambiado, setEstadoCambiado] = React.useState(false)

  /**
   * ¿El navegador puede compartir? Se lee con `useSyncExternalStore`:
   * en el servidor no hay `navigator`, y setear estado dentro de un
   * efecto dispara los renders en cascada que React 19 desaconseja.
   */
  const soporteShare = React.useSyncExternalStore(SIN_CAMBIOS, hayShare, () => false)

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
    setEditando(false)
    setRegistrado(true)
    const sugerida = plantillaSugerida(datos)
    setPlantilla(sugerida)
    setMensaje(
      armarMensaje(sugerida, {
        pacienteNombre: datos.pacienteNombre,
        numero: datos.numero,
        montoACargo: datos.montoACargo,
        hayCobertura: datos.hayCobertura,
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
        hayCobertura: datos.hayCobertura,
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

  /* ── Qué recibe el paciente ─────────────────────────────── */

  // Con el adjunto apagado, el link tampoco viaja: la consulta puede
  // tener un valor cacheado de cuando el toggle estaba prendido.
  const urlPdf = adjuntar ? (link.data ?? null) : null

  const archivo = React.useMemo(() => {
    if (!adjuntar || !pdf.data || !datos) return null
    return new File([pdf.data], nombreArchivoPdf(datos.numero), { type: 'application/pdf' })
  }, [adjuntar, pdf.data, datos])

  const puedeCompartirArchivo = React.useMemo(() => {
    if (!soporteShare || !archivo || typeof navigator === 'undefined') return false
    return Boolean(navigator.canShare?.({ files: [archivo] }))
  }, [soporteShare, archivo])

  const via: Via = puedeCompartirArchivo
    ? 'adjunto'
    : hayTelefono
      ? 'chat'
      : soporteShare
        ? 'compartir'
        : 'ninguna'

  // Lo que se manda de verdad: con el adjunto real no hace falta el
  // link, sin él el link es lo único que lleva al PDF.
  const textoConLink = conLinkPdf(mensaje, urlPdf)
  const textoQueLlega = via === 'adjunto' ? mensaje : textoConLink
  // «Todavía viene» sólo mientras de verdad viene: si la firma del link
  // falló, `link` resuelve en `null` y el aviso quedaba prometiendo un
  // link que no iba a llegar nunca.
  const preparandoPdf = adjuntar && !pdf.isError && (pdf.isPending || link.isPending)
  const linkEnCamino = via !== 'adjunto' && !urlPdf && preparandoPdf

  async function enviar() {
    if (!datos) return
    setEnviando(true)

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
    let conPdf = false
    let viaFinal: Via = via

    // 1 · El PDF de verdad, si el teléfono puede compartir archivos.
    if (via === 'adjunto' && archivo && compartir({ files: [archivo], text: mensaje })) {
      disparado = true
      conPdf = true
    }

    // 2 · El chat del paciente. También es la red de abajo si el share
    //     se cayó: `navigator.share` puede tirar sincrónicamente.
    let bloqueoDeVentana = false
    if (!disparado && hayTelefono) {
      const url = linkWhatsApp(datos.telefono, textoConLink)
      if (url) {
        const ventana = window.open(url, '_blank', 'noopener,noreferrer')
        if (ventana) {
          disparado = true
          conPdf = urlPdf !== null
          viaFinal = 'chat'
        } else {
          bloqueoDeVentana = true
        }
      }
    }

    // 3 · Sin teléfono: que elija el contacto desde el selector.
    if (!disparado && soporteShare && compartir({ text: textoConLink })) {
      disparado = true
      conPdf = urlPdf !== null
      viaFinal = 'compartir'
    }

    if (!disparado) {
      toast.error(
        bloqueoDeVentana
          ? 'El navegador bloqueó la ventana de WhatsApp. Permití las ventanas emergentes para este sitio y probá de nuevo.'
          : 'Falta el teléfono del paciente para abrir WhatsApp.',
      )
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
      // Lo que dice el historial tiene que ser lo que salió: antes
      // anunciaba "con el PDF adjunto" por el sólo hecho de tener el
      // archivo preparado, aunque el mensaje hubiera salido pelado.
      descripcionEnvio(plantilla, conPdf ? (viaFinal === 'adjunto' ? 'adjunto' : 'link') : 'sin'),
    )

    // El mensaje ya salió: si el registro falla no se puede deshacer
    // nada, así que se avisa y la confirmación lo dice sin mentir.
    if (registro.ok) {
      setRegistrado(true)
      setEstadoCambiado(registro.estado === 'enviado')
      setAvisoEnvio(registro.aviso ?? null)
      if (registro.aviso) toast.error(registro.aviso)
    } else {
      setRegistrado(false)
      setEstadoCambiado(false)
      setAvisoEnvio(null)
      toast.error(registro.error)
    }

    setViaUsada(viaFinal)
    setEnviando(false)
    setPaso('enviado')
    queryClient.invalidateQueries({ queryKey: ['presupuesto-envio', presupuestoId] })
  }

  /* ── Contenido ─────────────────────────────────────────── */

  let cuerpo: React.ReactNode
  let footer: React.ReactNode

  if (consulta.isPending) {
    // El esqueleto calca el layout: resumen, plantillas, mensaje y las
    // dos opciones. Así no salta nada cuando llegan los datos.
    cuerpo = (
      <div className="flex flex-col gap-5" aria-busy="true">
        <Skeleton className="h-[68px] w-full rounded-card" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-11 w-full rounded-pill" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-[168px] w-full rounded-card" />
        </div>
        <Skeleton className="h-[132px] w-full rounded-card" />
      </div>
    )
    footer = null
  } else if (consulta.isError || !datos) {
    cuerpo = (
      <div className="flex flex-col gap-3">
        <p className="text-[14px] leading-relaxed text-warm-ink">
          No se pudieron traer los datos del presupuesto. Suele ser la conexión: probá de nuevo.
        </p>
        <div>
          <Button variant="secondary" onClick={() => consulta.refetch()} loading={consulta.isFetching}>
            <RotateCw aria-hidden />
            Reintentar
          </Button>
        </div>
      </div>
    )
    footer = (
      <Button variant="ghost" full onClick={() => onOpenChange(false)}>
        Cerrar
      </Button>
    )
  } else if (paso === 'enviado') {
    const todoOk = registrado && !avisoEnvio

    cuerpo = (
      <div className="flex flex-col gap-4">
        <div
          className={
            todoOk
              ? 'flex items-start gap-3 rounded-card border border-primary/20 bg-tint p-4'
              : 'flex items-start gap-3 rounded-card border border-warm-line/25 bg-warm-soft p-4'
          }
        >
          {todoOk ? (
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          ) : (
            <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warm-line" />
          )}
          <div className="min-w-0">
            <p
              className={
                todoOk
                  ? 'font-sans text-[13.5px] font-semibold text-ink'
                  : 'font-sans text-[13.5px] font-semibold text-warm-ink'
              }
            >
              {tituloEnvio(viaUsada)}
            </p>
            <p
              className={
                todoOk
                  ? 'mt-1 text-[13px] leading-relaxed text-body'
                  : 'mt-1 text-[13px] leading-relaxed text-warm-ink/85'
              }
            >
              {!registrado
                ? `El envío no se pudo anotar en el historial del ${datos.numero}. Si el mensaje salió, cambiá el estado a mano desde el detalle.`
                : avisoEnvio
                  ? `${avisoEnvio} Si el mensaje salió, movelo a mano desde el detalle.`
                  : `${registroTexto(estadoCambiado)} Quedó anotado en el historial del ${datos.numero} con tu nombre y la fecha.`}
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

        {/* Mensaje: primero como le llega, y a un toque para editarlo.
            En un teléfono un textarea de 210px se come la pantalla y
            deja el pie fuera de la vista apenas sube el teclado. */}
        <Field
          label="Mensaje"
          htmlFor={editando ? 'mensaje-whatsapp' : undefined}
          helper={
            datos.validoHasta
              ? `El presupuesto ${vigenciaTexto(datos.validoHasta)} (${fechaLarga(datos.validoHasta)}).`
              : undefined
          }
        >
          {editando ? (
            <>
              <Textarea
                id="mensaje-whatsapp"
                value={mensaje}
                onChange={(e) => {
                  setMensaje(e.target.value)
                  setEditado(true)
                }}
                rows={9}
                autoFocus
                className="min-h-[190px] text-[13.5px]"
              />
              <div className="mt-2">
                <Button variant="ghost" size="touch" className="md:h-[34px]" onClick={() => setEditando(false)}>
                  <Eye aria-hidden />
                  Ver cómo le llega
                </Button>
              </div>
            </>
          ) : (
            <>
              <VistaPreviaWhatsApp
                texto={textoQueLlega}
                archivo={via === 'adjunto' && archivo ? archivo.name : null}
                peso={pdf.data?.size ?? null}
                destinatario={nombreDePila(datos.pacienteNombre)}
              />
              {linkEnCamino && <AvisoLinkPendiente />}
              <div className="mt-2">
                <Button variant="ghost" size="touch" className="md:h-[34px]" onClick={() => setEditando(true)}>
                  <Pencil aria-hidden />
                  Editar el mensaje
                </Button>
              </div>
            </>
          )}
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
                <span className="t-helper block">{textoAdjunto(adjuntar, pdf, link, via)}</span>
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
          <form
            className="flex flex-col gap-3 rounded-card border border-warm-line/25 bg-warm-soft p-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (telefonoNuevo.replace(/\D/g, '').length >= 8) guardarTelefono.mutate()
            }}
          >
            <div className="flex items-start gap-2.5">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warm-line" />
              <div className="min-w-0">
                <p className="font-sans text-[13.5px] font-semibold text-warm-ink">
                  {datos.pacienteNombre} no tiene teléfono cargado
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-warm-ink/85">
                  {via === 'compartir'
                    ? 'Cargalo acá y queda en la ficha para la próxima. Mientras tanto podés mandarlo eligiendo el contacto desde WhatsApp, o bajar el PDF.'
                    : 'Cargalo acá y queda en la ficha para la próxima. Si no lo tenés a mano, podés bajar el PDF y mandarlo por otro lado.'}
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
                  enterKeyHint="done"
                  placeholder="351 555-1234"
                  value={telefonoNuevo}
                  onChange={(e) => setTelefonoNuevo(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  loading={guardarTelefono.isPending}
                  disabled={telefonoNuevo.replace(/\D/g, '').length < 8}
                >
                  <Phone aria-hidden />
                  Guardar
                </Button>
              </div>
            </Field>
          </form>
        )}

        {hayTelefono && !datos.tieneWhatsapp && (
          <p className="t-helper">
            En la ficha figura que este teléfono no tiene WhatsApp. Si igual querés probar, mandalo;
            si no, bajá el PDF.
          </p>
        )}
      </div>
    )

    const bloqueado = via === 'ninguna' || mensaje.trim().length === 0

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
          loading={enviando || preparandoPdf}
          disabled={bloqueado}
          title={bloqueado ? 'Falta el teléfono del paciente' : undefined}
        >
          <MessageCircle aria-hidden />
          {preparandoPdf ? 'Preparando el PDF' : textoBotonEnviar(via)}
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
      descripcion="Así le llega al paciente. Se puede editar antes de mandarlo."
      footer={footer}
    >
      {cuerpo}
    </ResponsiveModal>
  )
}

/* ── Capacidades del navegador ───────────────────────────── */

/**
 * Dispara el compartir del sistema. Sin `await`: el sheet no espera a
 * que WhatsApp devuelva nada, y un `AbortError` sólo significa que el
 * usuario cerró el selector. Devuelve si llegó a abrirse —`share()`
 * puede tirar en el acto (contexto no seguro, permiso denegado) y ahí
 * hay que probar por otro lado, no dar el envío por hecho.
 */
function compartir(datos: ShareData): boolean {
  try {
    navigator.share(datos).catch(() => {})
    return true
  } catch {
    return false
  }
}

/** El soporte de `navigator.share` no cambia mientras la página vive. */
const SIN_CAMBIOS = () => () => {}
const hayShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'

/* ── Textos auxiliares ───────────────────────────────────── */

function textoBotonEnviar(via: Via): string {
  if (via === 'compartir') return 'Elegir contacto y enviar'
  return 'Enviar por WhatsApp'
}

function tituloEnvio(via: Via): string {
  if (via === 'adjunto') return 'Se abrió WhatsApp con el mensaje y el PDF'
  if (via === 'compartir') return 'Se abrió el selector para elegir el contacto'
  return 'Se abrió WhatsApp con el mensaje'
}

function registroTexto(cambioElEstado: boolean): string {
  return cambioElEstado
    ? 'Registramos el envío y el presupuesto quedó como Enviado.'
    : 'Registramos el envío sin tocar el estado.'
}

function textoAdjunto(
  adjuntar: boolean,
  pdf: { isPending: boolean; isError: boolean; isSuccess: boolean },
  link: { isPending: boolean; isSuccess: boolean; data?: string | null },
  via: Via,
): string {
  if (!adjuntar) return 'Se manda sólo el texto, sin el documento.'
  if (pdf.isPending) return 'Preparando el PDF…'
  if (pdf.isError) return 'El PDF no se pudo preparar: se va a mandar sólo el texto.'
  if (via === 'adjunto') return 'Va adjunto al mensaje, como archivo.'
  if (link.isPending) return 'Preparando el link al PDF…'
  if (!link.data) {
    return 'No se pudo preparar el link: va sólo el texto. Bajá el PDF y mandalo aparte.'
  }
  return 'Este navegador no adjunta archivos: va como link al final del mensaje.'
}
