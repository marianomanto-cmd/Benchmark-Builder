/**
 * Zod, con los mensajes en castellano.
 *
 * Los schemas de las server actions traen su mensaje escrito a mano en
 * cada regla que se puede tocar desde la pantalla, y ese es el que se
 * muestra. Pero ninguna lista de reglas está completa: alcanza con que
 * alguien pegue una descripción de 300 caracteres, o que un `uuid` que
 * la UI siempre manda bien llegue vacío, para que el banner del wizard
 * muestre «Too big: expected string to have <=200 characters» arriba de
 * un presupuesto entero cargado.
 *
 * Configurar el locale es la red de abajo: no reemplaza a los mensajes
 * escritos —que son mejores, porque hablan del consultorio y no del
 * schema— pero garantiza que lo que se filtre esté en el idioma de
 * quien lo lee.
 *
 * `z.config()` es global y se lee al validar, no al construir el
 * schema: importar `z` desde este módulo es lo que asegura que el
 * locale ya esté puesto cuando corre el primer `safeParse`.
 */

import { z } from 'zod'

z.config(z.locales.es())

export { z }
