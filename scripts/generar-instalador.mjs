/**
 * Genera `supabase/instalar.sql` e `instalar-storage.sql` a partir de
 * `supabase/migrations/`.
 *
 * Existen para poder instalar la base pegando en el SQL Editor de
 * Supabase, sin la CLI. La fuente de verdad siguen siendo las
 * migraciones: si tocás una, corré `npm run sql:instalar` y commiteá
 * los dos archivos en el mismo cambio.
 *
 * Lo único que se transforma es `create policy`, que no acepta
 * `IF NOT EXISTS`: se le antepone el `drop policy if exists` para que
 * el script se pueda volver a correr.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const dirMigraciones = join(raiz, 'supabase', 'migrations')

const migraciones = readdirSync(dirMigraciones)
  .filter((f) => f.endsWith('.sql'))
  .sort()

const idempotente = (sql) =>
  sql.replace(
    /create policy\s+("[^"]+")\s+on\s+([\w.]+)/g,
    (_, nombre, tabla) =>
      `drop policy if exists ${nombre} on ${tabla};\ncreate policy ${nombre} on ${tabla}`,
  )

const CABECERA_1 = `-- ════════════════════════════════════════════════════════════════════
--  SMILE LAB · PRESUPUESTOS — INSTALACIÓN  ·  PARTE 1 de 3
--  Esquema, guardas, RPC, vistas y RLS.
--
--  CÓMO: Supabase → SQL Editor → New query → pegar TODO → Run.
--  Corre entero o no corre: si algo falla, no queda nada a medias.
--
--  NO editar acá. Se genera desde \`supabase/migrations/\` con
--  \`npm run sql:instalar\`. La fuente de verdad son las migraciones.
--
--  ¿Ya lo corriste y querés empezar de cero? Descomentá el bloque de
--  abajo (BORRA TODOS LOS DATOS) y corré el script otra vez.
-- ════════════════════════════════════════════════════════════════════

-- ─── RESET · descomentar sólo para reinstalar desde cero ────────────
-- drop view if exists aranceles_usos, aranceles_programados,
--                     aranceles_vigentes, presupuestos_listado cascade;
-- drop table if exists presupuesto_eventos, presupuesto_cuotas,
--                      presupuesto_items, presupuestos, aranceles,
--                      prestacion_cuotas, prestaciones, pacientes,
--                      obras_sociales, profesionales cascade;
-- drop type if exists estado_presupuesto, motivo_perdida, tipo_cobertura cascade;
-- drop sequence if exists presupuesto_seq cascade;
-- drop function if exists calcular_cobertura, actor_nombre, nueva_vigencia,
--                         aumento_masivo, crear_presupuesto, duplicar_presupuesto,
--                         cambiar_estado, registrar_evento, marcar_pendientes,
--                         arancel_vigente, touch_updated_at, touch_estado_desde,
--                         set_presupuesto_numero, guard_arancel_inmutable,
--                         guard_arancel_no_delete, guard_item_emitido,
--                         guard_evento_inmutable, guard_presupuesto_emitido cascade;
-- ────────────────────────────────────────────────────────────────────
`

const CABECERA_2 = `-- ════════════════════════════════════════════════════════════════════
--  SMILE LAB · PRESUPUESTOS — INSTALACIÓN  ·  PARTE 2 de 3
--  Storage: bucket privado \`presupuestos\` para los PDF.
--
--  Va aparte porque las policies de \`storage.objects\` dependen de
--  permisos que algunos proyectos no dan desde el SQL Editor. Si esta
--  parte falla, la 1 ya quedó aplicada y el bucket se puede crear a
--  mano: Storage → New bucket → nombre \`presupuestos\`, PRIVADO.
-- ════════════════════════════════════════════════════════════════════
`

function armar(cabecera, archivos) {
  const partes = [cabecera]
  for (const f of archivos) {
    partes.push(`\n-- ═══ ${f} ═══\n`)
    partes.push(idempotente(readFileSync(join(dirMigraciones, f), 'utf8')))
  }
  return partes.join('\n')
}

const esStorage = (f) => f.includes('storage')

writeFileSync(
  join(raiz, 'supabase', 'instalar.sql'),
  armar(CABECERA_1, migraciones.filter((f) => !esStorage(f))),
)
writeFileSync(
  join(raiz, 'supabase', 'instalar-storage.sql'),
  armar(CABECERA_2, migraciones.filter(esStorage)),
)

console.log(
  `✓ instalar.sql (${migraciones.filter((f) => !esStorage(f)).length} migraciones) ` +
    `e instalar-storage.sql generados desde supabase/migrations/`,
)
