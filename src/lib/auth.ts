// Contraseñas (PBKDF2-SHA256) y sesión en cookie firmada con HMAC (secreto SESSION_SECRET).
// La cookie lleva id.version.vence.firma; el middleware además relee el usuario en D1 (activo y misma versión),
// así desactivar a alguien o cambiarle la clave lo saca al instante.

export type Rol = 'admin' | 'medico' | 'cliente';
export interface Sesion { id: number; version: number }

export const COOKIE = 'pm_sesion';
const DURACION = 12 * 60 * 60 * 1000;
const ITERACIONES = 100_000; // máximo que permite Cloudflare Workers
const enc = new TextEncoder();

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
// comparación en tiempo constante
const iguales = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.reduce((d, x, i) => d | (x ^ b[i]), 0) === 0;

async function pbkdf2(clave: string, sal: Uint8Array, iter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iter }, key, 256));
}

export async function hashClave(clave: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERACIONES}$${b64(sal)}$${b64(await pbkdf2(clave, sal, ITERACIONES))}`;
}

/** Si el usuario no existe (guardado vacío) igual gasta el mismo tiempo: no revela qué correos están registrados. */
export async function verificarClave(clave: string, guardado: string | undefined): Promise<boolean> {
  const [alg, iter, sal, hash] = (guardado ?? '').split('$');
  const valido = alg === 'pbkdf2' && Number(iter) > 0 && !!sal && !!hash;
  const calculado = await pbkdf2(clave, valido ? deB64(sal) : new Uint8Array(16), valido ? Number(iter) : ITERACIONES);
  return valido && iguales(calculado, deB64(hash));
}

async function firma(secreto: string, dato: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(dato)));
}

export async function crearSesion(secreto: string, s: Sesion, ahora = Date.now()): Promise<string> {
  const dato = `${s.id}.${s.version}.${ahora + DURACION}`;
  return `${dato}.${hex(await firma(secreto, dato))}`;
}

/** Devuelve id y versión si la cookie es auténtica y no venció; si no, null. */
export async function leerSesion(secreto: string | undefined, token: string | undefined, ahora = Date.now()): Promise<Sesion | null> {
  if (!secreto || secreto.length < 16 || !token) return null; // sin secreto configurado nadie entra
  const m = token.match(/^(\d+)\.(\d+)\.(\d+)\.([0-9a-f]{64})$/);
  if (!m || Number(m[3]) < ahora) return null;
  const ok = iguales(Uint8Array.from(m[4].match(/../g)!.map((h) => parseInt(h, 16))), await firma(secreto, `${m[1]}.${m[2]}.${m[3]}`));
  return ok ? { id: Number(m[1]), version: Number(m[2]) } : null;
}

export const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: DURACION / 1000 };

/** Panel al que va cada rol después de entrar */
export const inicioDe = (rol: Rol) => ({ admin: '/admin/', medico: '/medico/', cliente: '/panel/' })[rol];
