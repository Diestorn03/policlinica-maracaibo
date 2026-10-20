// Filtro instantáneo del directorio. Trabaja sobre las fichas que el HTML ya trae (data-ficha, data-esp, data-piso):
//  · al cargar lee location.search → así filtra la demo estática de GitHub Pages; en servidor repite lo que el HTML ya trae.
//  · al escribir (150 ms) o elegir, filtra y deja la URL compartible (?q=&esp=&piso=); ahí el movimiento no interviene (solo al cargar).
import { coincide, termino } from './buscar';
import { gsap, reduced } from '../../scripts/motion.js';

const form = document.querySelector<HTMLFormElement>('#buscar');
const lista = document.getElementById('lista');
if (form && lista) {
  const [q, esp, piso] = ['q', 'esp', 'piso'].map((n) => form.elements.namedItem(n) as HTMLInputElement & HTMLSelectElement);
  const fichas = [...lista.children] as HTMLElement[];
  const cuenta = document.getElementById('cuenta')!;
  const vacio = document.getElementById('vacio')!;
  const quitar = document.getElementById('quitar')!;

  const aplicar = () => {
    const t = termino(q.value.slice(0, 80));
    let n = 0;
    for (const li of fichas) {
      const ok = coincide(li.dataset.ficha!, li.dataset.esp!, t, esp.value) && (!piso.value || li.dataset.piso === piso.value);
      li.hidden = !ok;
      n += +ok;
    }
    const filtrado = !!(t || esp.value || piso.value);
    cuenta.textContent = filtrado ? `${n} ${n === 1 ? 'resultado' : 'resultados'} de ${fichas.length} médicos` : `${fichas.length} médicos`;
    vacio.hidden = n > 0;
    quitar.hidden = !filtrado;
    const url = new URL(location.href);
    for (const [k, v] of [['q', q.value.trim()], ['esp', esp.value], ['piso', piso.value]]) v ? url.searchParams.set(k, v) : url.searchParams.delete(k);
    history.replaceState(null, '', url);
  };

  let espera = 0;
  q.addEventListener('input', () => { clearTimeout(espera); espera = window.setTimeout(aplicar, 150); });
  esp.addEventListener('change', aplicar);
  piso.addEventListener('change', aplicar);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(espera);
    aplicar();
    if (matchMedia('(pointer: coarse)').matches) q.blur(); // en el teléfono, que el teclado deje ver los resultados
  });
  for (const a of document.querySelectorAll<HTMLElement>('[data-limpiar]')) {
    a.addEventListener('click', (e) => {
      if ((e as MouseEvent).button || (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey) return; // «abrir en pestaña nueva» sigue siendo un enlace
      e.preventDefault();
      q.value = esp.value = piso.value = '';
      aplicar();
      q.focus();
    });
  }

  // Estado inicial: la URL manda (en la demo el HTML trae a todos)
  const p = new URLSearchParams(location.search);
  const valida = (s: HTMLSelectElement, v: string | null) => ([...s.options].some((o) => o.value === v) ? v! : '');
  q.value = (p.get('q') ?? '').slice(0, 80);
  esp.value = valida(esp, p.get('esp'));
  piso.value = valida(piso, p.get('piso'));
  aplicar();
  // Entrada corta solo de las primeras 12 fichas visibles: una cascada sobre las 125 retrasaba el filtro unos segundos
  const visibles = fichas.filter((li) => !li.hidden);
  if (!reduced) gsap.from(visibles.slice(0, 12), { y: 36, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.05, clearProps: 'transform,opacity' });
}
