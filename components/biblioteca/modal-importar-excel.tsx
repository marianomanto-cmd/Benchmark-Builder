'use client'

import { addDays, parseISO } from 'date-fns'
import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  FileSpreadsheet,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { importarAranceles, previsualizarImportacion } from '@/app/actions/catalogo'
import {
  Banner,
  Button,
  Checkbox,
  Field,
  Input,
  MicroBadge,
  ResponsiveModal,
  Segmented,
} from '@/components/ui'
import { fechaLarga, isoDate, money, numero, porcentaje } from '@/lib/formato'
import {
  escribe,
  leerPlanilla,
  sospechas,
  variacion,
  type EstadoImportacion,
  type FilaPlan,
  type FilaPlanilla,
  type Planilla,
  type PlanImportacion,
} from '@/lib/importar-aranceles'
import { cn } from '@/lib/utils'

type Paso = 'elegir' | 'revisar' | 'listo'
type Filtro = 'todas' | 'cambios' | 'revisar' | 'iguales'

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Lo que se ve de una fila: lo que dijo la base + lo que leyó el navegador. */
interface FilaVista extends FilaPlan {
  /** Estado con la casilla de la persona aplicada encima. */
  mostrado: EstadoImportacion
  planilla: FilaPlanilla | undefined
  alertas: string[]
}

/**
 * Importar la lista de precios del mes desde un Excel.
 *
 * Tres pasos: elegir el archivo, revisar qué va a pasar fila por fila, y
 * el resumen de lo que se hizo. La revisión no la calcula el navegador:
 * la arma `importar_aranceles()` sin escribir nada, que es la misma
 * función que después aplica. Lo que se ve es lo que se va a hacer.
 *
 * Los precios que se ven mal —ceros perdidos, saltos de más del doble—
 * arrancan destildados. No se corrigen solos: nadie sabe cuántos ceros
 * faltan. Se dejan afuera hasta que alguien los mire, y se pueden
 * incluir con un toque.
 */
