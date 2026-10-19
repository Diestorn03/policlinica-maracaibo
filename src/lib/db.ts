// Directorio médico sobre D1. Cada función recibe la base (env.DB en Cloudflare; un adaptador de node:sqlite en tests/).
// Solo sintaxis TypeScript borrable: Node la importa tal cual en el test.

type Row = Record<string, unknown>;
interface Stmt { bind(...v: unknown[]): Stmt; all(): Promise<{ results: Row[] }>; first(): Promise<Row | null>; run(): Promise<{ meta: { last_row_id: number; changes: number } }> }
export interface DB { prepare(sql: string): Stmt; batch(s: Stmt[]): Promise<unknown> }

export interface Especialidad { id: number; slug: string; nombre: string; total: number }
export interface Medico { id: number; nombre: string; telefono: string; consultorio: string; foto: string; especialidades: { id: number; slug: string; nombre: string }[] }
export interface MedicoInput { nombre: string; telefono: string; consultorio: string; especialidades: number[] }

/** minúsculas, sin acentos ni "Dr./Dra.": para ordenar y buscar */
export const clave = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/^\s*dra?\b[.,]?\s*/, '').replace(/\s+/g, ' ').trim();
export const slugify = (s: string) => clave(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** "Dra Ana" / "Dra, Ana" / "Dr.Ana" → "Dra. Ana" */
export const tituloMedico = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/^(dra?)\b[.,]?\s*/i, (_, t: string) => (t.toLowerCase() === 'dra' ? 'Dra. ' : 'Dr. '));

const ESPS = `(SELECT json_group_array(json_object('id', e.id, 'slug', e.slug, 'nombre', e.nombre)) FROM medico_especialidad x
  JOIN especialidades e ON e.id = x.especialidad_id WHERE x.medico_id = m.id)`;
const toMedico = (r: Row): Medico => ({ ...(r as unknown as Medico), especialidades: JSON.parse(String(r.especialidades ?? '[]')).sort((a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, 'es')) });

/** Especialidades con su número de médicos, en orden alfabético */
export async function especialidades(db: DB): Promise<Especialidad[]> {
  const { results } = await db.prepare(`SELECT e.id, e.slug, e.nombre, COUNT(x.medico_id) AS total FROM especialidades e
    LEFT JOIN medico_especialidad x ON x.especialidad_id = e.id GROUP BY e.id ORDER BY e.clave`).all();
  return results as unknown as Especialidad[];
}

/** Búsqueda pública: q por nombre del médico o de la especialidad; esp = slug exacto */
export async function medicos(db: DB, { q = '', esp = '' }: { q?: string; esp?: string } = {}): Promise<Medico[]> {
  const like = `%${clave(q).replace(/[%_]/g, '')}%`;
  const { results } = await db.prepare(`SELECT m.id, m.nombre, m.telefono, m.consultorio, m.foto, ${ESPS} AS especialidades FROM medicos m
    WHERE (?1 = '%%' OR m.clave LIKE ?1 OR EXISTS (SELECT 1 FROM medico_especialidad x JOIN especialidades e ON e.id = x.especialidad_id
      WHERE x.medico_id = m.id AND e.clave LIKE ?1))
    AND (?2 = '' OR EXISTS (SELECT 1 FROM medico_especialidad x JOIN especialidades e ON e.id = x.especialidad_id
      WHERE x.medico_id = m.id AND e.slug = ?2))
    ORDER BY m.clave`).bind(like, esp).all();
  return results.map(toMedico);
}

/** Cifras de la portada, derivadas de la base en cada petición: nunca se quedan viejas tras un alta o baja */
export async function resumen(db: DB): Promise<{ medicos: number; especialidades: number; conMedicos: number; top: { slug: string; nombre: string; total: number }[] }> {
  const [n, e] = await Promise.all([db.prepare('SELECT COUNT(*) AS n FROM medicos').first(), especialidades(db)]);
  const top = e.filter((x) => x.total > 0).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')).slice(0, 8);
  return { medicos: Number(n?.n ?? 0), especialidades: e.length, conMedicos: e.filter((x) => x.total > 0).length, top: top.map(({ slug, nombre, total }) => ({ slug, nombre, total })) };
}

/** Retratos de la vitrina: solo médicos con foto, en orden alfabético, empezando en (día del año × 5) mod N y circular.
 *  Rota cada día (hora de Maracaibo) y reparte la vitrina entre todos. */
export async function retratosDelDia(db: DB, n = 12, hoy = new Date()): Promise<Medico[]> {
  const todos = (await medicos(db)).filter((m) => m.foto);
  if (!todos.length) return [];
  const c = new Date(hoy.getTime() - 4 * 3600e3);
  const dia = Math.floor((Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()) - Date.UTC(c.getUTCFullYear(), 0, 0)) / 864e5);
  return Array.from({ length: Math.min(n, todos.length) }, (_, i) => todos[(dia * 5 + i) % todos.length]);
}

