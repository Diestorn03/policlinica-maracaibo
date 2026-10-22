// Señalización de la videollamada entre el médico y el paciente de una consulta en curso (el middleware ya exige rol médico o cliente).
// GET  ?sala=…&sesion=…  → { mensajes: [...] } (sondeo largo, hasta 20 s)   o { fin: true } si la consulta ya terminó
// POST JSON { sala, tipo, datos } → 204 (se lo entrega al otro lado)
import type { APIRoute } from 'astro';
import { getDB } from '../../lib/entorno';
import { enviar, sondear, type Mensaje, type RolVideo } from '../../lib/senal';

export const prerender = false;

const TIPOS = ['oferta', 'respuesta', 'ice', 'salir'];

/** Solo participa quien es el médico o el paciente de una consulta en curso con esa sala. */
async function participa(sala: string, usuario: number) {
  if (!/^pm-[a-z0-9]{24}$/.test(sala)) return false;
  const c = await (await getDB()).prepare("SELECT 1 AS ok FROM consultas WHERE sala = ?1 AND estado = 'atendiendo' AND (cliente_id = ?2 OR medico_id = ?2)").bind(sala, usuario).first();
  return !!c;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const sala = url.searchParams.get('sala') ?? '';
  const sesion = (url.searchParams.get('sesion') ?? '').slice(0, 40);
  if (!sesion || !(await participa(sala, locals.usuario!.id))) return Response.json({ fin: true });
  return Response.json({ mensajes: await sondear(sala, locals.usuario!.rol as RolVideo, sesion) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const texto = await request.text();
  if (texto.length > 40_000) return new Response('Mensaje demasiado grande', { status: 413 });
  let m: { sala?: string; tipo?: string; datos?: unknown };
  try { m = JSON.parse(texto); } catch { return new Response('JSON no válido', { status: 400 }); }
  if (!TIPOS.includes(m.tipo ?? '') || !(await participa(m.sala ?? '', locals.usuario!.id))) return new Response('No autorizado', { status: 403 });
  enviar(m.sala!, locals.usuario!.rol as RolVideo, { tipo: m.tipo, datos: m.datos } as Mensaje);
  return new Response(null, { status: 204 });
};
