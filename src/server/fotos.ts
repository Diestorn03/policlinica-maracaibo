// Fotos subidas desde el admin. La URL lleva ?v=… y cambia con cada subida, así que se puede cachear para siempre.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { foto } from '../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const f = await foto(env.DB, Number(params.id));
  if (!f) return new Response('Foto no encontrada', { status: 404 });
  return new Response(f.datos, {
    headers: { 'Content-Type': f.tipo, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
};
