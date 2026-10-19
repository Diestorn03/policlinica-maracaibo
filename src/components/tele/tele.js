// Ayudas de los paneles de telemedicina (cliente y médico): sondeo, aviso de la URL y «Copiar enlace».
// La API (espera, cola, alCambiar) y la simulación de la demo viven en src/scripts/api.js; aquí no se hace fetch a mano.
import { alCambiar } from '../../scripts/api.js';
import { errorConocido } from './avisos.ts';

/** Corre `tarea` ya y luego cada 4 s con la pestaña visible (15 s oculta; al volver a verla, de inmediato).
 *  `enLinea(true|false)` avisa si la última vuelta salió bien. En la demo, `alCambiar` la adelanta cuando otra pestaña toca la simulación. */
export function sondear(tarea, enLinea = () => {}) {
  let t, ocupado = false;
  const vuelta = async () => {
    if (ocupado) return;
    ocupado = true;
    clearTimeout(t);
    try { await tarea(); enLinea(true); } catch { enLinea(false); }
    ocupado = false;
    t = setTimeout(vuelta, document.hidden ? 15000 : 4000);
  };
  document.addEventListener('visibilitychange', () => document.hidden || vuelta());
  alCambiar(vuelta);
  vuelta();
}

/** ?error=… de la URL en su aviso (solo mensajes conocidos, ver avisos.ts). En servidor el HTML ya lo trae; en la demo (página estática) lo pone el navegador.
 *  Devuelve el texto mostrado. Nunca lanza: un aviso no puede tumbar el sondeo que viene después. */
export function errorDeUrl(el) {
  const v = errorConocido(new URLSearchParams(location.search).get('error'));
  if (!el || !v) return '';
  const p = el.querySelector('p') ?? el;
  if (!p.textContent.trim()) p.textContent = v;
  el.hidden = false;
  el.focus();
  return p.textContent.trim();
}

/** Valida que sea una videollamada https antes de ponerla en un href (defensa en profundidad: el servidor ya lo exige). */
export const enlaceSeguro = (s) => (typeof s === 'string' && /^https:\/\/[^\s]+$/.test(s) ? s : '');

// «Copiar enlace»: cualquier botón con data-copiar="<url>" (y, opcional, un hijo [data-txt] con su texto)
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copiar]');
  if (!b?.dataset.copiar) return;
  const txt = b.querySelector('[data-txt]') ?? b;
  txt.dataset.antes ??= txt.textContent;
  try { await navigator.clipboard.writeText(b.dataset.copiar); txt.textContent = 'Copiado'; } catch { txt.textContent = 'No se pudo copiar'; }
  setTimeout(() => (txt.textContent = txt.dataset.antes), 2000);
});
