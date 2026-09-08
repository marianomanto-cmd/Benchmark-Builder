/**
 * Formato es-AR. Miles con punto, sin decimales, símbolo `$` separado
 * por espacio: `$ 128.400`.
 */

import { format, formatDistanceToNowStrict, differenceInCalendarDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const NUM = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** `$ 128.400` */
export function money(valor: number | string | null | undefined): string {
  const n = typeof valor === 'string' ? Number(valor) : (valor ?? 0)
  if (!Number.isFinite(n)) return '$ 0'
  return `$ ${NUM.format(Math.round(n))}`
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

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

/** `8 de septiembre de 2026` */
export function fechaLarga(value: string | Date): string {
  return format(toDate(value), "d 'de' MMMM 'de' yyyy", { locale: es })
}

/** `08/09/2026` */
export function fechaCorta(value: string | Date): string {
  return format(toDate(value), 'dd/MM/yyyy', { locale: es })
}

/** `8 sep` — para timelines y metadatos apretados. */
export function fechaBreve(value: string | Date): string {
  return format(toDate(value), 'd MMM', { locale: es })
}

/** `8 sep, 14:32` */
export function fechaHora(value: string | Date): string {
  return format(toDate(value), "d MMM, HH:mm", { locale: es })
}

/** `14:32` */
export function hora(value: string | Date): string {
  return format(toDate(value), 'HH:mm', { locale: es })
}

/** `hace 3 días` */
export function haceCuanto(value: string | Date): string {
  return `hace ${formatDistanceToNowStrict(toDate(value), { locale: es })}`
}

/** Días transcurridos desde una fecha, en días de calendario. */
export function diasDesde(value: string | Date): number {
  return Math.max(0, differenceInCalendarDays(new Date(), toDate(value)))
}

/** Días que faltan para una fecha. Negativo = ya venció. */
export function diasHasta(value: string | Date): number {
  return differenceInCalendarDays(toDate(value), new Date())
}

/** `vence en 12 días` · `vencido hace 3 días` · `vence hoy` */
export function vigenciaTexto(validoHasta: string | Date): string {
  const d = diasHasta(validoHasta)
  if (d === 0) return 'vence hoy'
  if (d < 0) return `vencido hace ${Math.abs(d)} ${Math.abs(d) === 1 ? 'día' : 'días'}`
  return `vence en ${d} ${d === 1 ? 'día' : 'días'}`
}

/** Fecha ISO `YYYY-MM-DD` en hora local, para inputs date y para la base. */
export function isoDate(value: Date = new Date()): string {
  return format(value, 'yyyy-MM-dd')
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
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Teléfono a formato wa.me: sólo dígitos, con código de país. */
export function telefonoWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length < 8) return null
  if (digitos.startsWith('54')) return digitos
  if (digitos.startsWith('0')) return `54${digitos.slice(1)}`
  return `54${digitos}`
}
