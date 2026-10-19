// Sala de espera del cliente (el middleware ya exige rol cliente).
// GET  → latido + estado JSON: { consulta: null | { estado, posicion, enlace, medico, ... } }   (el panel lo llama cada 4 s)
// POST accion=entrar [motivo] | accion=cancelar → vuelve a /panel/ (funciona sin JS); con ?error=… si no pudo entrar
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cancelar, entrar, estado } from '../../lib/tele';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => Response.json({ consulta: await estado(env.DB, locals.usuario!.id) });

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  if (form.get('accion') === 'cancelar') {
    await cancelar(env.DB, locals.usuario!.id);
    return redirect('/panel/', 303);
  }
  const error = await entrar(env.DB, locals.usuario!.id, String(form.get('motivo') ?? ''));
  return redirect(error ? `/panel/?error=${encodeURIComponent(error)}` : '/panel/', 303);
};
