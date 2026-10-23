// Usuarios con rol: admin (gestiona todo), médico (atiende la sala de espera), cliente (afiliado con telemedicina) y secretaria (solo inscribe clientes).
import type { DB } from './db.ts';
import { hashClave, type Rol } from './auth.ts';

export interface Usuario {
  id: number; rol: Rol; nombre: string; correo: string; cedula: string | null; activo: number; medico_id: number | null;
  telefono: string; nacimiento: string | null; direccion: string; afiliacion_vence: string | null; creado: string;
}
export interface UsuarioInput {
  rol: Rol; nombre: string; correo: string; cedula: string | null; activo: number; medico_id: number | null;
  telefono: string; nacimiento: string | null; direccion: string; afiliacion_vence: string | null; clave: string | null;
}

export const ROLES: Record<Rol, string> = { admin: 'Administrador', medico: 'Médico', cliente: 'Cliente afiliado', secretaria: 'Secretaria' };
const CAMPOS = 'id, rol, nombre, correo, cedula, activo, medico_id, telefono, nacimiento, direccion, afiliacion_vence, creado';

/** "v-12.345.678" / "12345678" → "V-12345678" */
export const cedula = (s: string) => {
  const m = s.toUpperCase().replace(/[^VEJPG0-9]/g, '').match(/^([VEJPG]?)(\d{5,10})$/);
  return m ? `${m[1] || 'V'}-${m[2]}` : null;
};
const fecha = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null);

export async function usuarios(db: DB, { rol = '', q = '' }: { rol?: string; q?: string } = {}): Promise<Usuario[]> {
  const like = `%${q.trim().replace(/[%_]/g, '')}%`;
  const { results } = await db.prepare(`SELECT ${CAMPOS} FROM usuarios WHERE (?1 = '' OR rol = ?1)
    AND (?2 = '%%' OR nombre LIKE ?2 OR correo LIKE ?2 OR cedula LIKE ?2) ORDER BY nombre COLLATE NOCASE`).bind(rol, like).all();
  return results as unknown as Usuario[];
}

export const usuario = async (db: DB, id: number) =>
  (await db.prepare(`SELECT ${CAMPOS} FROM usuarios WHERE id = ?1`).bind(id).first()) as unknown as Usuario | null;

/** Para iniciar sesión con correo o cédula */
export const porLogin = async (db: DB, login: string) =>
  (await db.prepare('SELECT id, rol, clave_hash, version, activo FROM usuarios WHERE correo = ?1 OR cedula = ?2')
    .bind(login.trim(), cedula(login) ?? '').first()) as { id: number; rol: Rol; clave_hash: string; version: number; activo: number } | null;

/** Lo que el middleware necesita en cada petición privada */
export const sesionUsuario = async (db: DB, id: number) =>
  (await db.prepare('SELECT id, rol, nombre, version, activo FROM usuarios WHERE id = ?1').bind(id).first()) as
    { id: number; rol: Rol; nombre: string; version: number; activo: number } | null;

