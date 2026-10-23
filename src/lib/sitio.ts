// Funciones puras del sitio (sin D1 ni DOM): teléfonos, WhatsApp, iniciales, horarios y fechas.
// Solo sintaxis TypeScript borrable: Node la importa tal cual en tests/sitio.check.mjs.
import type { Horario } from '../data/site.ts';
import { aFecha } from './tele.ts';

const WA = '584124248304';

/** '0414-1640799' → 'tel:+584141640799'. Con «+» conserva los dígitos (y quita el 0 de troncal: «+58 (0261)…»). Vacío → '' */
export function telHref(n: string): string {
  const d = n.replace(/\D/g, '');
  if (!d) return '';
  return n.trim().startsWith('+') ? 'tel:+' + d.replace(/^580/, '58') : 'tel:+58' + d.replace(/^0+/, '');
}

/** Enlace de WhatsApp de la clínica, igual que el oficial (espacios como «+») */
export const waHref = (texto = 'Solicitud de cita') => 'https://api.whatsapp.com/send/?' + new URLSearchParams({ phone: WA, text: texto });

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'van', 'von']);
/** 'Dra. Rossy Vera' → 'RV'; 'Dra. Neyla Carolina Soto León' → 'NS' (1.ª letra del nombre + del primer apellido) */
export function iniciales(nombre: string): string {
  const p = nombre.replace(/^\s*dra?\b\.?\s*/i, '').split(/\s+/).filter((w) => w && !PARTICULAS.has(w.toLowerCase()));
  if (!p.length) return '';
  const ap = p.length >= 3 ? p[p.length - 2] : p[p.length - 1];
  return (p[0][0] + (p.length > 1 ? ap[0] : '')).toUpperCase();
}

/** Hora de Maracaibo = UTC−4 fija (sin horario de verano). `hasta` es exclusivo. */
const caracas = (ahora: Date) => new Date(ahora.getTime() - 4 * 3600e3);

/** true/false si el horario trae días; null si no consta (no se calcula «Abierto ahora») */
export function estaAbierto(h: Horario, ahora = new Date()): boolean | null {
  if (!h.dias) return null;
  const c = caracas(ahora);
  const hora = c.getUTCHours() + c.getUTCMinutes() / 60;
  return h.dias.includes(c.getUTCDay()) && (!!h.h24 || (hora >= h.desde && hora < h.hasta));
}

/** Hora actual de Maracaibo en horas decimales (0–24), para la aguja del reloj */
export const horaCaracas = (ahora = new Date()) => { const c = caracas(ahora); return c.getUTCHours() + c.getUTCMinutes() / 60; };

/** Fecha de SQLite (UTC sin zona) en hora de Maracaibo: '19 de octubre de 2026'; con 'hora', '3:20 p. m.' */
export function fechaCaracas(s: string, opts: 'hora' | Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
  const o = opts === 'hora' ? { hour: 'numeric', minute: '2-digit' } : opts;
  return new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', ...o }).format(aFecha(s));
}

/** Minutos enteros entre dos fechas de SQLite; null si la consulta no terminó */
export const duracion = (desde: string, hasta: string | null): number | null => (hasta ? Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 60e3) : null);

/** Tiempo esperando: '07:32' (mm:ss) o '1 h 05 min' */
export function esperando(creada: string, ahora = new Date()): string {
  const s = Math.max(0, Math.floor((ahora.getTime() - aFecha(creada).getTime()) / 1000));
  const dos = (n: number) => String(n).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)} h ${dos(Math.floor((s % 3600) / 60))} min` : `${dos(Math.floor(s / 60))}:${dos(s % 60)}`;
}

export type Piso = '3' | '2' | '1' | 'pb' | 's';
/** Del techo al sótano: el orden en que se recorre el edificio */
export const PISOS: { id: Piso; nombre: string }[] = [
  { id: '3', nombre: '3er piso' }, { id: '2', nombre: '2do piso' }, { id: '1', nombre: '1er piso' },
  { id: 'pb', nombre: 'Planta baja' }, { id: 's', nombre: 'Sótano' },
];
const RE_PISO = /s[oó]tano|\bp\.?\s?b\b\.?|planta baja|\b(?:[123](?:er|do|ro)?|primer|segundo|tercer)\.?\s*pis[oó]/gi;

/** "2do Piso C Nro 28" → { piso: '2', puertas: ['28'], texto: '2do piso, consultorio 28' }.
 *  Los consultorios del WordPress vienen escritos de mil formas ("P.B Consultorio NRO 32", "1er.Piso C. Nro. 16", "PB C NRO 13-14-14B"). */
export function ubicacion(raw: string): { piso: Piso | null; puertas: string[]; texto: string } {
  const t = raw.toLowerCase();
  const piso: Piso | null = /s[oó]tano/.test(t) ? 's' : /\bp\.?\s?b\b|planta baja/.test(t) ? 'pb'
    : /\b(1(er)?|primer)\.?\s*pis/.test(t) ? '1' : /\b(2(do)?|segundo)\.?\s*pis/.test(t) ? '2' : /\b(3(er|ro)?|tercer)\.?\s*pis/.test(t) ? '3' : null;
  const resto = raw.replace(RE_PISO, ' ');
  const puertas = [...new Set([...resto.matchAll(/(\d{1,3})\s?([AB])?(?![\w])/gi)].map((m) => m[1] + (m[2] ?? '').toUpperCase()))];
  const nombre = PISOS.find((p) => p.id === piso)?.nombre;
  const detalle = puertas.length ? `consultorio ${puertas.join(', ')}` : resto.replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toLowerCase());
  const texto = nombre ? (detalle ? `${nombre}, ${detalle}` : nombre) : raw.trim().replace(/^./, (c) => c.toLowerCase());
  return { piso, puertas, texto };
}

/** Miniatura 160 px de la foto importada (public/medicos/t/*.webp); las subidas desde el admin ya son pequeñas */
export const miniatura = (foto: string) => foto.replace(/^\/medicos\/([^/]+)\.jpg$/, '/medicos/t/$1.webp');
/** Médico sin foto: la imagen que usa la web oficial (el logo de la clínica sobre blanco), con su miniatura como las demás fotos. */
export const SIN_FOTO = '/medicos/sin-foto.jpg';
