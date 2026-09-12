'use client'

import {
  CalendarDays,
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  Button,
  EstadoBadge,
  Input,
  Kbd,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useEsDesktop,
} from '@/components/ui'
import { ESTADOS, ETIQUETA_ESTADO } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
import type { EstadoPresupuesto } from '@/lib/types'
import { cn } from '@/lib/utils'

import { ID_BUSQUEDA } from './atajos-home'
import {
  construirUrl,
  contarFiltros,
  contarFiltrosAvanzados,
  FILTROS_VACIOS,
  hayFiltrosActivos,
} from './filtros-url'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './popover'
import { OBRA_SOCIAL_PARTICULAR, type FiltrosHome, type OpcionFiltro } from './tipos'

/** Sentinela de los `Select`: Radix no acepta `value=""`. */
const TODOS = 'todos'

/**
 * Cuántos filtros puestos se dibujan en la barra de mobile antes de
 * plegarse en un «+N».
 *
 * La barra es sticky: lo que crece acá le come pantalla al listado en
 * todo momento, no sólo al llegar. Con los ocho estados puestos más
 * obra social y fechas eran seis filas —270px, más que los cuatro
 * KPIs— y el primer presupuesto quedaba abajo del pliegue. Tres chips
 * cubren el caso real (uno o dos estados) y le ponen techo al resto.
 */
const TOPE_CHIPS = 3

/**
 * Un filtro puesto, sin la función que lo saca.
 *
 * Los datos van separados del `onClick` a propósito: armar acá los
 * callbacks obligaría a leer `actualRef.current` durante el render, que
 * es justo lo que `react-hooks/refs` marca —y con razón: el valor del
 * ref no dispara re-render, así que un chip podría quedar quitando el
 * filtro de hace dos navegaciones—.
 */
type ChipFiltro =
  | { clave: string; texto: string; tipo: 'estado'; estado: EstadoPresupuesto }
  | { clave: string; texto: string; tipo: 'profesional' | 'obraSocial' | 'fechas' }

const RETARDO_BUSQUEDA = 350

/**
 * Barra de filtros sticky, con el listado adentro.
 *
 * Todo lo que se elige acá termina en la URL: el back del navegador
 * deshace un filtro y el link se puede compartir por chat tal cual.
 * La búsqueda usa `replace` (no ensucia el historial con cada tecla);
 * el resto usa `push`, que es lo que hace que "atrás" funcione.
 *
 * El listado llega como `children` (RSC ya renderizado) para que la
 * barra pueda atenuarlo mientras una navegación está en vuelo: lo que
 * se está mirando es de los filtros anteriores y tiene que verse así.
 */
