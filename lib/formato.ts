/**
 * Formato es-AR. Miles con punto, sin decimales, símbolo `$` separado
 * por espacio: `$ 128.400`.
 *
 * ZONA HORARIA — por qué esto no usa la hora local del proceso.
 *
 * La app se renderiza en dos lugares con relojes distintos: el
 * navegador del consultorio (Buenos Aires, UTC−3) y la función de
 * Vercel (**UTC**, siempre). El timeline, la cabecera del detalle y el
 * PDF se arman en el servidor, así que `format()` a secas mostraba cada
 * hora tres horas adelantada: un WhatsApp enviado a las 11:32 figuraba
 * «14:32», y entre las 21:00 y la medianoche lo de hoy aparecía como
 * «Ayer» y el reloj de días sin respuesta sumaba uno de más. Encima el
 * mismo texto se re-renderizaba distinto en el cliente, que sí está en
 * hora argentina: mismatch de hidratación.
 *
 * Acá todo instante se lleva a la hora de pared del consultorio con
 * `Intl` —que ya viene en la plataforma, sin dependencias nuevas— y
 * recién ahí se formatea. Un `YYYY-MM-DD` pelado (fecha de emisión,
 * vigencia de un arancel) NO es un instante sino un día del calendario:
 * convertirlo de zona lo correría un día para atrás en el PDF, así que
 * se formatea tal cual viene.
 */

