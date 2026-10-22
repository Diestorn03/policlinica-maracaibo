// Cola en vivo del médico (el middleware ya exige rol médico).
// GET → espera y consultas en curso con un código de sala opaco.
// POST atender genera automáticamente la sala; finalizar exige diagnóstico.
import type { APIRoute } from 'astro';
import { getDB } from '../../lib/entorno';
import { atender, cola, finalizar, salaVideo } from '../../lib/tele';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => Response.json(await cola(await getDB(), locals.usuario!.id));

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const id = Number(form.get('consulta'));
  const medico = locals.usuario!.id;
  const error = (m: string) => redirect(`/medico/?error=${encodeURIComponent(m)}`, 303);
  if (!Number.isInteger(id) || id <= 0) return error('Consulta no válida.');
  if (form.get('accion') === 'finalizar') {
    const resultado = await finalizar(await getDB(), id, medico, String(form.get('diagnostico') ?? ''));
    return resultado ? error(resultado) : redirect('/medico/', 303);
  }
  if (form.get('accion') !== 'atender') return error('Acción no válida.');
  if (!(await atender(await getDB(), id, medico, salaVideo()))) return error('Ese paciente ya fue tomado por otro médico o salió de la sala.');
  return redirect(`/medico/?atendiendo=${id}`, 303);
};
