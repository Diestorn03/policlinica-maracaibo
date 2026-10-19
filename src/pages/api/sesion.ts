// POST usuario (correo o cédula) + clave [+ volver] → abre la sesión y lleva a su panel.  POST accion=salir → la cierra.
// El formulario vive en /acceso/, que muestra ?error=datos | ?error=limite | ?salio=1
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { COOKIE, cookieOpts, crearSesion, inicioDe, verificarClave } from '../../lib/auth';
import { porLogin } from '../../lib/usuarios';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect, clientAddress }) => {
  const form = await request.formData();
  if (form.get('accion') === 'salir') {
    cookies.delete(COOKIE, { path: '/' });
    return redirect('/acceso/?salio=1', 303);
  }
  const { success } = (await env.LOGIN_LIMIT?.limit({ key: clientAddress })) ?? { success: true };
  if (!success) return redirect('/acceso/?error=limite', 303);

  const u = await porLogin(env.DB, String(form.get('usuario') ?? ''));
  const ok = await verificarClave(String(form.get('clave') ?? ''), u?.clave_hash);
  if (!u || !ok || !u.activo || !env.SESSION_SECRET) return redirect('/acceso/?error=datos', 303);

  cookies.set(COOKIE, await crearSesion(env.SESSION_SECRET, u), cookieOpts);
  const inicio = inicioDe(u.rol);
  const volver = String(form.get('volver') ?? '');
  // solo se vuelve a una página del propio panel (nada de redirecciones abiertas)
  return redirect(volver.startsWith(inicio) && !volver.includes('//') ? volver : inicio, 303);
};
