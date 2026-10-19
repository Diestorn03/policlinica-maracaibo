// Telemedicina: sala de espera (cola general) → el médico atiende y se genera el enlace de la videollamada.
// "En vivo" = los paneles consultan /api/espera y /api/cola cada pocos segundos.
// ponytail: sondeo cada 4 s; Durable Objects + WebSocket si algún día hay cientos de pacientes a la vez.
import type { DB } from './db.ts';
import { edad } from './usuarios.ts';

export type Estado = 'espera' | 'atendiendo' | 'finalizada' | 'cancelada';
export interface Activa { id: number; estado: Estado; enlace: string | null; creada: string; atendida: string | null; medico: string | null; posicion: number }
export interface EnCola { id: number; motivo: string; creada: string; paciente: string; edad: number | null }
export interface Pasada { id: number; estado: Estado; motivo: string; creada: string; atendida: string | null; finalizada: string | null; paciente: string; medico: string | null }

/** Las fechas de SQLite vienen en UTC sin zona: "2026-10-19 19:20:00" */
export const aFecha = (s: string) => new Date(s.replace(' ', 'T') + 'Z');

/** Saca de la cola a quien cerró la página (5 min sin latido: el móvil congela pestañas en segundo plano) y cierra consultas olvidadas (4 h). */
const limpiar = (db: DB) => db.batch([
  db.prepare("UPDATE consultas SET estado = 'cancelada', finalizada = datetime('now') WHERE estado = 'espera' AND visto < datetime('now', '-5 minutes')"),
  db.prepare("UPDATE consultas SET estado = 'finalizada', finalizada = datetime('now') WHERE estado = 'atendiendo' AND atendida < datetime('now', '-4 hours')"),
]);

/** El cliente entra a la sala. Error en texto si su afiliación venció. Si ya estaba en la sala, no duplica. */
export async function entrar(db: DB, clienteId: number, motivo = ''): Promise<string | null> {
  const u = await db.prepare("SELECT afiliacion_vence AS v FROM usuarios WHERE id = ?1 AND rol = 'cliente' AND activo = 1").bind(clienteId).first();
  if (!u) return 'Tu usuario no está habilitado para telemedicina.';
  if (u.v && String(u.v) < new Date().toISOString().slice(0, 10)) return `Tu afiliación venció el ${String(u.v).split('-').reverse().join('/')}. Escríbenos para renovarla.`;
  await limpiar(db);
  await db.prepare('INSERT OR IGNORE INTO consultas (cliente_id, motivo) VALUES (?1, ?2)').bind(clienteId, motivo.trim().slice(0, 200)).run();
  return null;
}

/** Latido + estado de la consulta activa del cliente (null si no tiene). */
export async function estado(db: DB, clienteId: number): Promise<Activa | null> {
  await db.prepare("UPDATE consultas SET visto = datetime('now') WHERE cliente_id = ?1 AND estado = 'espera'").bind(clienteId).run();
  return (await db.prepare(`SELECT c.id, c.estado, c.enlace, c.creada, c.atendida, m.nombre AS medico,
      (SELECT COUNT(*) FROM consultas o WHERE o.estado = 'espera' AND o.id <= c.id) AS posicion
    FROM consultas c LEFT JOIN usuarios m ON m.id = c.medico_id
    WHERE c.cliente_id = ?1 AND c.estado IN ('espera', 'atendiendo')`).bind(clienteId).first()) as Activa | null;
}

export const cancelar = (db: DB, clienteId: number) =>
  db.prepare("UPDATE consultas SET estado = 'cancelada', finalizada = datetime('now') WHERE cliente_id = ?1 AND estado = 'espera'").bind(clienteId).run();

/** Lo que ve el médico: la cola en orden de llegada y sus consultas en curso. */
export async function cola(db: DB, medicoId: number): Promise<{ espera: EnCola[]; enCurso: (EnCola & { enlace: string })[] }> {
  await limpiar(db);
  const q = (where: string) => db.prepare(`SELECT c.id, c.motivo, c.creada, c.enlace, u.nombre AS paciente, u.nacimiento
    FROM consultas c JOIN usuarios u ON u.id = c.cliente_id WHERE ${where} ORDER BY c.id`);
  const [espera, enCurso] = await Promise.all([q("c.estado = 'espera'").all(), q("c.estado = 'atendiendo' AND c.medico_id = ?1").bind(medicoId).all()]);
  const fila = (r: Record<string, unknown>) => ({ ...(r as unknown as EnCola & { enlace: string }), edad: edad(r.nacimiento as string | null), nacimiento: undefined });
  return { espera: espera.results.map(fila), enCurso: enCurso.results.map(fila) };
}

/** Solo videollamadas de Google Meet o Jitsi: el enlace se le muestra al paciente, no puede ser cualquier URL. */
export function enlaceVideo(pegado = ''): string | null {
  pegado = pegado.trim();
  if (!pegado) return `https://meet.jit.si/PoliclinicaMaracaibo-${[...crypto.getRandomValues(new Uint8Array(12))].map((b) => (b % 36).toString(36)).join('')}`;
  return /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(pegado) || /^https:\/\/meet\.jit\.si\/[\w-]{6,}$/.test(pegado) ? pegado : null;
}

/** Toma al paciente. false si otro médico se adelantó o el paciente salió de la sala. */
export async function atender(db: DB, consultaId: number, medicoId: number, enlace: string): Promise<boolean> {
  const r = await db.prepare(`UPDATE consultas SET estado = 'atendiendo', medico_id = ?2, enlace = ?3, atendida = datetime('now')
    WHERE id = ?1 AND estado = 'espera'`).bind(consultaId, medicoId, enlace).run();
  return r.meta.changes === 1;
}

export const finalizar = (db: DB, consultaId: number, medicoId: number) =>
  db.prepare("UPDATE consultas SET estado = 'finalizada', finalizada = datetime('now') WHERE id = ?1 AND medico_id = ?2 AND estado = 'atendiendo'")
    .bind(consultaId, medicoId).run();

/** Historial (últimas 50): del cliente, del médico, o de toda la clínica para el admin. */
export async function historial(db: DB, { clienteId = 0, medicoId = 0 } = {}): Promise<Pasada[]> {
  const { results } = await db.prepare(`SELECT c.id, c.estado, c.motivo, c.creada, c.atendida, c.finalizada, p.nombre AS paciente, m.nombre AS medico
    FROM consultas c JOIN usuarios p ON p.id = c.cliente_id LEFT JOIN usuarios m ON m.id = c.medico_id
    WHERE (?1 = 0 OR c.cliente_id = ?1) AND (?2 = 0 OR c.medico_id = ?2) ORDER BY c.id DESC LIMIT 50`).bind(clienteId, medicoId).all();
  return results as unknown as Pasada[];
}
