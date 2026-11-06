// Documentos de la consulta en los paneles (pedido de la clínica): el paciente envía informes o estudios y el médico que lo atiende los descarga.
// La lista llega en cada sondeo (espera() y cola() de api.js) y se rehace por id sin tocar lo que ya está; el marcado es el mismo de
// teleDocumentos() en php/app/pages/partials/tele.php. El envío va por fetch, nunca recargando: la videollamada sigue mientras sube el archivo.
// Solo hay servidor de documentos en la versión PHP; en la demo los guarda este navegador (api.js).
import { DEMO, abrirArchivoDemo, quitarArchivo, subirArchivo, urlArchivo } from '../../scripts/api.js';

export interface Documento { id: number; nombre: string; tamano: number }

const TIPOS = /\.(pdf|docx?|jpe?g|png)$/i;   // las mismas reglas de php/app/lib/archivos.php (allá se confirma por la firma del archivo)

/** «1,2 MB» o «350 KB», igual que tamanoTexto() de php/app/lib/archivos.php. */
export const tamanoTexto = (b: number) => (b >= 1048576 ? `${String(Math.round(b / 104857.6) / 10).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function item(d: Documento, rol: 'cliente' | 'medico') {
  const li = document.createElement('li');
  li.dataset.id = String(d.id);
  const enlace = Object.assign(document.createElement('a'), { href: urlArchivo(d.id), textContent: d.nombre });
  enlace.setAttribute('download', '');
  li.append(enlace, ' ', Object.assign(document.createElement('small'), { textContent: tamanoTexto(d.tamano) }));
  if (rol === 'cliente') {
    const quitar = Object.assign(document.createElement('button'), { type: 'button', className: 't-docs__quitar', textContent: 'Quitar' });
    quitar.dataset.quitar = '';
    quitar.setAttribute('aria-label', `Quitar ${d.nombre}`);
    li.append(quitar);
  }
  return li;
}

/** Pone en `caja` ([data-docs]) la lista `docs` y devuelve los <li> que no estaban. 'cliente' añade «Quitar» a cada uno. */
export function pintarDocumentos(caja: HTMLElement, docs: Documento[], rol: 'cliente' | 'medico'): HTMLElement[] {
  const lista = caja.querySelector<HTMLElement>('[data-docs-lista]')!;
  const antes = new Map(([...lista.children] as HTMLElement[]).map((li) => [li.dataset.id!, li]));
  const ids = new Set(docs.map((d) => String(d.id)));
  for (const [id, li] of antes) if (!ids.has(id)) li.remove();
  const nuevos: HTMLElement[] = [];
  docs.forEach((d, i) => {
    let li = antes.get(String(d.id));
    if (!li) nuevos.push((li = item(d, rol)));
    if (lista.children[i] !== li) lista.insertBefore(li, lista.children[i] ?? null);
  });
  caja.querySelector<HTMLElement>('[data-docs-vacio]')!.hidden = docs.length > 0;
  return nuevos;
}

/** Demo: los documentos están en este navegador, así que el enlace los saca de ahí (en el servidor el enlace descarga solo). */
export function descargasDemo(raiz: HTMLElement) {
  if (!DEMO) return;
  raiz.addEventListener('click', (e) => {
    const enlace = (e.target as Element).closest('[data-docs-lista] a');
    if (!enlace) return;
    e.preventDefault();
    abrirArchivoDemo(enlace.closest<HTMLElement>('li')!.dataset.id);
  });
}

/** Panel del paciente: envía y quita documentos sin recargar la página. */
export function envioDeDocumentos(caja: HTMLElement) {
  const form = caja.querySelector<HTMLFormElement>('[data-docs-form]')!;
  const campo = form.querySelector<HTMLInputElement>('input[type="file"]')!;
  const boton = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const estado = caja.querySelector<HTMLElement>('[data-docs-estado]')!;
  const max = Number(form.dataset.max) || 10 * 1048576;
  const decir = (t: string) => { estado.textContent = t; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = campo.files?.[0];
    if (!f) return decir('Elige un archivo para enviar.');
    if (!TIPOS.test(f.name)) return decir('Solo se pueden enviar PDF, Word (.doc o .docx) o fotos JPG o PNG.');
    if (f.size > max) return decir(`El archivo pesa más de ${tamanoTexto(max)}.`);
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    decir(`Enviando «${f.name}»…`);
    const r = await subirArchivo(f);
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
    if (r.archivos) pintarDocumentos(caja, r.archivos, 'cliente');
    if (r.error !== undefined) return decir(r.error);
    form.reset();
    decir(`Listo: el médico ya puede descargar «${f.name}».`);
  });

  caja.addEventListener('click', async (e) => {
    const quitar = (e.target as Element).closest<HTMLButtonElement>('[data-quitar]');
    if (!quitar) return;
    const li = quitar.closest<HTMLElement>('li')!;
    const nombre = li.querySelector('a')?.textContent ?? '';
    quitar.disabled = true;
    const r = await quitarArchivo(li.dataset.id);
    if (r.archivos) pintarDocumentos(caja, r.archivos, 'cliente');
    quitar.disabled = false;
    decir(r.error || `Quitaste «${nombre}».`);
    if (!li.isConnected) campo.focus();   // el botón ya no existe: el foco no se pierde
  });
}
