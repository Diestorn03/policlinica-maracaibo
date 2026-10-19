// node:sqlite con la forma de la API de D1, con las migraciones reales aplicadas. Lo usan los tests y el modo demo
// (GitHub Pages), que arma la base al compilar. Nunca llega al navegador ni a Cloudflare.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DB } from './db.ts';

export function d1Local(dirMigraciones = 'migrations'): { db: DB; raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  for (const f of readdirSync(dirMigraciones).sort()) raw.exec(readFileSync(join(dirMigraciones, f), 'utf8'));
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
