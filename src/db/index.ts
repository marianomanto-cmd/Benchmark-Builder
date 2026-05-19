/**
 * Cliente Drizzle (postgres-js). Lazy: sólo se conecta cuando se usa, así el
 * build no requiere DATABASE_URL. Aún no lo consume ninguna pantalla (Fase 2).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está seteada. Configurá la conexión de Supabase en Vercel.");
  }
  const client = postgres(url, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

export { schema };
