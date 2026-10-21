// Única puerta de las zonas privadas: lee la sesión, relee al usuario en D1 y aplica el rol de cada ruta.
// Sin sesión → /acceso/?volver=… (páginas) o 401 (API). Con el rol equivocado → a su propio panel.
// En la demo (GitHub Pages) todo está prerenderizado y no pasa por aquí.
import { defineMiddleware } from 'astro:middleware';
import { COOKIE, inicioDe, leerSesion, type Rol } from './lib/auth';
import { getDB, getEnv } from './lib/entorno';
import { sesionUsuario } from './lib/usuarios';

const REGLAS: [string, Rol[]][] = [
  ['/admin', ['admin']],
  ['/medico', ['medico']],
  ['/panel', ['cliente']],
  ['/secretaria', ['secretaria']],
  ['/api/cola', ['medico']],
  ['/api/espera', ['cliente']],
];
const bajo = (path: string, p: string) => path === p || path.startsWith(p + '/');

export const onRequest = defineMiddleware(async ({ url, cookies, locals, redirect, isPrerendered }, next) => {
  if (isPrerendered) return next();
  const regla = REGLAS.find(([p]) => bajo(url.pathname, p));
  const privada = !!regla || bajo(url.pathname, '/acceso') || bajo(url.pathname, '/api');
  if (!privada) return next();

  const s = await leerSesion((await getEnv()).SESSION_SECRET, cookies.get(COOKIE)?.value);
  const u = s && (await sesionUsuario(await getDB(), s.id));
  if (u && u.activo && u.version === s.version) locals.usuario = { id: u.id, rol: u.rol, nombre: u.nombre };

  if (regla && !regla[1].includes(locals.usuario?.rol as Rol)) {
    if (bajo(url.pathname, '/api')) return new Response('No autorizado', { status: 401 });
    return redirect(locals.usuario ? inicioDe(locals.usuario.rol) : `/acceso/?volver=${encodeURIComponent(url.pathname)}`, 303);
  }
  const res = await next();
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Robots-Tag', 'noindex');
  return res;
});
