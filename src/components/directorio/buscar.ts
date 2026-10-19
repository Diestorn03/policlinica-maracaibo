// Búsqueda del directorio, igual que medicos() de lib/db.ts pero en memoria: la usan el filtro instantáneo del navegador
// (en la demo de GitHub Pages es lo único que filtra) y las tablas del admin. tests/db.check.mjs comprueba que coinciden.
import { clave } from '../../lib/db.ts';

/** La búsqueda tal como la entiende la base: sin acentos, sin «Dr./Dra.» y sin comodines de LIKE */
export const termino = (q: string) => clave(q).replace(/[%_]/g, '');

/** «ficha» = textos ya normalizados con clave() separados por «|» (nombre del médico, de cada especialidad…); `slugs` = slugs separados por espacio */
export const ficha = (...textos: string[]) => textos.map(clave).join('|');

/** `q` ya pasó por termino(); `esp` es un slug exacto o '' */
export const coincide = (f: string, slugs: string, q: string, esp: string) =>
  (!esp || slugs.split(' ').includes(esp)) && (!q || f.split('|').some((t) => t.includes(q)));