export async function medico(db: DB, id: number): Promise<Medico | null> {
  const r = await db.prepare(`SELECT m.id, m.nombre, m.telefono, m.consultorio, m.foto, ${ESPS} AS especialidades FROM medicos m WHERE m.id = ?1`).bind(id).first();
  return r ? toMedico(r) : null;
}

/** Valida lo que llega del formulario del admin. Devuelve el dato limpio o el mensaje de error. */
export function validarMedico(f: FormData): MedicoInput | string {
  const nombre = tituloMedico(String(f.get('nombre') ?? '')).slice(0, 120);
  const telefono = String(f.get('telefono') ?? '').trim().slice(0, 40);
  const consultorio = String(f.get('consultorio') ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const esps = [...new Set(f.getAll('especialidades').map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (clave(nombre).length < 3) return 'Escribe el nombre del médico.';
  if (!esps.length) return 'Elige al menos una especialidad.';
  if (telefono && !/^[\d\s()+-]{7,}$/.test(telefono)) return 'El teléfono solo puede tener números, espacios, guiones y paréntesis.';
  return { nombre, telefono, consultorio, especialidades: esps };
}

/** Crea (sin id) o actualiza un médico y reemplaza sus especialidades. Devuelve el id. */
export async function guardarMedico(db: DB, m: MedicoInput, id?: number): Promise<number> {
  if (id) await db.prepare('UPDATE medicos SET nombre = ?1, clave = ?2, telefono = ?3, consultorio = ?4 WHERE id = ?5').bind(m.nombre, clave(m.nombre), m.telefono, m.consultorio, id).run();
  else id = (await db.prepare('INSERT INTO medicos (nombre, clave, telefono, consultorio) VALUES (?1, ?2, ?3, ?4)').bind(m.nombre, clave(m.nombre), m.telefono, m.consultorio).run()).meta.last_row_id;
  await db.batch([
    db.prepare('DELETE FROM medico_especialidad WHERE medico_id = ?1').bind(id),
    ...m.especialidades.map((e) => db.prepare('INSERT OR IGNORE INTO medico_especialidad (medico_id, especialidad_id) SELECT ?1, id FROM especialidades WHERE id = ?2').bind(id, e)),
  ]);
  return id;
}

export const borrarMedico = (db: DB, id: number) => db.prepare('DELETE FROM medicos WHERE id = ?1').bind(id).run();

const TIPOS = ['image/webp', 'image/jpeg', 'image/png'];
/** Guarda la foto subida (la cara de la tarjeta). Devuelve error en texto o null. */
export async function guardarFoto(db: DB, id: number, file: File): Promise<string | null> {
  if (!TIPOS.includes(file.type)) return 'La foto debe ser WebP, JPG o PNG.';
  if (file.size > 1_000_000) return 'La foto pesa más de 1 MB.';
  await db.batch([
    db.prepare('INSERT OR REPLACE INTO fotos (medico_id, tipo, datos) VALUES (?1, ?2, ?3)').bind(id, file.type, new Uint8Array(await file.arrayBuffer())),
    db.prepare('UPDATE medicos SET foto = ?1 WHERE id = ?2').bind(`/fotos/${id}?v=${Date.now().toString(36)}`, id),
  ]);
  return null;
}

export const quitarFoto = (db: DB, id: number) => db.batch([
  db.prepare('DELETE FROM fotos WHERE medico_id = ?1').bind(id),
  db.prepare("UPDATE medicos SET foto = '' WHERE id = ?1").bind(id),
]);

export async function foto(db: DB, id: number): Promise<{ tipo: string; datos: Uint8Array } | null> {
  const r = await db.prepare('SELECT tipo, datos FROM fotos WHERE medico_id = ?1').bind(id).first();
  // D1 devuelve los BLOB como number[]; node:sqlite como Uint8Array
  return r ? { tipo: String(r.tipo), datos: new Uint8Array(r.datos as ArrayLike<number>) } : null;
}

export async function crearEspecialidad(db: DB, nombre: string): Promise<string | null> {
  nombre = nombre.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (clave(nombre).length < 3) return 'Escribe el nombre de la especialidad.';
  const slug = slugify(nombre);
  if (await db.prepare('SELECT 1 FROM especialidades WHERE slug = ?1 OR nombre = ?2').bind(slug, nombre).first()) return 'Esa especialidad ya existe.';
  await db.prepare('INSERT INTO especialidades (slug, nombre, clave) VALUES (?1, ?2, ?3)').bind(slug, nombre, clave(nombre)).run();
  return null;
}

/** Solo se borra si ningún médico la tiene: así nadie queda sin especialidad por accidente. */
export async function borrarEspecialidad(db: DB, id: number): Promise<string | null> {
  if (await db.prepare('SELECT 1 FROM medico_especialidad WHERE especialidad_id = ?1').bind(id).first()) return 'Primero quita esta especialidad a sus médicos.';
  await db.prepare('DELETE FROM especialidades WHERE id = ?1').bind(id).run();
  return null;
}
