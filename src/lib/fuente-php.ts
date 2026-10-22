// Modo PHP (hosting con Apache + PHP + MariaDB): Astro solo compila HTML estático. Los datos del directorio (125 médicos del sitio anterior)
// salen de las migraciones SQLite al compilar; en el navegador, src/components/directorio/vivo.ts los refresca desde /api/directorio.
// Las zonas privadas no pasan por aquí: las sirve PHP contra MariaDB (php/).
import { d1Local } from './d1-local.ts';
import type { DB } from './db.ts';

let base: DB | null = null;

export async function getDB(): Promise<DB> {
  return (base ??= d1Local().db);
}

export const getEnv = async () => ({}) as { SESSION_SECRET?: string; ICE_SERVERS?: string; LOGIN_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> } };
