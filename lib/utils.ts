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