import { format, formatDistanceToNowStrict, differenceInCalendarDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/** El consultorio es uno solo y está en Córdoba/Buenos Aires (UTC−3). */
export const ZONA_CONSULTORIO = 'America/Argentina/Buenos_Aires'

const NUM = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * `$ 128.400` — negativo como `− $ 1.234`, nunca `$ -1.234`.
 *
 * El espacio entre el signo y los dígitos es DURO (U+00A0). Con un
 * espacio común el navegador puede cortar ahí, y a 320-360px eso se ve:
 * en las tarjetas de Estadísticas quedaba «$» solo en un renglón y
 * «1.765.700» en el de abajo. `<Monto>` pone `whitespace-nowrap` y su
 * comentario dice «todo monto en pantalla pasa por acá», pero hay 48
 * llamadas directas a `money()` que no pasan: en los títulos de las
 * tarjetas, en el sheet de WhatsApp, en el PDF. Arreglarlo en el string
 * las cubre todas y no depende de que cada lugar se acuerde de la
 * clase.
 */
const DURO = '\u00A0'

export function money(valor: number | string | null | undefined): string {
  const n = typeof valor === 'string' ? Number(valor) : (valor ?? 0)
  if (!Number.isFinite(n)) return `$${DURO}0`
  const entero = Math.round(n)
  return entero < 0
    ? `−${DURO}$${DURO}${NUM.format(-entero)}`
    : `$${DURO}${NUM.format(entero)}`
}

/** `128.400`, sin símbolo — para celdas que ya tienen el `$` en el header. */
export function numero(valor: number | string | null | undefined): string {
  const n = typeof valor === 'string' ? Number(valor) : (valor ?? 0)
  if (!Number.isFinite(n)) return '0'
  return NUM.format(Math.round(n))
}

/** `70 %` — decimal con coma, espacio antes del signo. */
export function porcentaje(valor: number | string | null | undefined): string {
  const n = typeof valor === 'string' ? Number(valor) : (valor ?? 0)
  if (!Number.isFinite(n)) return '0 %'
  const texto = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
  return `${texto} %`
}

/* ═══════════════════════════════════════════════════════════
   Fechas — el reloj del consultorio, no el del proceso
   ═══════════════════════════════════════════════════════════ */

/** `2026-09-08`: un día del calendario, no un instante. */
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/

const PARTES_ZONA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_CONSULTORIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/**
 * El mismo instante, expresado como un `Date` cuyos componentes
 * **locales** son la hora de pared de Buenos Aires. Es el truco que
 * permite seguir usando `date-fns` (que trabaja en hora local) sin
 * agregar `@date-fns/tz` ni ninguna otra dependencia.
 */
function relojDelConsultorio(instante: Date): Date {
  if (Number.isNaN(instante.getTime())) return instante
  const p: Record<string, string> = {}
  for (const parte of PARTES_ZONA.formatToParts(instante)) p[parte.type] = parte.value
  return new Date(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    // Algunos motores devuelven «24» para la medianoche.
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  )
}

/** El instante real, sin mover: para medir duraciones. */
function instanteDe(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

/**
 * Lo que hay que formatear. Un `YYYY-MM-DD` es un día del calendario y
 * se respeta tal cual; cualquier otra cosa es un instante y se lleva a
 * la hora del consultorio.
 */
function toDate(value: string | Date): Date {
  if (typeof value === 'string' && SOLO_FECHA.test(value)) return parseISO(value)
  return relojDelConsultorio(instanteDe(value))
}

/** Lo que se muestra cuando no hay fecha que mostrar. */
const SIN_FECHA = '—'

/** Ni fecha ni instante: `null`, `undefined` o un string en blanco. */
function vacia(value: string | Date | null | undefined): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

/**
 * Formatea, o dice que no hay fecha. **Nunca tira.**
 *
 * `format()` de date-fns lanza `RangeError: Invalid time value` con una
 * fecha inválida, y acá abajo eso no es una hipótesis: los campos de
 * fecha del wizard son `<input type="date">`, y vaciar uno con Backspace
 * —algo que cualquiera hace para corregir— manda `''`. Eso llegaba a
 * `fechaLarga()` y se llevaba puesta la pantalla entera: el error subía
 * hasta el boundary y la recepción veía «Se rompió algo» en medio de
 * cargar un presupuesto.
 *
 * El arreglo va en la fuente y no en cada pantalla: son diez funciones
 * de fecha usadas en toda la app, y taparlo en el wizard dejaba las
 * otras nueve esperando el mismo Backspace.
 */
function formatear(value: string | Date | null | undefined, patron: string): string {
  if (vacia(value)) return SIN_FECHA
  const fecha = toDate(value as string | Date)
  if (Number.isNaN(fecha.getTime())) return SIN_FECHA
  return format(fecha, patron, { locale: es })
}

/** «Ahora» en hora del consultorio. Es el hoy contra el que se compara. */
export function ahora(): Date {
  return relojDelConsultorio(new Date())
}

/** `8 de septiembre de 2026` */
export function fechaLarga(value: string | Date | null | undefined): string {
  return formatear(value, "d 'de' MMMM 'de' yyyy")
}

/** `08/09/2026` */
export function fechaCorta(value: string | Date | null | undefined): string {
  return formatear(value, 'dd/MM/yyyy')
}

/** `8 sep` — para timelines y metadatos apretados. */
export function fechaBreve(value: string | Date | null | undefined): string {
  return formatear(value, 'd MMM')
}

/** `8 sep, 14:32` */
export function fechaHora(value: string | Date | null | undefined): string {
  return formatear(value, 'd MMM, HH:mm')
}

/** `14:32` */
export function hora(value: string | Date | null | undefined): string {
  return formatear(value, 'HH:mm')
}

/** El año calendario del consultorio — para no repetirlo si es el actual. */
export function anio(value: string | Date | null | undefined): number {
  const fecha = vacia(value) ? null : toDate(value as string | Date)
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha.getFullYear() : ahora().getFullYear()
}

/**
 * `hace 3 días` — se mide contra el instante real, no contra el reloj
 * movido de zona.
 *
 * Abajo del minuto dice «recién». Es el caso más común de todos: al
 * guardar una nota o cambiar un estado, la pantalla se revalida y el
 * timeline aparecía anunciando «hace 0 segundos», que se lee como un
 * error de la app y no como «esto lo acabás de hacer vos».
 */
export function haceCuanto(value: string | Date | null | undefined): string {
  if (vacia(value)) return SIN_FECHA
  const instante = instanteDe(value as string | Date)
  if (Number.isNaN(instante.getTime())) return SIN_FECHA
  const segundos = (Date.now() - instante.getTime()) / 1000
  /*
   * El futuro también es «recién», no «hace».
   *
   * `formatDistanceToNowStrict` no lleva sufijo, así que el «hace» se
   * pegaba igual y un instante que todavía no ocurrió se anunciaba como
   * pasado: «hace 3 días» para un evento del 14/09. Y con el guard
   * anterior en `>= 0`, bastaba con que el reloj de Postgres fuera unos
   * milisegundos por delante del proceso que renderiza —en producción
   * son dos máquinas distintas, la función de Vercel y la base de
   * Supabase— para que el evento recién creado se saltara «recién» y
   * mostrara «hace 1 segundo», que es exactamente lo que «recién»
   * existe para evitar.
   */
  if (segundos < 60) return 'recién'
  return `hace ${formatDistanceToNowStrict(instante, { locale: es })}`
}

/** Días transcurridos desde una fecha, en días de calendario del consultorio. */
export function diasDesde(value: string | Date | null | undefined): number {
  if (vacia(value)) return 0
  const fecha = toDate(value as string | Date)
  if (Number.isNaN(fecha.getTime())) return 0
  return Math.max(0, differenceInCalendarDays(ahora(), fecha))
}

/** Días que faltan para una fecha. Negativo = ya venció. */
export function diasHasta(value: string | Date | null | undefined): number {
  if (vacia(value)) return 0
  const fecha = toDate(value as string | Date)
  if (Number.isNaN(fecha.getTime())) return 0
  return differenceInCalendarDays(fecha, ahora())
}

/** `vence en 12 días` · `vencido hace 3 días` · `vence hoy` */
export function vigenciaTexto(validoHasta: string | Date | null | undefined): string {
  // `diasHasta` devuelve 0 ante una fecha inválida —es un default sano
  // para comparar— pero acá 0 significa «vence hoy», que sería una
  // afirmación inventada. Se valida antes de hablar.
  if (vacia(validoHasta)) return SIN_FECHA
  if (Number.isNaN(toDate(validoHasta as string | Date).getTime())) return SIN_FECHA
  const d = diasHasta(validoHasta)
  if (d === 0) return 'vence hoy'
  if (d < 0) return `vencido hace ${Math.abs(d)} ${Math.abs(d) === 1 ? 'día' : 'días'}`
  return `vence en ${d} ${d === 1 ? 'día' : 'días'}`
}

/**
 * Fecha ISO `YYYY-MM-DD` para inputs date y para la base.
 *
 * Sin argumento es **hoy en el consultorio**: en el servidor (UTC) un
 * `new Date()` pelado adelanta el día a partir de las 21:00, y con eso
 * se emitían presupuestos fechados mañana. Con un `Date` explícito se
 * formatea tal cual: quien lo arma ya eligió el día (`addDays`,
 * `startOfMonth`) sobre su propio calendario.
 */
export function isoDate(value: Date = ahora()): string {
  // Una fecha inválida acá devolvía un throw que no tenía dónde caer:
  // se usa para armar rangos y para el `value` de los inputs.
  if (Number.isNaN(value.getTime())) return format(ahora(), 'yyyy-MM-dd')
  return format(value, 'yyyy-MM-dd')
}

/**
 * El día del calendario del consultorio para un instante dado.
 *
 * `isoDate()` formatea un `Date` tal cual: sirve para armar rangos y
 * para el `value` de un input, donde quien llama ya eligió el día. Esto
 * es lo otro: agarra un `created_at` en UTC y contesta bajo qué día lo
 * archiva el consultorio.
 *
 * Es la clave con la que hay que agrupar cualquier lista por día. Si se
 * agrupa con los getters locales del proceso —que en Vercel es UTC— un
 * evento de las 23:30 cae bajo el día siguiente, mientras su propia
 * etiqueta, que sí pasa por `America/Argentina/Buenos_Aires`, dice el
 * día correcto: la misma tarjeta se contradice.
 */
export function diaCalendario(value: string | Date | null | undefined): string {
  if (vacia(value)) return SIN_FECHA
  const fecha = toDate(value as string | Date)
  if (Number.isNaN(fecha.getTime())) return SIN_FECHA
  return format(fecha, 'yyyy-MM-dd')
}

/** Iniciales para avatares: `Gómez, Renata` → `GR` */
export function iniciales(nombre: string): string {
  return nombre
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** `Gómez, Renata` → `Renata` — para el saludo de los mensajes. */
export function nombreDePila(nombre: string): string {
  if (nombre.includes(',')) {
    const [, resto] = nombre.split(',')
    return (resto ?? '').trim().split(/\s+/)[0] || nombre.trim()
  }
  return nombre.trim().split(/\s+/)[0] || nombre
}

/** Normaliza para buscar sin acentos ni mayúsculas. */
/**
 * La matrícula como se muestra: `MP 12.345`.
 *
 * El campo es texto libre y en el consultorio se carga de las dos
 * formas —«12.345» y «MP 12.345»—, así que prefijar sin mirar daba
 * «MP MP 34.567» en la cabecera del detalle, en la firma del PDF y en
 * el mensaje de WhatsApp. Se respeta lo que ya trae prefijo, incluida
 * la matrícula nacional (MN), que prefijar con MP directamente
 * falsearía.
 */
export function matricula(valor: string | null | undefined): string | null {
  const limpio = (valor ?? '').trim()
  if (!limpio) return null
  // Sin `\b` después de la letra: el límite de palabra exige un
  // separador, así que «MP12345» y «MN9876» —como se carga cuando nadie
  // pone el espacio— no se reconocían y salían «MP MP12345» y
  // «MP MN9876». Lo segundo es justo lo que el comentario de arriba
  // dice que no puede pasar.
  return /^m\.?\s?[pn]\.?\s?[\d-]/i.test(limpio) || /^m\.?\s?[pn]\.?$/i.test(limpio)
    ? limpio
    : `MP ${limpio}`
}

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Teléfono argentino a formato wa.me.
 *
 * WhatsApp exige `54` + `9` + código de área + abonado para un celular
 * argentino, y NO acepta el `15` que se marca a nivel local ni el `0`
 * de larga distancia. Un `wa.me/543515550134` (sin el 9) abre un chat
 * vacío o directamente falla, así que hay que armarlo bien.
 *
 * Se aceptan las formas en que el consultorio carga un número en la
 * ficha:
 *   +54 9 351 555-0134 · +54 351 555-0134 · 0351 15 555-0134
 *   351 155550134      · 3515550134       · 00 54 9 351 5550134
 *
 * Devuelve `null` cuando no queda un número usable: quien llama tiene
 * que ofrecer cargar el teléfono en vez de abrir un chat roto.
 */
export function telefonoWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null

  let d = telefono.replace(/\D/g, '')
  if (!d) return null

  if (d.startsWith('00')) d = d.slice(2)   // internacional marcado a mano
  if (d.startsWith('54')) d = d.slice(2)   // país
  if (d.startsWith('9')) d = d.slice(1)    // el 9 lo agregamos al final
  if (d.startsWith('0')) d = d.slice(1)    // larga distancia nacional

  // El `15` va después del código de área, que en Argentina tiene entre
  // 2 y 4 dígitos. El número nacional sin el 15 son 10 dígitos: si
  // sacando ese par quedan 10, era el 15 y no parte del abonado.
  if (d.length === 12) {
    for (const corte of [2, 3, 4]) {
      if (d.slice(corte, corte + 2) === '15') {
        d = d.slice(0, corte) + d.slice(corte + 2)
        break
      }
    }
  }

  // Área más corta (11) + abonado más corto deja 10 dígitos; por debajo
  // de 8 no hay número que valga.
  if (d.length < 8) return null

  return `549${d}`
}
