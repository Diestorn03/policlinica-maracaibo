// Script de la página «admin-usuarios», extraído de src/pages/admin/usuarios.astro para compartirlo con el marco de la versión PHP (src/shell/).
import { iniciarEdicion } from '../../components/admin/edicion';

// El marco de PHP carga este script en todas las pantallas del admin: solo actúa en la de usuarios (la que tiene el selector de rol)
const panel = document.getElementById('ficha') as HTMLDetailsElement | null;
const rol = panel?.querySelector<HTMLSelectElement>('[name=rol]') ?? null;
if (panel && rol) {
  const { editando, nuevo } = iniciarEdicion(panel);
  if (!editando && nuevo && [...rol.options].some((o) => o.value === nuevo)) rol.value = nuevo; // demo: el HTML no trae el rol de ?nuevo=
  // Cada rol usa sus campos: afiliación para clientes, ficha del directorio para médicos (el servidor valida todo igual).
  // Como en el servidor, la cédula es obligatoria solo para los clientes: el navegador lo avisa sin borrar nada.
  const cedula = panel.querySelector<HTMLInputElement>('[name=cedula]')!;
  const ver = () => {
    panel.querySelectorAll<HTMLElement>('[data-rol]').forEach((e) => (e.hidden = e.dataset.rol !== rol.value));
    cedula.required = rol.value === 'cliente';
  };
  rol.addEventListener('change', ver);
  ver();
}