export function ModalImportarExcel({
  onCerrar,
  onAplicado,
}: {
  onCerrar: () => void
  onAplicado: () => void
}) {
  const [paso, setPaso] = React.useState<Paso>('elegir')
  const [archivo, setArchivo] = React.useState<string | null>(null)
  const [planilla, setPlanilla] = React.useState<Planilla | null>(null)
  const [desde, setDesde] = React.useState<string>(() => isoDate())
  const [excluidas, setExcluidas] = React.useState<Set<number>>(() => new Set())
  const [plan, setPlan] = React.useState<PlanImportacion | null>(null)
  const [resultado, setResultado] = React.useState<PlanImportacion | null>(null)
  const [filtro, setFiltro] = React.useState<Filtro>('todas')

  const [leyendo, setLeyendo] = React.useState(false)
  const [consultando, setConsultando] = React.useState(false)
  const [aplicando, iniciarAplicar] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [arrastrando, setArrastrando] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  /** Turno de la última vista previa pedida: las respuestas viejas se tiran. */
  const turno = React.useRef(0)
  /** Espera de la fecha: corregir el año dispara un `change` por dígito. */
  const esperaFecha = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(
    () => () => {
      if (esperaFecha.current) clearTimeout(esperaFecha.current)
    },
    [],
  )

  // La espera de la fecha dispara medio segundo después: tiene que usar
  // las casillas de ESE momento, no las de cuando se tocó la fecha.
  const excluidasRef = React.useRef(excluidas)
  React.useEffect(() => {
    excluidasRef.current = excluidas
  }, [excluidas])

  const fechaInvalida = !ES_FECHA.test(desde)

  const filasParaMandar = React.useMemo(
    () =>
      (planilla?.filas ?? []).map((f) => ({
        fila: f.fila,
        rubro: f.rubro,
        nombre: f.nombre,
        monto: f.monto,
      })),
    [planilla],
  )

  /**
   * Pide la vista previa. Con `autoExcluir`, deja afuera los precios que
   * se ven mal y vuelve a pedirla con esas filas omitidas, para que las
   * repeticiones se resuelvan contra lo que de verdad se va a cargar.
   */
  const previsualizar = React.useCallback(
    async (
      p: Planilla,
      fecha: string,
      omitir: Set<number>,
      nombreArchivo: string | null,
      autoExcluir: boolean,
    ) => {
      const miTurno = ++turno.current
      setConsultando(true)
      setError(null)

      const filas = p.filas.map((f) => ({
        fila: f.fila,
        rubro: f.rubro,
        nombre: f.nombre,
        monto: f.monto,
      }))

      let respuesta = await previsualizarImportacion({
        filas,
        desde: fecha,
        omitir: [...omitir],
        archivo: nombreArchivo,
      })

      let omitidas = omitir
      if (autoExcluir && respuesta.ok) {
        // También las repetidas: si se dejara afuera sólo la primera de
        // dos «$ 800», la segunda pasaría a cargarse en su lugar.
        const sospechosas = respuesta.data.filas
          .filter(
            (f) =>
              (escribe(f.previsto) || f.previsto === 'repetida') &&
              sospechas(f.monto, f.monto_actual).length > 0,
          )
          .map((f) => f.fila)
        if (sospechosas.length > 0) {
          omitidas = new Set([...omitir, ...sospechosas])
          respuesta = await previsualizarImportacion({
            filas,
            desde: fecha,
            omitir: [...omitidas],
            archivo: nombreArchivo,
          })
        }
      }

      if (miTurno !== turno.current) return
      setConsultando(false)

      if (!respuesta.ok) {
        setError(respuesta.error)
        return
      }
      setExcluidas(omitidas)
      setPlan(respuesta.data)
      setPaso('revisar')
    },
    [],
  )

  async function leerArchivo(file: File) {
    setError(null)

    if (!/\.xlsx$/i.test(file.name)) {
      setError(
        /\.xls$/i.test(file.name)
          ? 'Ese es el formato viejo de Excel (.xls). Abrilo y guardalo como .xlsx, o descargalo de Google Sheets como «Microsoft Excel (.xlsx)».'
          : 'Elegí un archivo de Excel (.xlsx). Desde Google Sheets: Archivo › Descargar › Microsoft Excel (.xlsx).',
      )
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo pesa más de 5 MB: una lista de precios no ocupa tanto. ¿Es el archivo correcto?')
      return
    }

    setLeyendo(true)
    try {
      // La librería sólo se baja cuando alguien importa: no viaja en la
      // carga de la pantalla.
      const { default: leerExcel } = await import('read-excel-file/browser')
      const hojas = await leerExcel(file)

      // La primera hoja que tenga los encabezados; si ninguna, el error
      // de la primera, que es la que la persona ve al abrir el archivo.
      let lectura = null as ReturnType<typeof leerPlanilla> | null
      for (const hoja of hojas) {
        const intento = leerPlanilla(hoja.data as unknown[][])
        if (intento.ok) {
          lectura = intento
          break
        }
        lectura ??= intento
      }

      if (!lectura || !lectura.ok) {
        setError(lectura && !lectura.ok ? lectura.error : 'El archivo no tiene hojas con datos.')
        return
      }

      setArchivo(file.name)
      setPlanilla(lectura.planilla)
      setFiltro('todas')
      await previsualizar(lectura.planilla, desde, new Set(), file.name, true)
    } catch (e) {
      console.error('[importar] no se pudo leer el Excel', e)
      setError(
        'No se pudo leer el archivo. Fijate que sea un Excel (.xlsx) y que no esté protegido con contraseña.',
      )
    } finally {
      setLeyendo(false)
    }
  }

  /**
   * Cambia la fecha y vuelve a pedir la vista previa. Mientras se tipea,
   * medio segundo después de la última tecla: un `input type=date` manda
   * un `change` por cada dígito del año, y cada uno es una fecha válida
   * (0002, 0020, 0202…) que pediría una vista previa entera.
   */
  function cambiarFecha(nueva: string, inmediato = false) {
    setDesde(nueva)
    if (esperaFecha.current) clearTimeout(esperaFecha.current)
    if (!planilla || !ES_FECHA.test(nueva)) return
    const pedir = () => void previsualizar(planilla, nueva, excluidasRef.current, archivo, false)
    if (inmediato) pedir()
    else esperaFecha.current = setTimeout(pedir, 500)
  }

  function alternar(fila: number) {
    if (!planilla) return
    const nuevas = new Set(excluidas)
    if (nuevas.has(fila)) nuevas.delete(fila)
    else nuevas.add(fila)
    setExcluidas(nuevas)
    // Sin fecha no hay contra qué comparar: la casilla cambia igual y la
    // vista previa se pide cuando la fecha vuelva a ser válida.
    if (ES_FECHA.test(desde)) void previsualizar(planilla, desde, nuevas, archivo, false)
  }

  function volverAElegir() {
    turno.current += 1
    setPaso('elegir')
    setPlanilla(null)
    setPlan(null)
    setArchivo(null)
    setExcluidas(new Set())
    setError(null)
    setConsultando(false)
  }

  /* ── La vista de cada fila ───────────────────────────────── */

  const porFila = React.useMemo(
    () => new Map((planilla?.filas ?? []).map((f) => [f.fila, f] as const)),
    [planilla],
  )

  const filas = React.useMemo<FilaVista[]>(() => {
    if (!plan) return []
    return plan.filas.map((f) => {
      // La casilla manda aunque la vista previa nueva todavía no llegó.
      const mostrado: EstadoImportacion = excluidas.has(f.fila)
        ? 'omitida'
        : f.estado === 'omitida'
          ? f.previsto
          : f.estado
      return {
        ...f,
        mostrado,
        planilla: porFila.get(f.fila),
        alertas: escribe(f.previsto) ? sospechas(f.monto, f.monto_actual) : [],
      }
    })
  }, [plan, excluidas, porFila])

  const conteo = React.useMemo(() => {
    const c = { crear: 0, cambia: 0, igual: 0, revisar: 0, error: 0, fuera: 0 }
    for (const f of filas) {
      if (f.mostrado === 'crear') c.crear += 1
      else if (f.mostrado === 'actualizar' || f.mostrado === 'corregir') c.cambia += 1
      else if (f.mostrado === 'igual') c.igual += 1
      else if (f.mostrado === 'error') c.error += 1
      else c.fuera += 1
      if (f.alertas.length > 0 || f.mostrado === 'error' || f.mostrado === 'repetida') {
        c.revisar += 1
      }
    }
    return c
  }, [filas])

  const aCargar = conteo.crear + conteo.cambia

  /**
   * La vista previa a la vista es la de la fecha elegida. Mientras se
   * espera la nueva —o si falló— lo que se ve es el plan de otra fecha,
   * y aplicar mandaría la fecha nueva con las casillas de ese plan.
   */
  const previaAlDia = plan !== null && plan.desde === desde

  const visibles = React.useMemo(() => {
    if (filtro === 'cambios') return filas.filter((f) => escribe(f.mostrado))
    if (filtro === 'revisar') {
      return filas.filter(
        (f) => f.alertas.length > 0 || f.mostrado === 'error' || f.mostrado === 'repetida',
      )
    }
    if (filtro === 'iguales') return filas.filter((f) => f.mostrado === 'igual')
    return filas
  }, [filas, filtro])

  /**
   * Si un precio de hoy ya se usó en un presupuesto emitido hoy, no se
   * puede cerrar hoy: el documento citaría un precio que, según la base,
   * ya no regía. La salida honesta es que los precios nuevos arranquen
   * el día siguiente al último de esos presupuestos.
   */
  const fechaSugerida = React.useMemo(() => {
    const dias = filas
      .filter((f) => f.mostrado === 'error' && f.emitido_el)
      .map((f) => f.emitido_el as string)
    if (dias.length === 0) return null
    const ultimo = dias.sort().at(-1) as string
    return isoDate(addDays(parseISO(ultimo), 1))
  }, [filas])
  const bloqueadasPorFecha = filas.filter((f) => f.mostrado === 'error' && f.emitido_el).length

  function aplicar() {
    if (!planilla || fechaInvalida || aCargar === 0 || !previaAlDia || consultando) return
    setError(null)

    iniciarAplicar(async () => {
      const respuesta = await importarAranceles({
        filas: filasParaMandar,
        desde,
        omitir: [...excluidas],
        archivo,
      })
      if (!respuesta.ok) {
        setError(respuesta.error)
        return
      }
      setResultado(respuesta.data)
      setPaso('listo')
      const hechas = respuesta.data.filas.filter((f) => escribe(f.estado)).length
      toast.success(
        hechas === 1 ? 'Se cargó 1 precio.' : `Se cargaron ${numero(hechas)} precios.`,
      )
      onAplicado()
    })
  }

  /* ── Pie ─────────────────────────────────────────────────── */

  const pie =
    paso === 'elegir' ? (
      <Button type="button" variant="ghost" size="touch" className="sm:h-[34px]" onClick={onCerrar}>
        Cancelar
      </Button>
    ) : paso === 'revisar' ? (
      <>
        <Button
          type="button"
          variant="ghost"
          size="touch"
          className="sm:h-[34px]"
          disabled={aplicando}
          onClick={volverAElegir}
        >
          Elegir otro archivo
        </Button>
        <Button
          type="button"
          variant="primary"
          size="touch"
          className="sm:h-[34px]"
          loading={aplicando}
          disabled={aCargar === 0 || consultando || fechaInvalida || !previaAlDia}
          onClick={aplicar}
        >
          {aCargar === 0
            ? 'Nada para cargar'
            : `Cargar ${numero(aCargar)} ${aCargar === 1 ? 'precio' : 'precios'}`}
        </Button>
      </>
    ) : (
      <Button type="button" variant="primary" size="touch" className="sm:h-[34px]" onClick={onCerrar}>
        Listo
      </Button>
    )

  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => {
        if (!v && !aplicando) onCerrar()
      }}
      titulo="Importar precios desde Excel"
      descripcion={
        paso === 'elegir'
          ? 'La lista del mes: Tipo, Subtipo y el precio en Efectivo, que es el particular.'
          : archivo ?? undefined
      }
      ancho="lg"
      footer={pie}
    >
      <div className="space-y-5">
        {error && (
          <Banner tono="warm" icono={<TriangleAlert className="size-4" />} titulo="No se pudo seguir">
            {error}
          </Banner>
        )}

        {paso === 'elegir' && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void leerArchivo(file)
              }}
            />

            <button
              type="button"
              disabled={leyendo || consultando}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setArrastrando(true)
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault()
                setArrastrando(false)
                const file = e.dataTransfer.files?.[0]
                if (file) void leerArchivo(file)
              }}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed px-4 py-8 text-center transition-colors',
                arrastrando
                  ? 'border-primary bg-tint'
                  : 'border-hairline hover:border-primary/40 hover:bg-tint',
                (leyendo || consultando) && 'cursor-wait opacity-70',
              )}
            >
              <FileSpreadsheet aria-hidden className="size-7 text-primary" />
              <span className="font-sans text-[14px] font-medium text-ink">
                {leyendo
                  ? 'Leyendo el archivo…'
                  : consultando
                    ? 'Comparando con la biblioteca…'
                    : 'Elegí el Excel del mes'}
              </span>
              <span className="t-helper">
                {leyendo || consultando ? 'Un momento.' : 'O arrastralo acá. Formato .xlsx.'}
              </span>
              {!leyendo && !consultando && (
                <span className="mt-1 inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-primary">
                  <Upload aria-hidden className="size-4" />
                  Elegir archivo
                </span>
              )}
            </button>

            <CampoFecha desde={desde} onCambiar={setDesde} invalida={fechaInvalida} />

            <div className="rounded-card border border-hairline bg-tint/60 p-4 text-[13px] leading-relaxed text-body">
              <p className="t-label">Cómo se lee</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  <strong>Subtipo</strong> es la prestación. Si ya está en la biblioteca se le
                  actualiza el precio, aunque esté escrita con otras mayúsculas o sin acentos. Si
                  no está, se crea. Nunca queda duplicada.
                </li>
                <li>
                  <strong>Tipo</strong> es el rubro. Si una fila no lo tiene, usa el de la fila de
                  arriba.
                </li>
                <li>
                  <strong>Efectivo</strong> es el precio particular. Las obras sociales no se
                  tocan.
                </li>
                <li>Antes de cargar nada vas a ver qué pasa con cada fila.</li>
              </ul>
            </div>
          </>
        )}

        {paso === 'revisar' && plan && (
          <>
            <CampoFecha
              desde={desde}
              onCambiar={(v) => cambiarFecha(v)}
              invalida={fechaInvalida}
            />

            {fechaSugerida && (
              <Banner
                tono="warm"
                icono={<CalendarClock className="size-4" />}
                titulo={
                  bloqueadasPorFecha === 1
                    ? '1 precio ya se usó en un presupuesto de esa fecha'
                    : `${numero(bloqueadasPorFecha)} precios ya se usaron en presupuestos de esa fecha`
                }
                acciones={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={consultando}
                    onClick={() => cambiarFecha(fechaSugerida, true)}
                  >
                    Que rijan desde el {fechaLarga(fechaSugerida)}
                  </Button>
                }
              >
                Un presupuesto emitido cita el precio que rige ese día. Para cambiarlo sin dejar a
                ese documento citando un precio que ya no regía, los precios nuevos tienen que
                arrancar después.
              </Banner>
            )}

            <Resumen conteo={conteo} />

            <Segmented
              value={filtro}
              onChange={setFiltro}
              opciones={[
                { value: 'todas', label: `Todas · ${numero(filas.length)}` },
                { value: 'cambios', label: `Se cargan · ${numero(aCargar)}` },
                { value: 'revisar', label: `A revisar · ${numero(conteo.revisar)}` },
                { value: 'iguales', label: `Sin cambios · ${numero(conteo.igual)}` },
              ]}
            />

            {planilla && planilla.ignoradas.length > 0 && (
              <p className="t-helper">
                Se toma el precio de «{planilla.columnas.precio}». No se usan:{' '}
                {planilla.ignoradas.map((c) => `«${c}»`).join(', ')}.
              </p>
            )}

            {visibles.length === 0 ? (
              <p className="t-helper">No hay filas con este filtro.</p>
            ) : (
              <ul
                className={cn(
                  'divide-y divide-hairline rounded-card border border-hairline',
                  consultando && 'opacity-70',
                )}
                aria-busy={consultando}
              >
                {visibles.map((f) => (
                  <FilaImportacion
                    key={f.fila}
                    fila={f}
                    incluida={!excluidas.has(f.fila)}
                    onAlternar={() => alternar(f.fila)}
                    deshabilitada={aplicando}
                  />
                ))}
              </ul>
            )}

            <p className="t-helper">
              Cada precio que cambia abre una vigencia nueva desde el{' '}
              {fechaInvalida ? 'día elegido' : fechaLarga(desde)} y cierra la anterior el día
              previo. Los presupuestos ya emitidos no cambian. Se carga todo junto o nada.
            </p>
          </>
        )}

        {paso === 'listo' && resultado && <ResultadoImportacion resultado={resultado} />}
      </div>
    </ResponsiveModal>
  )
}

