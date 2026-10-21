// Un solo código, dos modos (lo elige la variable PUBLIC_DEMO al compilar):
//  · servidor  (Cloudflare Workers + D1): lo real, con sesiones y formularios.
//  · demo      (PUBLIC_DEMO=1, GitHub Pages): todo estático; datos de ejemplo; las acciones privadas se simulan en el navegador.
import type { Rol } from './auth.ts';

export { getDB, getEnv } from '#fuente';

export const DEMO = import.meta.env.PUBLIC_DEMO === '1';

/** Antepone la base del sitio (GitHub Pages lo sirve en /policlinica-maracaibo/). Usar en TODO href/src interno y en las fotos de la BD. */
export const u = (path: string) => (path.startsWith('/') && !path.startsWith('//') ? import.meta.env.BASE_URL.replace(/\/$/, '') + path : path);

type UsuarioSesion = { id: number; rol: Rol; nombre: string };
/** En la demo no hay sesión: cada panel se muestra como lo vería su usuario de ejemplo (ids de fuente-demo.ts). */
export const DEMO_USUARIOS: Record<Rol, UsuarioSesion> = {
  admin: { id: 1, rol: 'admin', nombre: 'Administración Policlínica' },
  medico: { id: 2, rol: 'medico', nombre: 'Dr. Andy Atencio' },
  cliente: { id: 3, rol: 'cliente', nombre: 'María González' },
  secretaria: { id: 8, rol: 'secretaria', nombre: 'Sara Secretaria' },
};

/** Usuario de la página privada: el de la sesión (servidor) o el de ejemplo (solo en la demo). */
export function usuarioDe(locals: App.Locals, rol: Rol): UsuarioSesion {
  if (locals.usuario) return locals.usuario;
  if (DEMO) return DEMO_USUARIOS[rol];
  throw new Error(`Página privada sin sesión (${rol}): debe estar protegida en src/middleware.ts`);
}
