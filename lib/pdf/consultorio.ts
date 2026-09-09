/**
 * Datos del consultorio que van al encabezado y al pie del PDF.
 *
 * Son constantes, no variables de entorno: el consultorio es uno solo y
 * estos datos no cambian entre producción, preview y local. Ponerlos en
 * Vercel obligaba a cargar cuatro variables en tres entornos para un
 * dato que se escribe una vez.
 *
 * **Acá se editan.** Es el único lugar.
 */

export interface DatosConsultorio {
  nombre: string
  direccion: string | null
  telefono: string | null
  email: string | null
}

/**
 * Completar con los datos reales del consultorio.
 *
 * Lo que quede en `null` simplemente no se imprime: el PDF sale sin esa
 * línea, sin huecos ni etiquetas vacías.
 */
export const CONSULTORIO: DatosConsultorio = {
  nombre: 'Smile Lab',
  direccion: null,
  telefono: null,
  email: null,
}

export function datosConsultorio(): DatosConsultorio {
  return CONSULTORIO
}

/** Las líneas de contacto que existen, en el orden del encabezado. */
export function lineasContacto(datos: DatosConsultorio): string[] {
  return [datos.direccion, datos.telefono, datos.email].filter(
    (linea): linea is string => Boolean(linea),
  )
}