export function BarraFiltros({
  filtros,
  profesionales,
  obrasSociales,
  children,
}: {
  filtros: FiltrosHome
  profesionales: OpcionFiltro[]
  obrasSociales: OpcionFiltro[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [pendiente, iniciarTransicion] = React.useTransition()
  const [texto, setTexto] = React.useState(filtros.q)
  const [sheetPedido, setSheetPedido] = React.useState(false)

  // El sheet de filtros es sólo de mobile. Si la ventana se agranda con
  // el sheet abierto (tablet que se gira, ventana que se estira), el
  // contenido se esconde por CSS pero el overlay queda tapando la
  // pantalla. Se deriva en render en vez de cerrarlo desde un efecto:
  // un `setState` en efecto encadena un render de más.
  const esDesktop = useEsDesktop()
  const sheetAbierto = sheetPedido && !esDesktop

  /** Último término que mandamos nosotros a la URL. */
  const enviado = React.useRef(filtros.q)

  /**
   * Lo que la barra muestra: los filtros que ya pedimos, aunque la
   * navegación siga en vuelo.
   *
   * `filtros` es lo que contestó el servidor la última vez, así que
   * durante los cientos de milisegundos que tarda una navegación RSC
   * está atrasado. Armar el filtro siguiente sobre él perdía el
   * anterior: elegir profesional y enseguida obra social dejaba sólo la
   * obra social, y tocar dos chips de estado seguidos en el celular
   * dejaba sólo el segundo. Los controles quedan vivos mientras se
   * navega a propósito —apagarlos se lee como «se rompió»—, así que
   * encadenar dos elecciones es lo normal, no el caso raro.
   *
   * Además el control responde en el acto: el chip se prende cuando se
   * lo toca y no cuando vuelve el servidor.
   */
  const urlVigente = construirUrl(filtros)
  const [vista, setVista] = React.useState(filtros)
  const [urlVista, setUrlVista] = React.useState(urlVigente)
  if (!pendiente && urlVista !== urlVigente) {
    // Aterrizó una navegación que no estábamos esperando —«atrás», un
    // link pegado—: la barra vuelve a mostrar lo que dice la URL.
    setUrlVista(urlVigente)
    setVista(filtros)
  }

  /** Lo pedido con lo tipeado encima: la base de la próxima URL. */
  const actual = React.useMemo<FiltrosHome>(() => ({ ...vista, q: texto }), [vista, texto])

  /** Leído desde callbacks que se disparan tarde (el debounce). */
  const actualRef = React.useRef(actual)
  React.useEffect(() => {
    actualRef.current = actual
  })

  const temporizador = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelarDebounce = React.useCallback(() => {
    if (temporizador.current === null) return
    clearTimeout(temporizador.current)
    temporizador.current = null
  }, [])

  React.useEffect(() => {
    // Si la URL cambió por afuera (back, link pegado), el input acompaña.
    // Si el cambio lo produjo nuestro propio `replace`, no se pisa lo que
    // el usuario siguió tipeando mientras la navegación estaba en vuelo.
    if (filtros.q === enviado.current) return
    enviado.current = filtros.q
    setTexto(filtros.q)
  }, [filtros.q])

  /**
   * Único camino a la URL. Deja lo pedido a la vista sin esperar al
   * servidor y cancela la búsqueda en vuelo: si no, el `replace`
   * atrasado pisaba el filtro recién elegido con la URL anterior.
   *
   * Siempre vuelve a la página 1: cambiar de filtro estando en la 4
   * dejaba una lista vacía que se leía como "no hay resultados".
   */
  const mandar = React.useCallback(
    (proximos: FiltrosHome, modo: 'push' | 'replace') => {
      cancelarDebounce()
      const url = construirUrl(proximos)
      setVista(proximos)
      setUrlVista(url)
      enviado.current = proximos.q
      iniciarTransicion(() => {
        if (modo === 'push') router.push(url, { scroll: false })
        else router.replace(url, { scroll: false })
      })
    },
    [cancelarDebounce, router],
  )

  React.useEffect(() => {
    // Se compara contra lo último que mandamos nosotros, no contra
    // `filtros.q`: así una navegación por otro filtro no re-arma el
    // temporizador ni dispara una segunda navegación por la búsqueda.
    if (texto === enviado.current) return
    cancelarDebounce()
    temporizador.current = setTimeout(() => {
      temporizador.current = null
      mandar({ ...actualRef.current, q: texto }, 'replace')
    }, RETARDO_BUSQUEDA)
    return cancelarDebounce
  }, [texto, cancelarDebounce, mandar])

  /** Aplica un cambio de filtro ya, arrastrando lo tipeado. */
  const aplicar = React.useCallback(
    (parcial: Partial<FiltrosHome>) => {
      mandar({ ...actualRef.current, ...parcial }, 'push')
    },
    [mandar],
  )

  /** Enter en la búsqueda: no esperar los 350 ms. */
  const buscarYa = React.useCallback(() => {
    cancelarDebounce()
    if (actualRef.current.q === enviado.current) return
    mandar(actualRef.current, 'replace')
  }, [cancelarDebounce, mandar])

  const limpiarTodo = React.useCallback(() => {
    setTexto('')
    mandar(FILTROS_VACIOS, 'push')
  }, [mandar])

  /**
   * Saca los filtros pero deja lo tipeado.
   *
   * Es el "Limpiar" de la barra de mobile, que está al lado de los
   * chips de filtro y no del campo de búsqueda: borrar de paso lo que
   * la persona acababa de escribir sería sacarle algo que no pidió
   * sacar.
   */
  const limpiarAvanzados = React.useCallback(() => {
    mandar(
      { ...actualRef.current, estados: [], profesional: '', obraSocial: '', desde: '', hasta: '' },
      'push',
    )
  }, [mandar])

  function alternarEstado(estado: EstadoPresupuesto) {
    // En el orden canónico de la máquina de estados, que es el que
    // devuelve `parseFiltros`: así la URL que pedimos es igual a la que
    // el servidor confirma y la barra no tiene que re-acomodarse.
    aplicar({
      estados: actual.estados.includes(estado)
        ? actual.estados.filter((e) => e !== estado)
        : ESTADOS.filter((e) => e === estado || actual.estados.includes(e)),
    })
  }

  const activos = hayFiltrosActivos(actual)
  const cantidad = contarFiltros(actual)
  const avanzados = contarFiltrosAvanzados(actual)

  const etiquetaEstados =
    actual.estados.length === 0
      ? 'Estado'
      : actual.estados.length === 1
        ? ETIQUETA_ESTADO[actual.estados[0]]
        : `${actual.estados.length} estados`

  const etiquetaFechas =
    actual.desde && actual.hasta
      ? `${fechaCorta(actual.desde)} – ${fechaCorta(actual.hasta)}`
      : actual.desde
        ? `Desde ${fechaCorta(actual.desde)}`
        : actual.hasta
          ? `Hasta ${fechaCorta(actual.hasta)}`
          : 'Fechas'

  /**
   * El trigger dice «Profesional», no «Todos los profesionales».
   *
   * Radix pinta en el trigger el texto del ítem elegido, y el ítem por
   * defecto es «Todos los profesionales»: 180px es justo el ancho donde
   * ese texto entra o no entra según la fuente del sistema, así que en
   * algunas máquinas se partía en dos líneas y esos dos controles
   * quedaban más altos que el resto de la barra. Además rompía la
   * gramática de la fila, donde los demás son sustantivos sueltos
   * (Estado, Fechas). El «Todos los…» sigue estando adentro de la
   * lista, que es donde significa algo: ahí quiere decir «sacá el
   * filtro».
   */
  const etiquetaProfesional =
    profesionales.find((p) => p.value === actual.profesional)?.label ?? 'Profesional'

  const etiquetaObraSocial =
    actual.obraSocial === OBRA_SOCIAL_PARTICULAR
      ? 'Particular'
      : (obrasSociales.find((o) => o.value === actual.obraSocial)?.label ?? 'Obra social')

  /**
   * Los chips de la barra de mobile, en el orden de la barra de
   * desktop: la app no se lee distinta según el aparato.
   *
   * Son más que `avanzados` —ahí los ocho estados cuentan como un solo
   * filtro, que es el número del botón «Filtros»— porque cada estado
   * se saca por su cuenta.
   */
  const chips: ChipFiltro[] = actual.estados.map((estado) => ({
    clave: `estado-${estado}`,
    texto: ETIQUETA_ESTADO[estado],
    tipo: 'estado',
    estado,
  }))
  if (actual.profesional) {
    chips.push({ clave: 'profesional', texto: etiquetaProfesional, tipo: 'profesional' })
  }
  if (actual.obraSocial) {
    chips.push({ clave: 'obra-social', texto: etiquetaObraSocial, tipo: 'obraSocial' })
  }
  if (actual.desde || actual.hasta) {
    chips.push({ clave: 'fechas', texto: etiquetaFechas, tipo: 'fechas' })
  }

  const chipsVisibles = chips.slice(0, TOPE_CHIPS)
  const chipsPlegados = chips.length - chipsVisibles.length

  /** Saca el filtro de un chip. Fuera del render: lee `actualRef`. */
  function quitarChip(chip: ChipFiltro) {
    if (chip.tipo === 'estado') alternarEstado(chip.estado)
    else if (chip.tipo === 'profesional') aplicar({ profesional: '' })
    else if (chip.tipo === 'obraSocial') aplicar({ obraSocial: '' })
    else aplicar({ desde: '', hasta: '' })
  }

  const selectProfesional = (
    <Select
      value={actual.profesional || TODOS}
      onValueChange={(v) => aplicar({ profesional: v === TODOS ? '' : v })}
    >
      <SelectTrigger
        aria-label="Filtrar por profesional"
        className={cn('w-full md:w-[168px]', actual.profesional && 'border-primary/40 bg-tint')}
      >
        {/* Con `children` y no con `asChild`: `asChild` mete un `Slot`
            de Radix que termina pasándole props a un Fragment, y React
            lo marca en consola en cada render. Pasando el texto como
            hijo se consigue lo mismo sin el envoltorio. El recorte y la
            alineación de la flecha los pone `SelectTrigger`.

            Sin `text-faint`: los cuatro controles de la fila están sin
            elegir y pintar dos de gris los hacía ver deshabilitados al
            lado de Estado y Fechas. Que un filtro está puesto lo dice
            el borde, no el color del texto. */}
        <SelectValue>{etiquetaProfesional}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>Todos los profesionales</SelectItem>
        {profesionales.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const selectObraSocial = (
    <Select
      value={actual.obraSocial || TODOS}
      onValueChange={(v) => aplicar({ obraSocial: v === TODOS ? '' : v })}
    >
      <SelectTrigger
        aria-label="Filtrar por obra social"
        className={cn('w-full md:w-[168px]', actual.obraSocial && 'border-primary/40 bg-tint')}
      >
        <SelectValue>{etiquetaObraSocial}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>Todas las obras sociales</SelectItem>
        <SelectItem value={OBRA_SOCIAL_PARTICULAR}>Particular</SelectItem>
        {obrasSociales.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <>
      <div
        className={cn(
          // Sangra hasta los bordes del `<main>` del layout (px-4 / md:px-8) y
          // se pega debajo de la topbar de 64px, que en mobile no existe.
          'sticky top-0 z-20 -mx-4 border-b border-hairline/70 bg-page/85 px-4 py-3 backdrop-blur-md',
          'md:top-16 md:-mx-8 md:px-8',
        )}
      >
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2">
          {/* Una sola instancia del campo: dos (una por breakpoint)
              duplicaban el `id`, y el atajo no sabía cuál enfocar. */}
          <div className="md:min-w-[240px] md:flex-1">
            <CampoBusqueda
              valor={texto}
              onChange={setTexto}
              onLimpiar={() => setTexto('')}
              onBuscarYa={buscarYa}
              buscando={pendiente}
            />
          </div>

          {/*
            ── Mobile: un botón, y lo que está puesto ──────────────

            Acá había una fila con los ocho estados más «Todos»: 866px
            de chips metidos en 270 con `overflow-x-auto`, así que
            «Aceptado», «Iniciado» y «Perdido» vivían detrás de un
            arrastre lateral que encima compite con el scroll vertical
            de la página. Envolverlos sacó el arrastre pero los apiló en
            cinco filas: 280px de barra pegajosa —más alta que los
            KPIs— para elegir un filtro que se usa una vez cada tanto,
            con el listado empujado abajo de todo.

            Los ocho estados están en el sheet, que es donde ya vivían
            los otros cuatro filtros y donde se ven los ocho juntos sin
            pelearse por el ancho. Lo que queda fijo arriba es lo que sí
            hay que poder leer sin abrir nada: qué filtros están
            puestos, y cómo sacarlos. Sin ninguno, es una sola fila de
            44px.
          */}
          <div className="flex flex-wrap items-center gap-2 md:hidden">
            <Button
              variant="secondary"
              size="touch"
              className={cn('shrink-0 px-4', avanzados > 0 && 'border-primary/40 bg-tint')}
              onClick={() => setSheetPedido(true)}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal aria-hidden />
              Filtros
              {avanzados > 0 && (
                <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-pill bg-primary text-[11px] font-semibold text-white tabular-nums">
                  {avanzados}
                </span>
              )}
            </Button>

            {chipsVisibles.map((chip) => (
              <ChipAplicado key={chip.clave} onQuitar={() => quitarChip(chip)}>
                {chip.texto}
              </ChipAplicado>
            ))}

            {/* Los que no entraron no se esconden sin decirlo: el
                número dice cuántos son y el sheet los muestra todos. */}
            {chipsPlegados > 0 && (
              <Button
                variant="ghost"
                size="touch"
                className="px-3"
                onClick={() => setSheetPedido(true)}
                aria-haspopup="dialog"
                aria-label={`Ver los otros ${chipsPlegados} filtros`}
              >
                +{chipsPlegados} {chipsPlegados === 1 ? 'filtro' : 'filtros'}
              </Button>
            )}

            {/* Con un solo chip sobra: ese filtro se saca tocándolo. */}
            {chips.length > 1 && (
              <Button variant="ghost" size="touch" className="px-3" onClick={limpiarAvanzados}>
                <X aria-hidden />
                Limpiar
              </Button>
            )}
          </div>

          {/* ── Desktop: la barra completa ────────────────────────── */}
          <div className="hidden md:contents">
            {/* Estado: multi-select. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className={cn(actual.estados.length > 0 && 'border-primary/40 bg-tint')}
                >
                  {etiquetaEstados}
                  <ChevronDown aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px]">
                <ListaEstados
                  seleccionados={actual.estados}
                  onAlternar={alternarEstado}
                  onLimpiar={() => aplicar({ estados: [] })}
                />
              </PopoverContent>
            </Popover>

            {selectProfesional}
            {selectObraSocial}

            {/* Rango de fechas de emisión. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className={cn((actual.desde || actual.hasta) && 'border-primary/40 bg-tint')}
                >
                  <CalendarDays aria-hidden />
                  {etiquetaFechas}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-4">
                <RangoFechas
                  filtros={actual}
                  onAplicar={aplicar}
                  cerrarAlQuitar
                  idPrefijo="escritorio"
                />
              </PopoverContent>
            </Popover>

            {activos && (
              <Button variant="ghost" onClick={limpiarTodo}>
                <X aria-hidden />
                Limpiar {cantidad > 1 ? `(${cantidad})` : ''}
              </Button>
            )}

            <div className="ml-auto">
              <VistaToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Sheet de filtros de mobile: sin esto, un link con `?prof=` o
          `?os=` traía filtros que en el celular no se veían ni se podían
          sacar, y no había forma de filtrar por obra social o fecha. */}
      <Sheet open={sheetAbierto} onOpenChange={setSheetPedido}>
        <SheetContent alto="full" className="md:hidden">
          <SheetHeader className="flex items-baseline justify-between gap-3">
            <SheetTitle>Filtros</SheetTitle>
            {avanzados > 0 && (
              <span className="t-helper tabular-nums">
                {avanzados} {avanzados === 1 ? 'aplicado' : 'aplicados'}
              </span>
            )}
          </SheetHeader>

          <SheetBody className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <p className="t-label">Estado</p>
              <ListaEstados
                seleccionados={actual.estados}
                onAlternar={alternarEstado}
                onLimpiar={() => aplicar({ estados: [] })}
              />
            </section>

            <section className="flex flex-col gap-2">
              <p className="t-label">Profesional</p>
              {selectProfesional}
            </section>

            <section className="flex flex-col gap-2">
              <p className="t-label">Obra social</p>
              {selectObraSocial}
            </section>

            <section className="flex flex-col gap-2">
              <p className="t-label">Fecha de emisión</p>
              <RangoFechas filtros={actual} onAplicar={aplicar} idPrefijo="mobile" />
            </section>
          </SheetBody>

          <SheetFooter>
            <Button variant="primary" size="touch" full onClick={() => setSheetPedido(false)}>
              Ver los presupuestos
            </Button>
            {activos && (
              <Button
                variant="ghost"
                size="touch"
                full
                onClick={() => {
                  limpiarTodo()
                  setSheetPedido(false)
                }}
              >
                <X aria-hidden />
                {cantidad === 1 ? 'Limpiar el filtro' : `Limpiar los ${cantidad} filtros`}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Lo de abajo es de los filtros anteriores hasta que llegue lo
          nuevo: se atenúa en vez de fingir que ya está actualizado. */}
      <div
        aria-busy={pendiente}
        className={cn(
          'flex flex-col gap-5 transition-opacity duration-200',
          pendiente && 'opacity-55',
        )}
      >
        {children}
      </div>
    </>
  )
}

/** El multi-select de estados, compartido entre el popover y el sheet. */
function ListaEstados({
  seleccionados,
  onAlternar,
  onLimpiar,
}: {
  seleccionados: EstadoPresupuesto[]
  onAlternar: (estado: EstadoPresupuesto) => void
  onLimpiar: () => void
}) {
  return (
    <>
      <ul className="flex flex-col">
        {ESTADOS.map((estado) => {
          const activo = seleccionados.includes(estado)
          return (
            <li key={estado}>
              <button
                type="button"
                onClick={() => onAlternar(estado)}
                aria-pressed={activo}
                className="flex h-11 w-full items-center gap-2.5 rounded-input px-2 text-left transition-colors hover:bg-tint md:h-auto md:py-1.5"
              >
                <Check
                  aria-hidden
                  className={cn(
                    'size-4 shrink-0 text-primary',
                    activo ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <EstadoBadge estado={estado} size="sm" />
              </button>
            </li>
          )
        })}
      </ul>
      {seleccionados.length > 0 && (
        <div className="mt-1 border-t border-hairline pt-1">
          <Button variant="ghost" size="sm" full onClick={onLimpiar}>
            Ver todos los estados
          </Button>
        </div>
      )}
    </>
  )
}

function RangoFechas({
  filtros,
  onAplicar,
  cerrarAlQuitar,
  idPrefijo,
}: {
  filtros: FiltrosHome
  onAplicar: (parcial: Partial<FiltrosHome>) => void
  cerrarAlQuitar?: boolean
  idPrefijo: string
}) {
  const quitar = (
    <Button variant="ghost" size="sm" onClick={() => onAplicar({ desde: '', hasta: '' })}>
      Quitar el rango
    </Button>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`filtro-desde-${idPrefijo}`}>Desde</Label>
        <Input
          id={`filtro-desde-${idPrefijo}`}
          type="date"
          value={filtros.desde}
          max={filtros.hasta || undefined}
          onChange={(e) => onAplicar({ desde: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`filtro-hasta-${idPrefijo}`}>Hasta</Label>
        <Input
          id={`filtro-hasta-${idPrefijo}`}
          type="date"
          value={filtros.hasta}
          min={filtros.desde || undefined}
          onChange={(e) => onAplicar({ hasta: e.target.value })}
        />
      </div>
      {(filtros.desde || filtros.hasta) &&
        (cerrarAlQuitar ? <PopoverClose asChild>{quitar}</PopoverClose> : quitar)}
    </div>
  )
}

function CampoBusqueda({
  valor,
  onChange,
  onLimpiar,
  onBuscarYa,
  buscando,
}: {
  valor: string
  onChange: (v: string) => void
  onLimpiar: () => void
  onBuscarYa: () => void
  buscando: boolean
}) {
  return (
    <div className="relative" role="search">
      <Search
        aria-hidden
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint',
          // Un latido mientras el servidor contesta: dice "te escuché"
          // sin bloquear el campo ni mover nada de lugar.
          buscando && 'animate-pulse text-primary',
        )}
      />
      <Input
        id={ID_BUSQUEDA}
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onBuscarYa()
          } else if (e.key === 'Escape' && valor) {
            // Escape con texto limpia la búsqueda en vez de salirse del
            // campo: es el gesto que se repite todo el día.
            e.preventDefault()
            e.stopPropagation()
            onLimpiar()
          }
        }}
        placeholder="Buscar paciente, prestación, N.º o DNI"
        aria-label="Buscar paciente, prestación, número o DNI"
        className={cn(
          'h-11 pl-9 md:h-9 [&::-webkit-search-cancel-button]:appearance-none',
          // El `Kbd` sólo existe en desktop: en mobile no reserva lugar.
          valor ? 'pr-9' : 'pr-3 md:pr-10',
        )}
      />
      {valor ? (
        <button
          type="button"
          onClick={onLimpiar}
          aria-label="Limpiar la búsqueda"
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-pill text-faint transition-colors hover:bg-tint hover:text-ink md:size-6"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : (
        <Kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">/</Kbd>
      )}
    </div>
  )
}

/**
 * Un filtro puesto, con su forma de sacarlo.
 *
 * Contesta dos preguntas de una: por qué la lista se ve más corta de lo
 * esperado, y cómo volver atrás. Antes la barra de mobile sólo tenía el
 * contador del botón «Filtros», así que un link pegado con `?prof=`
 * mostraba «1» sin decir de quién.
 *
 * La × nunca va sola: siempre pegada al nombre del filtro, y el
 * `aria-label` dice la acción entera, porque una × leída por un lector
 * de pantalla no dice qué se estaría quitando.
 *
 * `truncate` con `max-w-full`: los nombres largos —«OSDE 210», una obra
 * social con plan— se recortan en vez de estirar la barra y traerse de
 * vuelta el scroll horizontal por otro lado.
 */
function ChipAplicado({ children, onQuitar }: { children: string; onQuitar: () => void }) {
  return (
    <button
      type="button"
      onClick={onQuitar}
      aria-label={`Quitar el filtro ${children}`}
      className="press inline-flex h-11 max-w-full items-center gap-1.5 rounded-pill border border-primary/40 bg-tint pl-4 pr-3 font-sans text-[13px] font-medium text-ink transition-colors hover:bg-primary/15"
    >
      <span className="min-w-0 truncate">{children}</span>
      <X aria-hidden className="size-4 shrink-0 text-muted" />
    </button>
  )
}

/**
 * Lista / Kanban. Sólo desktop: el kanban con drag & drop no tiene
 * sentido con el pulgar, así que en mobile ni se ofrece.
 */
function VistaToggle() {
  return (
    <div
      role="group"
      aria-label="Vista del listado"
      className="hidden items-center gap-1 rounded-pill border border-hairline bg-card p-1 md:inline-flex"
    >
      <span
        aria-current="page"
        className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-primary px-3.5 font-sans text-[13px] font-medium text-white"
      >
        <List aria-hidden className="size-4" />
        Lista
      </span>
      <Link
        href="/pipeline"
        className="inline-flex h-8 items-center gap-1.5 rounded-pill px-3.5 font-sans text-[13px] font-medium text-muted transition-colors hover:bg-tint hover:text-ink"
      >
        <LayoutGrid aria-hidden className="size-4" />
        Kanban
      </Link>
    </div>
  )
}