/* ═══════════════════════════════════════════════════════════
   Piezas
   ═══════════════════════════════════════════════════════════ */

function CampoFecha({
  desde,
  onCambiar,
  invalida,
}: {
  desde: string
  onCambiar: (v: string) => void
  invalida: boolean
}) {
  const hoy = isoDate()
  return (
    <Field
      label="Los precios rigen desde"
      requerido
      htmlFor="importar-desde"
      error={invalida ? 'Elegí una fecha.' : null}
      helper={
        !invalida && desde > hoy
          ? `Quedan programados: hasta el ${fechaLarga(desde)} se sigue cotizando lo de hoy.`
          : !invalida && desde < hoy
            ? 'Es una fecha pasada: el historial va a decir que estos precios rigen desde entonces.'
            : 'Desde el próximo presupuesto se cotiza con la lista nueva.'
      }
    >
      <Input
        id="importar-desde"
        type="date"
        value={desde}
        onChange={(e) => onCambiar(e.target.value)}
        invalido={invalida}
        className="h-11 max-w-[200px] tabular-nums sm:h-9"
      />
    </Field>
  )
}

function Resumen({
  conteo,
}: {
  conteo: { crear: number; cambia: number; igual: number; revisar: number; error: number; fuera: number }
}) {
  const items: { n: number; texto: string; tono?: 'warm' | 'primary' }[] = [
    { n: conteo.crear, texto: conteo.crear === 1 ? 'prestación nueva' : 'prestaciones nuevas', tono: 'primary' },
    { n: conteo.cambia, texto: conteo.cambia === 1 ? 'precio cambia' : 'precios cambian', tono: 'primary' },
    { n: conteo.igual, texto: 'sin cambios' },
    { n: conteo.error, texto: conteo.error === 1 ? 'con error' : 'con errores', tono: 'warm' },
    { n: conteo.fuera, texto: conteo.fuera === 1 ? 'queda afuera' : 'quedan afuera' },
  ]
  return (
    <div className="flex flex-wrap gap-2" aria-live="polite">
      {items
        .filter((i) => i.n > 0)
        .map((i) => (
          <MicroBadge key={i.texto} tono={i.tono ?? 'neutro'} className="h-7 px-2.5 text-[12px]">
            <span className="tabular-nums">{numero(i.n)}</span>&nbsp;{i.texto}
          </MicroBadge>
        ))}
    </div>
  )
}

