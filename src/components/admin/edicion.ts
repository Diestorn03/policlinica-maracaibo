// Edición en el admin con la página estática de la demo: ?editar=<id> rellena el formulario con los data-* de la fila
// (<tr data-id data-ficha='{"campo":…}'>) y ?nuevo abre el formulario vacío. En servidor el HTML ya viene relleno
// (data-editando en el panel) y aquí solo se ajusta lo que depende del modo.
//   [data-solo-edicion] / [data-solo-nuevo]  visibles solo al editar / al crear
//   [data-si="campo"]  visible si la ficha tiene ese campo · [data-texto="campo"] su texto · [data-src="campo"] su src
//   [data-req-nuevo]  obligatorio solo al crear (la contraseña)

type Ficha = Record<string, unknown>;

function rellenar(panel: HTMLElement, d: Ficha) {
  for (const form of panel.querySelectorAll('form')) {
    for (const el of form.elements as unknown as Iterable<HTMLInputElement>) {
      const v = d[el.name];
      if (!el.name || v === undefined || el.type === 'file' || el.type === 'password') continue;
      if (el.type === 'checkbox') el.checked = Array.isArray(v) ? v.map(String).includes(el.value) : !!Number(v);
      else el.value = v === null ? '' : String(v);
    }
  }
  panel.querySelectorAll<HTMLElement>('[data-si]').forEach((e) => (e.hidden = !d[e.dataset.si!]));
  panel.querySelectorAll<HTMLElement>('[data-texto]').forEach((e) => (e.textContent = String(d[e.dataset.texto!] ?? '')));
  panel.querySelectorAll<HTMLImageElement>('[data-src]').forEach((e) => (e.src = String(d[e.dataset.src!] ?? '')));
}

/** Devuelve el valor de ?nuevo= (por ejemplo el rol) o null; el panel pasa a modo edición si hay ?editar= */
export function iniciarEdicion(panel: HTMLDetailsElement): { editando: boolean; nuevo: string | null } {
  const p = new URLSearchParams(location.search);
  const id = p.get('editar');
  const fila = id && document.querySelector<HTMLElement>(`[data-ficha][data-id="${CSS.escape(id)}"]`);
  let editando = !!panel.dataset.editando;
  if (fila && !editando) {
    rellenar(panel, JSON.parse(fila.dataset.ficha!));
    editando = true;
  }
  panel.querySelectorAll<HTMLElement>('[data-solo-edicion]').forEach((e) => (e.hidden = !editando));
  panel.querySelectorAll<HTMLElement>('[data-solo-nuevo]').forEach((e) => (e.hidden = editando));
  panel.querySelectorAll<HTMLInputElement>('[data-req-nuevo]').forEach((e) => (e.required = !editando));
  const nuevo = p.get('nuevo');
  if (editando || nuevo !== null) {
    panel.open = true;
    panel.scrollIntoView({ block: 'start' });
    panel.querySelector<HTMLElement>('input:not([type=hidden]), select')?.focus({ preventScroll: true });
  }
  return { editando, nuevo };
}
