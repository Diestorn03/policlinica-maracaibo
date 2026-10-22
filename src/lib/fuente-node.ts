// Modo Node (servidor propio, p. ej. Webuzo): la base es un archivo SQLite (DATA_DIR/policlinica.db) y las migraciones
// pendientes se aplican al arrancar. astro.config elige este archivo como '#fuente' con --mode node.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { hashClave } from './auth.ts';
import { d1Local } from './d1-local.ts';
import type { DB } from './db.ts';

const e = process.env;
let base: DB | null = null;
const intentos = new Map<string, number[]>();

export async function getDB(): Promise<DB> {
  if (base) return base;
  const dir = e.DATA_DIR ?? 'data';
  mkdirSync(dir, { recursive: true });
  const { db, raw } = d1Local(e.MIGRACIONES ?? 'migrations', join(dir, 'policlinica.db'));
  // primer administrador sin consola: ADMIN_CORREO y ADMIN_CLAVE en el entorno; solo actúa si todavía no hay ninguno (luego se pueden quitar)
  if (e.ADMIN_CORREO && e.ADMIN_CLAVE && !raw.prepare("SELECT 1 FROM usuarios WHERE rol = 'admin'").get()) {
    raw.prepare("INSERT INTO usuarios (rol, nombre, correo, clave_hash) VALUES ('admin', ?, ?, ?)").run(e.ADMIN_NOMBRE ?? 'Administración', e.ADMIN_CORREO.toLowerCase(), await hashClave(e.ADMIN_CLAVE));
  }
  return (base = db);
}

export const getEnv = async () => ({
  SESSION_SECRET: e.SESSION_SECRET,
  JITSI_DOMAIN: e.JITSI_DOMAIN,
  // 5 intentos de inicio de sesión por minuto e IP (en memoria: basta con un solo proceso)
  LOGIN_LIMIT: {
    limit: async ({ key }: { key: string }) => {
      const ahora = Date.now();
      const l = (intentos.get(key) ?? []).filter((t) => ahora - t < 60_000);
      l.push(ahora);
      intentos.set(key, l);
      return { success: l.length <= 5 };
    },
  },
}) as { SESSION_SECRET?: string; JITSI_DOMAIN?: string; LOGIN_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> } };
