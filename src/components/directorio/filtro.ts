// Filtro instantáneo del directorio (DESIGN §6.4). Lo carga /directorio/ y trabaja sobre las fichas que el HTML ya trae
// (data-clave = nombre|especialidades normalizados, data-esp = slugs):
//  · al cargar lee location.search → así funciona la demo estática de GitHub Pages; en servidor repite lo que el HTML ya trae.
//  · al escribir (debounce 120 ms), elegir especialidad o pulsar un chip filtra al instante y actualiza la URL (?q=&esp=, compartible).
//  · el conteo (aria-live) se actualiza como mucho cada 400 ms; la lista nunca se anuncia.
//  · si quedan ≤ 40 fichas y el movimiento está permitido, GSAP Flip las reubica; si no, solo se alternan.
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { coincide, termino } from './buscar';

gsap.registerPlugin(Flip);

const lista = document.getElementById('dir-lista');
const form = document.querySelector<HTMLFormElement>('[data-buscador]');
if (lista && form) iniciar(lista, form);

function iniciar(lista: HTMLElement, form: HTMLFormElement) {
  const input = form.elements.namedItem('q') as HTMLInputElement;
  const select = form.elements.namedItem('esp') as HTMLSelectElement;
  const fichas = [...lista.children] as HTMLElement[];
  const conteo = document.getElementById('dir-conteo')!;
  const chips = [...document.querySelectorAll<HTMLAnchorElement>('.dir-chip')];
  const vacioBusqueda = document.querySelector<HTMLElement>('[data-vacio="busqueda"]')!;
  const vacioEsp = document.querySelector<HTMLElement>('[data-vacio="esp"]')!;
  const reducido = () => document.documentElement.dataset.fx === 'reduced';
  const slugs = [...select.options].map((o) => o.value);

  // Las que el servidor ocultó con `hidden` pasan a una clase: Flip necesita poder cambiar su display
  for (const li of fichas) if (li.hidden) { li.hidden = false; li.classList.add('dir-fuera'); }
  setTimeout(() => lista.classList.remove('dir-entrada'), 1600); // la entrada inicial ya terminó; que no se repita al filtrar

  let ultimo = '', enEspera = false;
  const anunciar = (texto: string) => {
    ultimo = texto;
    if (enEspera) return;
    enEspera = true;
    conteo.textContent = texto;
    setTimeout(() => { enEspera = false; if (conteo.textContent !== ultimo) conteo.textContent = ultimo; }, 400);
  };

  function aplicar(q: string, esp: string, animar: boolean) {
    const nq = termino(q);
    const visibles = new Set(fichas.filter((li) => coincide(li.dataset.clave!, li.dataset.esp!, nq, esp)));
    const alternar = () => fichas.forEach((li) => li.classList.toggle('dir-fuera', !visibles.has(li)));
    const cambia = fichas.some((li) => visibles.has(li) === li.classList.contains('dir-fuera'));
    if (animar && cambia && visibles.size <= 40 && !reducido()) {
      lista.classList.add('dir-anima');
      const estado = Flip.getState(fichas);
      alternar();
      Flip.from(estado, {
        duration: 0.5, ease: 'power2.inOut',
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, clearProps: 'opacity,transform' }),
        onComplete: () => lista.classList.remove('dir-anima'),
      });
    } else alternar();

    anunciar(`Mostrando ${visibles.size} de ${fichas.length} médicos`);
    chips.forEach((c) => (c.dataset.esp === esp ? c.setAttribute('aria-current', 'true') : c.removeAttribute('aria-current')));

    // Vacíos: «sin coincidencias» o «especialidad sin médicos» (la cuenta sale del texto de la opción: «Nombre (n)»)
    const opcion = /^(.*) \((\d+)\)$/.exec(select.selectedOptions[0]?.text ?? '');
    const sinMedicosEsp = !!esp && !!opcion && opcion[2] === '0';
    vacioBusqueda.hidden = !(visibles.size === 0 && !sinMedicosEsp);
    vacioEsp.hidden = !(visibles.size === 0 && sinMedicosEsp);
    const nombre = opcion?.[1] ?? '';
    vacioEsp.querySelector('[data-esp-nombre]')!.textContent = nombre;
    for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-wa]')) {
      const url = new URL(a.href);
      url.searchParams.set('text', esp && nombre ? `Consulta de especialidad - ${nombre}` : 'Consulta del directorio médico');
      a.href = url.href;
    }
  }

  function desdeFormulario() {
    const q = input.value.slice(0, 80), esp = select.value;
    aplicar(q, esp, true);
    const url = new URL(location.href);
    q.trim() ? url.searchParams.set('q', q.trim()) : url.searchParams.delete('q');
    esp ? url.searchParams.set('esp', esp) : url.searchParams.delete('esp');
    history.replaceState(null, '', url);
  }

  let espera = 0;
  input.addEventListener('input', () => { clearTimeout(espera); espera = window.setTimeout(desdeFormulario, 120); });
  select.addEventListener('change', desdeFormulario);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(espera);
    desdeFormulario();
    if (matchMedia('(pointer: coarse)').matches) input.blur(); // en el teléfono, que el teclado deje ver los resultados
  });
  for (const c of chips) {
    c.addEventListener('click', (e) => {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // «abrir en pestaña nueva» sigue siendo un enlace
      e.preventDefault();
      input.value = '';
      select.value = c.dataset.esp ?? '';
      desdeFormulario();
    });
  }

  // Estado inicial: la URL manda (en la demo el HTML trae a todos)
  const p = new URLSearchParams(location.search);
  const esp = slugs.includes(p.get('esp') ?? '') ? p.get('esp')! : '';
  const q = (p.get('q') ?? '').trim().slice(0, 80);
  input.value = q;
  select.value = esp;
  aplicar(q, esp, false);
}
