// Crea un usuario directamente en D1 (sirve para el primer administrador; los demás se crean desde /admin/).
//   node tools/usuario.mjs --rol admin --nombre "Nombre" --correo correo@dominio [--cedula V-123] [--remote] [--persist-to C:/pm-state]
// La contraseña sale de la variable NUEVA_CLAVE o se genera una al azar y se muestra una sola vez.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { hashClave } from '../src/lib/auth.ts';
import { cedula } from '../src/lib/usuarios.ts';

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const rol = arg('rol'), nombre = arg('nombre'), correo = arg('correo')?.toLowerCase();
if (!['admin', 'medico', 'cliente'].includes(rol) || !nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo ?? '')) {
  console.error('Uso: node tools/usuario.mjs --rol admin|medico|cliente --nombre "…" --correo … [--cedula V-123] [--medico-id N] [--vence AAAA-MM-DD] [--nacimiento AAAA-MM-DD] [--remote]');
  process.exit(1);
}
const clave = process.env.NUEVA_CLAVE || randomBytes(9).toString('base64url');
const q = (v) => (v == null ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`);
const sql = `INSERT INTO usuarios (rol, nombre, correo, cedula, clave_hash, medico_id, nacimiento, afiliacion_vence) VALUES (${q(rol)}, ${q(nombre)}, ${q(correo)}, ${q(arg('cedula') ? cedula(arg('cedula')) : null)}, ${q(await hashClave(clave))}, ${arg('medico-id') ? Number(arg('medico-id')) : 'NULL'}, ${q(arg('nacimiento'))}, ${q(arg('vence'))});`;
const destino = process.argv.includes('--remote') ? ['--remote'] : ['--local', ...(arg('persist-to') ? ['--persist-to', arg('persist-to')] : [])];
// wrangler por node directo (sin shell): el SQL llega intacto como un solo argumento también en Windows
execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'policlinica', ...destino, '--command', sql], { stdio: 'inherit' });
if (!process.env.NUEVA_CLAVE) console.log(`\nUsuario ${correo} creado. Contraseña (guárdala, no se vuelve a mostrar): ${clave}`);
