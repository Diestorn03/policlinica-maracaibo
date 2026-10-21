// Telemedicina: sala de espera → el médico atiende y el servidor crea una sala Jitsi opaca.
// "En vivo" = los paneles consultan /api/espera y /api/cola cada pocos segundos.
import type { DB } from './db.ts';
import { edad } from './usuarios.ts';

export type Estado = 'espera' | 'atendiendo' | 'finalizada' | 'cancelada';
export interface Activa { id: number; estado: Estado; sala: string; creada: string; atendida: string | null; medico: string | null; posicion: number }
export interface EnCola { id: number; motivo: string; creada: string; paciente: string; edad: number | null }
export interface Pasada { id: number; estado: Estado; motivo: string; diagnostico: string; creada: string; atendida: string | null; finalizada: string | null; paciente: string; medico: string | null }

/** Las fechas de SQLite vienen en UTC sin zona: "2026-10-19 19:20:00" */
export const aFecha = (s: string) => new Date(s.replace(' ', 'T') + 'Z');

/** Saca de la cola a quien cerró la página (5 min sin latido) y cierra consultas olvidadas (4 h). */
const limpiar = (db: DB) => db.batch([
  db.prepare("UPDATE consultas SET estado = 'cancelada', finalizada = datetime('now') WHERE estado = 'espera' AND visto < datetime('now', '-5 minutes')"),
  db.prepare("UPDATE consultas SET estado = 'cancelada', finalizada = datetime('now') WHERE estado = 'atendiendo' AND atendida < datetime('now', '-4 hours')"),
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
  await limpiar(db);
  await db.prepare("UPDATE consultas SET visto = datetime('now') WHERE cliente_id = ?1 AND estado = 'espera'").bind(clienteId).run();
  return (await db.prepare(`SELECT c.id, c.estado, c.sala, c.creada, c.atendida, m.nombre AS medico,
      (SELECT COUNT(*) FROM consultas o WHERE o.estado = 'espera' AND o.id <= c.id) AS posicion
    FROM consultas c LEFT JOIN usuarios m ON m.id = c.medico_id
    WHERE c.cliente_id = ?1 AND c.estado IN ('espera', 'atendiendo')`).bind(clienteId).first()) as Activa | null;
}

export const cancelar = (db: DB, clienteId: number) =>
  db.prepare("UPDATE consultas SET estado = 'cancelada', finalizada = datetime('now') WHERE cliente_id = ?1 AND estado = 'espera'").bind(clienteId).run();

/** Lo que ve el médico: la cola en orden de llegada y sus consultas en curso. */
export async function cola(db: DB, medicoId: number): Promise<{ espera: EnCola[]; enCurso: (EnCola & { sala: string })[] }> {
  await limpiar(db);
  const q = (where: string) => db.prepare(`SELECT c.id, c.motivo, c.creada, c.sala, u.nombre AS paciente, u.nacimiento
    FROM consultas c JOIN usuarios u ON u.id = c.cliente_id WHERE ${where} ORDER BY c.id`);
  const [espera, enCurso] = await Promise.all([q("c.estado = 'espera'").all(), q("c.estado = 'atendiendo' AND c.medico_id = ?1").bind(medicoId).all()]);
  const fila = (r: Record<string, unknown>) => ({ ...(r as unknown as EnCola & { sala: string }), edad: edad(r.nacimiento as string | null), nacimiento: undefined });
  return { espera: espera.results.map(fila), enCurso: enCurso.results.map(fila) };
}

/** Identificador impredecible, sin URL ni datos personales, usado solo por la IFrame API de Jitsi. */
export function salaVideo(): string {
  return `pm-${[...crypto.getRandomValues(new Uint8Array(24))].map((b) => (b % 36).toString(36)).join('').slice(0, 24)}`;
}

/** Toma al paciente y asigna una sala generada por el servidor. */
export async function atender(db: DB, consultaId: number, medicoId: number, sala: string): Promise<boolean> {
  const r = await db.prepare(`UPDATE consultas SET estado = 'atendiendo', medico_id = ?2, sala = ?3, enlace = NULL, atendida = datetime('now')
    WHERE id = ?1 AND estado = 'espera' AND NOT EXISTS (
      SELECT 1 FROM consultas otra WHERE otra.medico_id = ?2 AND otra.estado = 'atendiendo'
    )`).bind(consultaId, medicoId, sala).run();
  return r.meta.changes === 1;
}

/** Finaliza solo la consulta asignada al médico y exige un diagnóstico clínico breve. */
export async function finalizar(db: DB, consultaId: number, medicoId: number, diagnostico: string): Promise<string | null> {
  diagnostico = diagnostico.trim().replace(/\r\n?/g, '\n').slice(0, 1000);
  if (diagnostico.length < 3) return 'Escribe el diagnóstico antes de finalizar la consulta.';
  const r = await db.prepare("UPDATE consultas SET estado = 'finalizada', diagnostico = ?3, finalizada = datetime('now') WHERE id = ?1 AND medico_id = ?2 AND estado = 'atendiendo'")
    .bind(consultaId, medicoId, diagnostico).run();
  return r.meta.changes === 1 ? null : 'No está atendiendo esta consulta o ya fue finalizada.';
}

/** Historial (últimas 50): del cliente, del médico, o de toda la clínica para el admin. */
export async function historial(db: DB, { clienteId = 0, medicoId = 0 } = {}): Promise<Pasada[]> {
  const { results } = await db.prepare(`SELECT c.id, c.estado, c.motivo, c.diagnostico, c.creada, c.atendida, c.finalizada, p.nombre AS paciente, m.nombre AS medico
    FROM consultas c JOIN usuarios p ON p.id = c.cliente_id LEFT JOIN usuarios m ON m.id = c.medico_id
    WHERE (?1 = 0 OR c.cliente_id = ?1) AND (?2 = 0 OR c.medico_id = ?2) ORDER BY c.id DESC LIMIT 50`).bind(clienteId, medicoId).all();
  return results as unknown as Pasada[];
}
