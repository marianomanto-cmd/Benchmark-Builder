/**
 * Datos del consultorio que van al encabezado y al pie del PDF.
 *
 * Vienen de las env `NEXT_PUBLIC_CONSULTORIO_*`. Se leen con el nombre
 * completo y literal (nada de `process.env[clave]`) porque Next
 * reemplaza estas variables en tiempo de build por su valor: si la
 * clave se arma dinámicamente, el reemplazo no ocurre y en producción
 * llega `undefined`.
 */

export interface DatosConsultorio {
  nombre: string
  direccion: string | null
  telefono: string | null
  email: string | null
}

function limpio(valor: string | undefined): string | null {
  const texto = valor?.trim()
  return texto ? texto : null
}

export function datosConsultorio(): DatosConsultorio {
  return {
    // El nombre es lo único que no puede faltar: firma el documento.
    nombre: limpio(process.env.NEXT_PUBLIC_CONSULTORIO_NOMBRE) ?? 'Smile Lab',
    direccion: limpio(process.env.NEXT_PUBLIC_CONSULTORIO_DIRECCION),
    telefono: limpio(process.env.NEXT_PUBLIC_CONSULTORIO_TELEFONO),
    email: limpio(process.env.NEXT_PUBLIC_CONSULTORIO_EMAIL),
  }
}

/** Las líneas de contacto que existen, en el orden del encabezado. */
export function lineasContacto(datos: DatosConsultorio): string[] {
  return [datos.direccion, datos.telefono, datos.email].filter(
    (linea): linea is string => Boolean(linea),
  )
}
