// Arma el paquete para el hosting PHP + MariaDB: paquete/policlinica-php.zip
//   node tools/empaquetar-php.mjs            compila (astro build --mode php) y empaqueta
//   node tools/empaquetar-php.mjs --sin-build  usa el dist/ que ya está compilado
// SITE_URL (dominio del sitio, con https://) se toma de la variable de entorno; por defecto el dominio temporal del profesor.
// El ZIP trae public_html/ (lo que se sube a la carpeta del dominio) y policlinica-config.ejemplo.php (va un nivel más arriba, ya sin «.ejemplo»).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = process.env.SITE_URL || 'https://proyecto.pmaracaibo.com';
const TRABAJO = process.platform === 'win32' ? 'C:/pm-pkg-php' : '/tmp/pm-pkg-php'; // ruta corta: el límite de rutas de Windows rompe el ZIP con las carpetas largas de este proyecto
const PUBLIC = join(TRABAJO, 'public_html');
const ZONAS = ['acceso', 'panel', 'medico', 'secretaria', 'admin']; // las páginas reales las dibuja PHP; las copias estáticas de Astro se descartan

if (!process.argv.includes('--sin-build')) {
  execFileSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build', '--mode', 'php'], { stdio: 'inherit', env: { ...process.env, SITE_URL: SITE } });
}
if (!existsSync('dist/shell/admin/index.html')) throw new Error('Falta dist/ del modo php: ejecuta primero `npm run build:php`.');

rmSync(TRABAJO, { recursive: true, force: true });
mkdirSync(PUBLIC, { recursive: true });

// 1) sitio estático de Astro, sin los marcos ni las copias de las zonas privadas
cpSync('dist', PUBLIC, {
  recursive: true,
  filter: (src) => {
    const rel = src.replaceAll('\\', '/').replace(/^dist\/?/, '');
    return !(rel === 'shell' || rel.startsWith('shell/') || ZONAS.some((z) => rel === z || rel.startsWith(`${z}/`)));
  },
});

// 2) PHP: controlador, app/, .htaccess (sin pruebas ni el enrutador de desarrollo)
cpSync('php', PUBLIC, {
  recursive: true,
  filter: (src) => {
    const rel = src.replaceAll('\\', '/').replace(/^php\/?/, '');
    return !(rel === 'tests' || rel.startsWith('tests/') || rel === 'dev-router.php' || rel === 'app/shell' || rel.startsWith('app/shell/') || rel.endsWith('/.listo'));
  },
});

// 3) marcos de Astro → app/shell/<zona>.html (marcas @@…@@ que rellena shell.php)
mkdirSync(join(PUBLIC, 'app/shell'), { recursive: true });
for (const z of ZONAS) cpSync(`dist/shell/${z}/index.html`, join(PUBLIC, `app/shell/${z}.html`));

// 4) configuración de ejemplo (va FUERA de public_html)
writeFileSync(join(TRABAJO, 'policlinica-config.ejemplo.php'), `<?php
// Copiar como policlinica-config.php en la carpeta que contiene public_html (por ejemplo /home/usuario/), NO dentro de public_html.
// Los datos de la base salen de Webuzo → Database (nombre, usuario y contraseña que se crearon allí).
return [
    'db_host' => 'localhost',
    'db_name' => '',
    'db_user' => '',
    'db_pass' => '',
    'site_url' => '${SITE}',
    // Solo para la instalación: /instalar?token=… crea las tablas, carga los médicos y crea el primer administrador. Borrar estas líneas después.
    'instalar_token' => '',        // una cadena larga al azar
    'admin_correo' => '',
    'admin_nombre' => 'Administración',
    'admin_clave' => '',
    // Servidores TURN de la videollamada (JSON, opcional). Vacío = solo STUN público. Ver docs/DESPLIEGUE.md
    'ice_servers' => '',
];
`);

// 5) ZIP con el tar de Windows (bsdtar)
mkdirSync('paquete', { recursive: true });
const zip = 'paquete/policlinica-php.zip';
rmSync(zip, { force: true });
const tar = process.platform === 'win32' ? 'C:/Windows/System32/tar.exe' : 'zip';
if (process.platform === 'win32') execFileSync(tar, ['-a', '-c', '-f', join(process.cwd(), zip), 'public_html', 'policlinica-config.ejemplo.php'], { cwd: TRABAJO, stdio: 'inherit' });
else execFileSync('zip', ['-qr', join(process.cwd(), zip), 'public_html', 'policlinica-config.ejemplo.php'], { cwd: TRABAJO, stdio: 'inherit' });
const bytes = readFileSync(zip).length;
console.log(`\n${zip}: ${(bytes / 1048576).toFixed(1)} MB (dominio ${SITE})`);
