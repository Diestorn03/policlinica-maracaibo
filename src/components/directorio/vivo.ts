// Versión PHP (hosting sin Node): las páginas públicas son HTML estático compilado con los 125 médicos del sitio anterior.
// Este script pide /api/directorio (la base real) y, si cambió algo, rehace las listas del directorio y de las especialidades
// y actualiza las cifras de la portada y de «Nosotros» (data-vivo-n). Solo corre si <html data-vivo="1">; en la demo y en los demás modos no hace nada.
// Si la petición falla se queda el HTML estático. Todo se construye con nodos del DOM (nunca innerHTML) porque los textos vienen de la base.
import { clave } from '../../lib/db.ts';
import { PISOS, SIN_FOTO, telHref, ubicacion } from '../../lib/sitio.ts';
import { ficha } from './buscar';

interface Esp { id: number; slug: string; nombre: string; total: number }
interface Med { id: number; nombre: string; telefono: string; consultorio: string; piso: string; foto: string; especialidades: { slug: string; nombre: string }[] }
interface Datos { especialidades: Esp[]; medicos: Med[] }

const medicosTxt = (n: number) => `${n} ${n === 1 ? 'médico' : 'médicos'}`;
// igual que el directorio estático: el piso sale del texto del consultorio; si no se entiende, el que eligió el admin
const pisoDe = (m: Med) => ubicacion(m.consultorio).piso ?? (PISOS.some((p) => p.id === m.piso) ? m.piso : '');
const lugarDe = (m: Med) => (!m.consultorio ? '' : /consultorio/i.test(m.consultorio) ? m.consultorio : `Consultorio ${m.consultorio}`);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & Record<string, unknown> = {}, ...hijos: (Node | string)[]) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...hijos);
  return e;
}

// Astro marca los elementos de cada componente con data-astro-cid-* y sus estilos solo valen con esa marca: lo que se arma aquí
// copia la del HTML estático (sin esto, las tarjetas y la lista rehechas quedaban sin estilo)
const cidsDe = (ref: Element | null) => (ref ? [...ref.attributes].filter((a) => a.name.startsWith('data-astro-cid-')).map((a) => a.name) : []);
const marcar = (raiz: Element, cids: string[]) => { for (const e of [raiz, ...raiz.querySelectorAll('*')]) for (const c of cids) e.setAttribute(c, ''); };

/** Huella de una ficha: sirve para saber si lo que trae la base ya es lo que dibujó el HTML estático (que sin foto pone SIN_FOTO). */
const huellaMed = (m: Med) => [ficha(m.nombre, ...m.especialidades.map((e) => e.nombre)), m.especialidades.map((e) => e.slug).join(' '), pisoDe(m), lugarDe(m), m.telefono, m.foto || SIN_FOTO].join('~');
const huellaLi = (li: HTMLElement) => [
  li.dataset.ficha, li.dataset.esp, li.dataset.piso,
  li.querySelector('.medico__dato')?.textContent?.trim() ?? '',
  li.querySelector('.medico__tel')?.textContent?.trim() ?? '',
  li.querySelector('.medico__foto img')?.getAttribute('src') ?? '',
].join('~');

function tarjeta(m: Med, iconos: { pin: Element | null; tel: Element | null }, cids: { lista: string[]; tarjeta: string[] }, ansiosa: boolean) {
  // sin foto, la imagen de la web oficial (como MedicoCard.astro); alt vacío porque el nombre va al lado
  const foto = el('img', { src: m.foto || SIN_FOTO, alt: m.foto ? `Foto de ${m.nombre}` : '', width: 480, height: 480, loading: ansiosa ? 'eager' : 'lazy', decoding: 'async' });
  const lugar = lugarDe(m);
  const cuerpo = el('div', { className: 'medico__body' },
    el('h3', { className: 'medico__nombre', textContent: m.nombre }),
    el('ul', { className: 'medico__esps' }, ...m.especialidades.map((e) => el('li', {}, el('a', { className: 'pill', href: `/directorio/?esp=${encodeURIComponent(e.slug)}`, textContent: e.nombre })))),
  );
  if (lugar) cuerpo.append(el('p', { className: 'medico__dato' }, ...(iconos.pin ? [iconos.pin.cloneNode(true)] : []), ` ${lugar}`));
  if (m.telefono) cuerpo.append(el('a', { className: 'medico__tel', href: telHref(m.telefono) }, ...(iconos.tel ? [iconos.tel.cloneNode(true)] : []), ` ${m.telefono}`));
  const art = el('article', { className: 'medico' }, el('div', { className: 'medico__foto' }, foto), cuerpo);
  art.dataset.clave = clave([m.nombre, ...m.especialidades.map((e) => e.nombre)].join(' '));
  art.dataset.esp = m.especialidades.map((e) => e.slug).join(' ');
  marcar(art, cids.tarjeta);
  const li = el('li', {}, art);
  for (const c of cids.lista) li.setAttribute(c, '');
  li.dataset.ficha = ficha(m.nombre, ...m.especialidades.map((e) => e.nombre));
  li.dataset.esp = art.dataset.esp;
  li.dataset.piso = pisoDe(m);
  li.hidden = true; // el filtro (filtro.ts) decide cuáles se ven
  return li;
}

