// Cola en vivo del médico (el middleware ya exige rol médico).
// GET  → { espera: [{ id, paciente, edad, motivo, creada }], enCurso: [{ ..., enlace }] }   (el panel lo llama cada 4 s)
// POST accion=atender, consulta, [enlace de Meet; vacío = Jitsi automático] → /medico/?atendiendo=<id>
//      accion=finalizar, consulta → /medico/
// Errores → /medico/?error=…
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { atender, cola, enlaceVideo, finalizar } from '../../lib/tele';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => Response.json(await cola(env.DB, locals.usuario!.id));

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const id = Number(form.get('consulta'));
  const medico = locals.usuario!.id;
  const error = (m: string) => redirect(`/medico/?error=${encodeURIComponent(m)}`, 303);
  if (!Number.isInteger(id) || id <= 0) return error('Consulta no válida.');
  if (form.get('accion') === 'finalizar') {
    await finalizar(env.DB, id, medico);
    return redirect('/medico/', 303);
  }
  const enlace = enlaceVideo(String(form.get('enlace') ?? ''));
  if (!enlace) return error('El enlace debe ser de Google Meet (https://meet.google.com/abc-defg-hij) o de Jitsi.');
  if (!(await atender(env.DB, id, medico, enlace))) return error('Ese paciente ya fue tomado por otro médico o salió de la sala.');
  return redirect(`/medico/?atendiendo=${id}`, 303);
};
