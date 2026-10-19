// Pequeñas ayudas de las páginas de administración (puras, sin base de datos).
import { fechaCaracas } from '../../lib/sitio';

/** Hoy en Maracaibo (UTC−4) como AAAA-MM-DD, para comparar con las fechas de afiliación */
export const hoyCaracas = (ahora = new Date()) => new Date(ahora.getTime() - 4 * 3600e3).toISOString().slice(0, 10);

/** '2027-10-19' → '19/10/2027' */
export const dmy = (iso: string) => iso.split('-').reverse().join('/');

/** Estado de la afiliación de un cliente según su fecha de vencimiento */
export function afiliacion(vence: string | null, hoy = hoyCaracas()): { clase: 'vigente' | 'vencida' | 'sin'; texto: string } {
  if (!vence) return { clase: 'sin', texto: 'Sin fecha' };
  return vence >= hoy ? { clase: 'vigente', texto: `Vigente hasta ${dmy(vence)}` } : { clase: 'vencida', texto: `Vencida el ${dmy(vence)}` };
}

export const ESTADOS: Record<string, string> = { espera: 'En espera', atendiendo: 'En videollamada', finalizada: 'Finalizada', cancelada: 'Cancelada' };

/** Fecha y hora cortas de una fecha de SQLite: '19 oct, 3:20 p. m.' */
export const cuando = (s: string) => fechaCaracas(s, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Concordancia en singular: pl(1, 'cliente', 'clientes') → 'cliente' */
export const pl = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