/** Valida el formulario del admin. En una edición la clave vacía significa "no cambiarla". */
export function validarUsuario(f: FormData, nuevo: boolean): UsuarioInput | string {
  const g = (k: string) => String(f.get(k) ?? '').trim();
  const rol = g('rol') as Rol;
  if (!(rol in ROLES)) return 'Elige un rol.';
  const nombre = g('nombre').replace(/\s+/g, ' ').slice(0, 120);
  if (nombre.length < 3) return 'Escribe el nombre completo.';
  const correo = g('correo').toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return 'El correo no es válido.';
  const ced = g('cedula') ? cedula(g('cedula')) : null;
  if (g('cedula') && !ced) return 'La cédula debe ser como V-12345678.';
  if (rol === 'cliente' && !ced) return 'La cédula es obligatoria para los clientes.';
  const telefono = g('telefono').slice(0, 40);
  if (telefono && !/^[\d\s()+-]{7,}$/.test(telefono)) return 'El teléfono solo puede tener números, espacios, guiones y paréntesis.';
  const nacimiento = g('nacimiento') ? fecha(g('nacimiento')) : null;
  if (g('nacimiento') && (!nacimiento || nacimiento > new Date().toISOString().slice(0, 10))) return 'La fecha de nacimiento no es válida.';
  const vence = g('afiliacion_vence') ? fecha(g('afiliacion_vence')) : null;
  if (g('afiliacion_vence') && !vence) return 'La fecha de vencimiento no es válida.';
  const medicoId = Number(g('medico_id')) || null;
  const clave = g('clave') || null;
  if (nuevo && !clave) return 'Asigna una contraseña.';
  if (clave && clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  return {
    rol, nombre, correo, cedula: ced, activo: f.get('activo') === null && !nuevo ? 0 : 1, telefono, nacimiento,
    direccion: g('direccion').slice(0, 200), afiliacion_vence: rol === 'cliente' ? vence : null,
    medico_id: rol === 'medico' ? medicoId : null, clave,
  };
}

/** Las mismas reglas de cédula y teléfono, como `pattern` de los formularios: el navegador marca el campo antes de enviar.
 *  (Más estrictas en el orden que cedula(), que ignora cualquier otro carácter, pero aceptan los formatos de siempre.) */
export const PATRON_CEDULA = '[VvEeJjPpGg]?[ .\\-]*(?:[0-9][ .\\-]*){5,10}';
export const PATRON_TELEFONO = '[0-9 \\(\\)+\\-]{7,}';

/** El campo que causó un error de validarUsuario o guardarUsuario (null si no es de un campo): el formulario vuelve con lo
 *  escrito y marca solo ese. Sale del texto del mensaje: si se cambia un mensaje, revisar esta tabla (la prueba lo cubre). */
const CAMPO_DEL_ERROR: [RegExp, string][] = [
  [/\brol\b/, 'rol'], [/nombre/, 'nombre'], [/correo/, 'correo'], [/cédula/, 'cedula'], [/teléfono/, 'telefono'],
  [/nacimiento/, 'nacimiento'], [/vencimiento/, 'afiliacion_vence'], [/contraseña/, 'clave'],
];
export const campoDelError = (mensaje: string) => CAMPO_DEL_ERROR.find(([re]) => re.test(mensaje))?.[1] ?? null;

/** Alta exclusiva de secretaria: descarta los campos de privilegio y fuerza un cliente activo. */
export function validarCliente(f: FormData): UsuarioInput | string {
  const cliente = new FormData();
  for (const [nombre, valor] of f.entries()) {
    if (!['rol', 'medico_id', 'activo'].includes(nombre)) cliente.append(nombre, valor);
  }
  cliente.set('rol', 'cliente');
  return validarUsuario(cliente, true);
}

const otrosAdmins = async (db: DB, id: number) =>
  Number((await db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id != ?1").bind(id).first())?.n ?? 0);

/** Crea o actualiza. Devuelve el id o un mensaje de error. */
export async function guardarUsuario(db: DB, u: UsuarioInput, id?: number): Promise<number | string> {
  const dup = await db.prepare('SELECT correo, cedula FROM usuarios WHERE (correo = ?1 OR (?2 IS NOT NULL AND cedula = ?2)) AND id != ?3')
    .bind(u.correo, u.cedula, id ?? 0).first();
  if (dup) return dup.correo === u.correo ? 'Ya existe un usuario con ese correo.' : 'Ya existe un usuario con esa cédula.';
  if (id) {
    const antes = await usuario(db, id);
    if (!antes) return 'El usuario no existe.';
    if (antes.rol === 'admin' && (u.rol !== 'admin' || !u.activo) && !(await otrosAdmins(db, id))) return 'Debe quedar al menos un administrador activo.';
    await db.prepare(`UPDATE usuarios SET rol = ?1, nombre = ?2, correo = ?3, cedula = ?4, activo = ?5, medico_id = ?6, telefono = ?7,
      nacimiento = ?8, direccion = ?9, afiliacion_vence = ?10, version = version + ?11 WHERE id = ?12`)
      .bind(u.rol, u.nombre, u.correo, u.cedula, u.activo, u.medico_id, u.telefono, u.nacimiento, u.direccion, u.afiliacion_vence,
        u.clave || antes.activo !== u.activo ? 1 : 0, id).run();
    if (u.clave) await db.prepare('UPDATE usuarios SET clave_hash = ?1 WHERE id = ?2').bind(await hashClave(u.clave), id).run();
    return id;
  }
  return (await db.prepare(`INSERT INTO usuarios (rol, nombre, correo, cedula, clave_hash, activo, medico_id, telefono, nacimiento, direccion, afiliacion_vence)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
    .bind(u.rol, u.nombre, u.correo, u.cedula, await hashClave(u.clave!), u.activo, u.medico_id, u.telefono, u.nacimiento, u.direccion, u.afiliacion_vence)
    .run()).meta.last_row_id;
}

/** Nadie se borra a sí mismo ni deja la clínica sin administrador. */
export async function borrarUsuario(db: DB, id: number, actorId: number): Promise<string | null> {
  if (id === actorId) return 'No puedes borrar tu propio usuario.';
  const u = await usuario(db, id);
  if (u?.rol === 'admin' && !(await otrosAdmins(db, id))) return 'Debe quedar al menos un administrador activo.';
  await db.prepare('DELETE FROM usuarios WHERE id = ?1').bind(id).run();
  return null;
}

/** Edad cumplida en años (para la cola del médico) */
export function edad(nacimiento: string | null, hoy = new Date()): number | null {
  if (!nacimiento) return null;
  const [a, m, d] = nacimiento.split('-').map(Number);
  return hoy.getFullYear() - a - (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d) ? 1 : 0);
}

/** Cifras del admin. «Ahora» usa las mismas ventanas que tele.ts (5 min sin latido en la sala, 4 h en curso). */
export async function resumenAdmin(db: DB, ahora = new Date()) {
  const hoy = new Date(ahora.getTime() - 4 * 3600e3).toISOString().slice(0, 10);
  const en30 = new Date(Date.parse(hoy) + 30 * 864e5).toISOString().slice(0, 10);
  const inicio = new Date(Date.parse(hoy) + 4 * 3600e3), fin = new Date(inicio.getTime() + 864e5);
  const sql = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
  const n = async (q: string, ...v: unknown[]) => Number((await db.prepare(q).bind(...v).first())?.n ?? 0);
  const [medicos, especialidades, sinMedicos, vigentes, enEspera, atendiendo, consultasHoy, porVencer] = await Promise.all([
    n('SELECT COUNT(*) AS n FROM medicos'),
    n('SELECT COUNT(*) AS n FROM especialidades'),
    n('SELECT COUNT(*) AS n FROM especialidades e WHERE NOT EXISTS (SELECT 1 FROM medico_especialidad x WHERE x.especialidad_id = e.id)'),
    n("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'cliente' AND activo = 1 AND afiliacion_vence >= ?1", hoy),
    n("SELECT COUNT(*) AS n FROM consultas WHERE estado = 'espera' AND visto >= datetime('now', '-5 minutes')"),
    n("SELECT COUNT(*) AS n FROM consultas WHERE estado = 'atendiendo' AND atendida >= datetime('now', '-4 hours')"),
    n('SELECT COUNT(*) AS n FROM consultas WHERE creada >= ?1 AND creada < ?2', sql(inicio), sql(fin)),
    db.prepare(`SELECT ${CAMPOS} FROM usuarios WHERE rol = 'cliente' AND activo = 1 AND afiliacion_vence BETWEEN ?1 AND ?2 ORDER BY afiliacion_vence, nombre`).bind(hoy, en30).all(),
  ]);
  return { medicos, especialidades, sinMedicos, vigentes, enEspera, atendiendo, consultasHoy, porVencer: porVencer.results as unknown as Usuario[] };
}
