// Filtro de las tablas del admin: al escribir se ocultan las filas que no coinciden (misma búsqueda sin acentos del directorio).
// <input data-filtra="#cuerpo"> sobre <tbody id="cuerpo"> cuyas filas traen data-clave (ficha()) · <p data-cuenta-de="#cuerpo"> muestra «n de total».
import { clave } from '../../lib/db.ts';
import { coincide } from '../directorio/buscar';

for (const input of document.querySelectorAll<HTMLInputElement>('[data-filtra]')) {
  const filas = [...document.querySelector(input.dataset.filtra!)!.children] as HTMLElement[];
  const cuenta = document.querySelector<HTMLElement>(`[data-cuenta-de="${input.dataset.filtra}"]`);
  const vacio = document.querySelector<HTMLElement>(`[data-vacio-de="${input.dataset.filtra}"]`);
  let espera = 0;
  const aplicar = () => {
    const t = clave(input.value); // sin quitar «_» ni «%»: aquí se busca en memoria, no con LIKE
    let n = 0;
    for (const tr of filas) {
      tr.hidden = !coincide(tr.dataset.clave!, '', t, '');
      n += +!tr.hidden;
    }
    if (cuenta) cuenta.textContent = t ? `${n} de ${filas.length}` : `${filas.length}`;
    if (vacio) vacio.hidden = n > 0;
  };
  input.addEventListener('input', () => { clearTimeout(espera); espera = window.setTimeout(aplicar, 120); });
  input.form?.addEventListener('submit', (e) => e.preventDefault());
  aplicar();
}