const ETIQUETA: Record<EstadoImportacion, string> = {
  crear: 'Nueva',
  actualizar: 'Cambia',
  corregir: 'Corrige',
  igual: 'Sin cambios',
  repetida: 'Repetida',
  omitida: 'No se carga',
  error: 'Error',
}

function Insignia({ fila }: { fila: FilaVista }) {
  const v = variacion(fila.monto, fila.monto_actual)
  if (fila.mostrado === 'actualizar' && v !== null) {
    return (
      <MicroBadge tono="primary">
        {v >= 0 ? 'Sube' : 'Baja'} {porcentaje(Math.abs(Math.round(v * 10) / 10))}
      </MicroBadge>
    )
  }
  const tono =
    fila.mostrado === 'error'
      ? 'warm'
      : fila.mostrado === 'crear' || fila.mostrado === 'actualizar' || fila.mostrado === 'corregir'
        ? 'primary'
        : 'neutro'
  return <MicroBadge tono={tono}>{ETIQUETA[fila.mostrado]}</MicroBadge>
}

function FilaImportacion({
  fila,
  incluida,
  onAlternar,
  deshabilitada,
}: {
  fila: FilaVista
  incluida: boolean
  onAlternar: () => void
  deshabilitada: boolean
}) {
  // Sólo se puede tildar lo que escribiría algo: un error o una fila
  // igual no tienen nada que incluir.
  const tildable = escribe(fila.previsto)
  const id = `importar-fila-${fila.fila}`
  const problema = fila.planilla?.problema ?? fila.mensaje
  const otroNombre =
    fila.prestacion && fila.prestacion !== fila.nombre ? fila.prestacion : null

  return (
    <li className={cn('flex gap-3 px-3 py-3 sm:px-4', fila.mostrado === 'omitida' && 'bg-[#F8FAFB]')}>
      <div className="flex min-h-11 w-6 shrink-0 items-start justify-center pt-0.5 md:min-h-0">
        {tildable ? (
          <Checkbox
            id={id}
            checked={incluida}
            disabled={deshabilitada}
            onCheckedChange={onAlternar}
            aria-label={`Cargar ${fila.nombre}`}
          />
        ) : (
          <span className="t-helper tabular-nums">{fila.fila}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* En el teléfono el precio va abajo del nombre: al costado, el
            nombre se partía palabra por palabra. */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <label htmlFor={tildable ? id : undefined} className="min-w-0 flex-1">
            <span className="block font-sans text-[14px] font-medium text-ink">
              {fila.nombre || <span className="text-faint">Sin subtipo</span>}
            </span>
            <span className="block t-helper">
              Fila {fila.fila}
              {fila.rubro && ` · ${fila.rubro}`}
              {otroNombre && ` · en la biblioteca: «${otroNombre}»`}
            </span>
          </label>

          <span className="flex shrink-0 items-center gap-2">
            <Insignia fila={fila} />
            <Precio fila={fila} />
          </span>
        </div>

        {(fila.mostrado === 'error' || fila.mostrado === 'repetida') && problema && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-warm-ink">
            <TriangleAlert aria-hidden className="mt-[2px] size-3.5 shrink-0" />
            {problema}
          </p>
        )}

        {fila.alertas.map((a) => (
          <p key={a} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-warm-ink">
            <TriangleAlert aria-hidden className="mt-[2px] size-3.5 shrink-0" />
            <span>
              {a}
              {!incluida && ' Quedó afuera: tildala si el precio está bien.'}
            </span>
          </p>
        ))}

        {fila.planilla?.nota && <p className="mt-1 t-helper">{fila.planilla.nota}</p>}

        {fila.mostrado !== 'error' &&
          fila.avisos.map((a) => (
            <p key={a} className="mt-1 t-helper">
              {a}
            </p>
          ))}
      </div>
    </li>
  )
}

function Precio({ fila }: { fila: FilaVista }) {
  if (fila.monto === null) {
    return (
      <span className="font-sans text-[13px] text-faint">
        {fila.planilla?.textoPrecio || 'sin precio'}
      </span>
    )
  }
  const cambia = fila.monto_actual !== null && fila.monto_actual !== fila.monto
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
      {cambia && (
        <>
          <span className="text-[13px] text-faint">{money(fila.monto_actual)}</span>
          <ArrowRight aria-hidden className="size-3 text-faint" />
        </>
      )}
      <span className="text-[14px] font-semibold text-ink">{money(fila.monto)}</span>
    </span>
  )
}

