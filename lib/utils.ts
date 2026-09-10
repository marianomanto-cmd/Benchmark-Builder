import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Clave local estable para filas del wizard, sin depender de crypto. */
let contador = 0
export function nuevaKey(prefijo = 'k'): string {
  contador += 1
  return `${prefijo}_${contador}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Clave de idempotencia del alta de un presupuesto.
 *
 * La genera el wizard al empezar a cargar y viaja con el payload: si la
 * respuesta de la RPC se pierde en el camino y el usuario reintenta, el
 * servidor reconoce que es el MISMO pedido y devuelve el documento que
 * ya emitió en lugar de emitir otro con otro número.
 *
 * `crypto.randomUUID` no existe fuera de un contexto seguro (la app
 * abierta por IP en la red del consultorio, por ejemplo), así que hay
 * un camino de reserva: lo que importa es que sea un UUID válido y que
 * no se repita, no que sea criptográficamente fuerte.
 */
export function nuevaClaveAlta(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()

  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** ¿El texto tiene forma de UUID? Se usa para validar el borrador guardado. */
export function esUuid(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
  )
}