function directorio(d: Datos) {
  const lista = document.getElementById('lista');
  const form = document.getElementById('buscar') as HTMLFormElement | null;
  if (!lista || !form) return;
  const actuales = [...lista.children] as HTMLElement[];
  const iguales = actuales.length === d.medicos.length && actuales.every((li, i) => huellaLi(li) === huellaMed(d.medicos[i]));
  if (iguales) return;
  const iconos = { pin: document.querySelector('.medico__dato svg'), tel: document.querySelector('.medico__tel svg') };
  const cids = { lista: cidsDe(lista.firstElementChild), tarjeta: cidsDe(lista.querySelector('.medico')) };
  lista.replaceChildren(...d.medicos.map((m, i) => tarjeta(m, iconos, cids, i < 4)));
  // opciones de los desplegables con las cuentas de la base
  const esp = form.elements.namedItem('esp') as HTMLSelectElement;
  const piso = form.elements.namedItem('piso') as HTMLSelectElement;
  esp.replaceChildren(el('option', { value: '', textContent: 'Todas' }), ...d.especialidades.map((e) => el('option', { value: e.slug, textContent: `${e.nombre} (${e.total})` })));
  const total = (id: string) => d.medicos.filter((m) => pisoDe(m) === id).length;
  const pisos = ['pb', '1', '2', '3', 's'].map((id) => PISOS.find((p) => p.id === id)!);
  piso.replaceChildren(el('option', { value: '', textContent: 'Todos' }), ...pisos.map((p) => el('option', { value: p.id, textContent: `${p.nombre} (${total(p.id)})` })));
  document.dispatchEvent(new CustomEvent('pm:datos'));
}

function especialidades(d: Datos) {
  const con = document.getElementById('lista-esp');
  if (!con) return;
  const sinBloque = document.getElementById('sin-medicos');
  const sinUl = sinBloque?.querySelector('ul') ?? null;
  const conDatos = d.especialidades.filter((e) => e.total > 0);
  const sinDatos = d.especialidades.filter((e) => e.total === 0);
  const huella = (xs: { n: string; t: string }[]) => xs.map((x) => `${x.n}:${x.t}`).join('|');
  const actualCon = [...con.querySelectorAll<HTMLElement>('li')].map((li) => ({ n: li.dataset.n ?? '', t: li.querySelector('.esp__n')?.textContent?.trim() ?? '' }));
  const nuevoCon = conDatos.map((e) => ({ n: clave(e.nombre), t: medicosTxt(e.total) }));
  const actualSin = sinUl ? [...sinUl.children].map((li) => ({ n: (li as HTMLElement).dataset.n ?? '', t: '' })) : [];
  const nuevoSin = sinDatos.map((e) => ({ n: clave(e.nombre), t: '' }));
  if (huella(actualCon) === huella(nuevoCon) && huella(actualSin) === huella(nuevoSin)) return;
  // las mismas tarjetas iguales del HTML estático, en una sola cuadrícula (iconos copiados de las que ya están)
  const cids = cidsDe(con);
  const iconos = { n: con.querySelector('.esp__n svg'), ir: con.querySelector('.esp__ir svg') };
  con.replaceChildren(...conDatos.map((e) => {
    const ir = el('span', { className: 'esp__ir' }, ...(iconos.ir ? [iconos.ir.cloneNode(true)] : []));
    ir.setAttribute('aria-hidden', 'true');
    const li = el('li', {}, el('a', { href: `/directorio/?esp=${encodeURIComponent(e.slug)}` },
      el('span', { className: 'esp__nombre', textContent: e.nombre }),
      el('span', { className: 'esp__n' }, ...(iconos.n ? [iconos.n.cloneNode(true)] : []), medicosTxt(e.total)),
      ir));
    li.dataset.n = clave(e.nombre);
    marcar(li, cids);
    return li;
  }));
  if (sinUl) {
    const cidsSin = cidsDe(sinUl);
    sinUl.replaceChildren(...sinDatos.map((e) => { const li = el('li', {}, el('span', { textContent: e.nombre })); li.dataset.n = clave(e.nombre); marcar(li, cidsSin); return li; }));
  }
  // las cuentas junto a los títulos: «Con médicos en el directorio 42» y «Sin médicos en el directorio por ahora 8»
  const [cuentaCon, cuentaSin] = document.querySelectorAll<HTMLElement>('.lista__t small');
  if (cuentaCon) cuentaCon.textContent = String(conDatos.length);
  if (cuentaSin) cuentaSin.textContent = String(sinDatos.length);
  const lead = document.querySelector('.page-hero .lead');
  if (lead && /^\d+ especialidades, \d+ de ellas/.test(lead.textContent ?? '')) {
    lead.textContent = `${d.especialidades.length} especialidades, ${conDatos.length} de ellas con médicos en el directorio. Elige una para ver sus médicos.`;
  }
  document.dispatchEvent(new CustomEvent('pm:datos'));
}

function cifras(d: Datos) {
  const n = { medicos: d.medicos.length, especialidades: d.especialidades.length, conMedicos: d.especialidades.filter((e) => e.total > 0).length };
  document.querySelectorAll<HTMLElement>('[data-vivo-n]').forEach((e) => {
    const v = String(n[e.dataset.vivoN as keyof typeof n] ?? '');
    if (!v) return;
    if (e.dataset.count !== undefined) e.dataset.count = v; // el contador de la portada termina en este valor
    e.textContent = v;
  });
}

async function hidratar() {
  try {
    const r = await fetch('/api/directorio', { headers: { accept: 'application/json' }, cache: 'no-cache' });
    if (!r.ok) return;
    const d = (await r.json()) as Datos;
    directorio(d);
    especialidades(d);
    cifras(d);
  } catch { /* sin conexión o sin servidor: se queda el HTML estático */ }
}

if (document.documentElement.dataset.vivo === '1') hidratar();