function ResultadoImportacion({ resultado }: { resultado: PlanImportacion }) {
  const creadas = resultado.filas.filter((f) => f.estado === 'crear').length
  const actualizadas = resultado.filas.filter((f) => f.estado === 'actualizar').length
  const corregidas = resultado.filas.filter((f) => f.estado === 'corregir').length
  const iguales = resultado.filas.filter((f) => f.estado === 'igual').length
  const afuera = resultado.filas.filter(
    (f) => f.estado === 'error' || f.estado === 'omitida',
  )

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-card border border-primary/20 bg-tint p-4">
        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="text-[14px] leading-relaxed text-body">
          <p className="font-sans font-semibold text-ink">
            Lista cargada: rige desde el {fechaLarga(resultado.desde)}.
          </p>
          <ul className="mt-1 space-y-0.5">
            {creadas > 0 && (
              <li>
                {numero(creadas)} {creadas === 1 ? 'prestación nueva' : 'prestaciones nuevas'} en la
                biblioteca, con su precio particular.
              </li>
            )}
            {actualizadas > 0 && (
              <li>
                {numero(actualizadas)} {actualizadas === 1 ? 'precio nuevo' : 'precios nuevos'}: la
                vigencia anterior quedó cerrada el día previo.
              </li>
            )}
            {corregidas > 0 && (
              <li>
                {numero(corregidas)}{' '}
                {corregidas === 1 ? 'precio corregido' : 'precios corregidos'} de una carga anterior
                para esa misma fecha.
              </li>
            )}
            {iguales > 0 && (
              <li>
                {numero(iguales)} {iguales === 1 ? 'ya estaba' : 'ya estaban'} con ese precio.
              </li>
            )}
          </ul>
        </div>
      </div>

      {afuera.length > 0 && (
        <section>
          <h3 className="t-label">
            No se cargaron · {numero(afuera.length)}
          </h3>
          <ul className="mt-2 divide-y divide-hairline rounded-card border border-hairline">
            {afuera.map((f) => (
              <li key={f.fila} className="px-4 py-2.5">
                <span className="block font-sans text-[14px] text-ink">
                  {f.nombre || 'Sin subtipo'}
                </span>
                <span className="block t-helper">
                  Fila {f.fila} · {f.estado === 'omitida' ? 'la dejaste afuera' : f.mensaje}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 t-helper">
            Se pueden cargar a mano desde la grilla, o corregir el Excel y volver a importarlo:
            lo que ya está cargado aparece como «sin cambios».
          </p>
        </section>
      )}
    </div>
  )
}
