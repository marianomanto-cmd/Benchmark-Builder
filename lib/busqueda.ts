/**
 * Cómo se busca en toda la app.
 *
 * La columna `busqueda` de `pacientes` y de `presupuestos_listado` ya
 * viene normalizada desde la base —sin acentos, en minúsculas, con
 * todos los campos buscables concatenados— así que acá sólo hay que
 * dejar el término del mismo lado.
 *
 * Dos reglas, y las dos salen de cómo escribe la gente:
 *
 * 1. **Sin acentos.** Nadie tipea «Gómez» con tilde en un buscador, y
 *    la mitad de una agenda argentina lleva uno. `normalizar()` es el
 *    par en TS de `sin_acentos()` en SQL: tienen que dar lo mismo.
 *
 * 2. **Palabra por palabra, en cualquier orden.** Los pacientes se
 *    guardan «Apellido, Nombre» y la coma no puede viajar en el filtro
 *    (PostgREST arma el `or=` con comas), así que buscar la frase
 *    entera como una subcadena literal no encontraba nada: ni «Gómez
 *    Renata», ni «Renata Gómez», ni lo copiado y pegado del propio
 *    listado. Cada palabra se exige por separado.
 */

import { normalizar } from './formato.ts'

/**
 * Los metacaracteres de PostgREST parten el filtro en dos, y los
 * comodines de `like` convertirían «100%» en una búsqueda que trae
 * todo. Se sacan antes de armar la consulta.
 */
const METACARACTERES = /[,()"\\%*]/g

/** Más de esto no aporta y sí alarga la consulta. */
const MAX_PALABRAS = 6

/**
 * El término tipeado → las palabras contra las que hay que filtrar.
 *
 * Vacío significa «sin búsqueda»: quien llama no agrega ningún filtro.
 */
export function palabrasBusqueda(termino: string): string[] {
  return normalizar(termino.replace(METACARACTERES, ' '))
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_PALABRAS)
}

/**
 * Un DNI se guarda con puntos («32.114.556») y se busca sin ellos.
 * Intercalar comodines entre los dígitos hace que «32114556» encuentre
 * «32.114.556» sin tener que guardar el campo de otra forma.
 *
 * Sólo para una palabra de PUROS dígitos. El patrón intercalado es
 * larguísimo y muy laxo —cualquier fila que tenga esos dígitos en ese
 * orden, con lo que sea en el medio, entra—, así que aplicarlo a algo
 * que ya trae separadores rompe la búsqueda en vez de ayudarla:
 * «2026-0003» devolvía 40 presupuestos en lugar de 1, porque
 * `%2%0%2%6%0%0%0%3%` le calza a casi cualquier número. Si la persona
 * escribió los puntos o el guión, ya sabe la forma exacta y el `like`
 * común alcanza.
 *
 * `null` también cuando hay menos de tres dígitos: con dos, el patrón
 * trae media agenda.
 */
export function patronDeDigitos(termino: string): string | null {
  if (!/^\d+$/.test(termino)) return null
  if (termino.length < 3) return null
  return `%${termino.split('').join('%')}%`
}

/**
 * La misma búsqueda, del lado del cliente.
 *
 * Los comboboxes del wizard se traen el catálogo entero y filtran en
 * memoria, así que no pasan por la columna `busqueda` de la base. Tienen
 * que encontrar exactamente lo mismo: si el listado encuentra a «Gómez,
 * Renata» tipeando «gomez renata» y el picker no, la pantalla ofrece
 * «Crear paciente» y la agenda termina con dos fichas de la misma
 * persona.
 */
export function coincide(texto: string, termino: string): boolean {
  const palabras = palabrasBusqueda(termino)
  if (palabras.length === 0) return true

  const heno = normalizar(texto)
  // Los números se guardan con puntos («32.114.556») y se tipean sin
  // ellos: se compara también contra los dígitos pelados.
  const digitos = heno.replace(/\D/g, '')

  return palabras.every(
    (palabra) =>
      heno.includes(palabra) || (/^\d+$/.test(palabra) && digitos.includes(palabra)),
  )
}
