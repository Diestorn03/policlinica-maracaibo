// node:sqlite con la forma de la API de D1, con las migraciones reales aplicadas. Lo usan los tests, el modo demo
// (GitHub Pages, en memoria) y el modo Node (archivo en el servidor; solo corre las migraciones que faltan).
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DB } from './db.ts';

export function d1Local(dirMigraciones = 'migrations', archivo = ':memory:'): { db: DB; raw: DatabaseSync } {
  const raw = new DatabaseSync(archivo);
  raw.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS _migraciones (nombre TEXT PRIMARY KEY)');
  const hechas = new Set((raw.prepare('SELECT nombre FROM _migraciones').all() as { nombre: string }[]).map((m) => m.nombre));
  for (const f of readdirSync(dirMigraciones).sort().filter((f) => f.endsWith('.sql') && !hechas.has(f))) {
    raw.exec(`BEGIN; ${readFileSync(join(dirMigraciones, f), 'utf8')}
; INSERT INTO _migraciones VALUES ('${f}'); COMMIT`);
  }
  const stmt = (sql: string, args: unknown[] = []): ReturnType<DB['prepare']> => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    all: async () => ({ results: raw.prepare(sql).all(...(args as [])) as Record<string, unknown>[] }),
    first: async () => (raw.prepare(sql).get(...(args as [])) as Record<string, unknown>) ?? null,
    run: async () => {
      const r = raw.prepare(sql).run(...(args as []));
      return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } };
    },
  });
  const db: DB = { prepare: (sql) => stmt(sql), batch: async (list) => { for (const s of list) await s.run(); } };
  return { db, raw };
}
