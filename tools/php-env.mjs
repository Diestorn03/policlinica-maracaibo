// Entorno local de la versión PHP con Docker: MariaDB 11.8 + PHP 8.5 (como el hosting del profesor).
//   node tools/php-env.mjs up            levanta MariaDB (puerto 3307) y construye la imagen de PHP
//   node tools/php-env.mjs test <archivo>  sincroniza php/ y corre php/tests/<archivo> contra una base limpia (policlinica_test)
//   node tools/php-env.mjs serve         sitio completo (dist/ + php/) en http://localhost:8081  (base policlinica); con PM_SITE=paquete sirve el paquete ya armado
//   node tools/php-env.mjs apache        el paquete servido por Apache + mod_php con su .htaccess (puerto PM_PORT)
//   node tools/php-env.mjs sh <cmd...>   ejecuta un comando PHP en el contenedor de pruebas
//   node tools/php-env.mjs down          apaga todo
// Se trabaja desde C:/pm-php/<id> (ruta corta) para no chocar con el límite de rutas de Windows.
// Varias personas o agentes pueden trabajar a la vez con PM_ID distinto: cada PM_ID tiene su propia base (policlinica_<id>),
// su carpeta de trabajo, su contenedor web (pm-web-<id>) y su puerto (PM_PORT, 8081 por defecto).
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';

const ID = (process.env.PM_ID ?? 'main').replace(/[^a-z0-9_]/gi, '');
const TRABAJO = `C:/pm-php/${ID}`;
const BASE = `policlinica_${ID}`;
const WEB = `pm-web-${ID}`;
const PUERTO = process.env.PM_PORT ?? '8081';
const [cmd, ...resto] = process.argv.slice(2);
const docker = (...a) => execFileSync('docker', a, { stdio: 'inherit' });
const dockerOut = (...a) => spawnSync('docker', a, { encoding: 'utf8' });
const entorno = (base) => ['-e', 'PM_DB_HOST=pm-maria', '-e', `PM_DB_NAME=${base}`, '-e', 'PM_DB_USER=root', '-e', 'PM_DB_PASS=root', '-e', 'PM_INSTALAR_TOKEN=token-de-prueba'];

function sincronizar() {
  rmSync(`${TRABAJO}/php`, { recursive: true, force: true });
  mkdirSync(TRABAJO, { recursive: true });
  cpSync('php', `${TRABAJO}/php`, { recursive: true });
}

if (cmd === 'up') {
  dockerOut('network', 'create', 'pmnet');
  if (!dockerOut('ps', '-q', '-f', 'name=pm-maria').stdout.trim()) {
    dockerOut('rm', '-f', 'pm-maria');
    docker('run', '-d', '--name', 'pm-maria', '--network', 'pmnet', '-p', '3307:3306', '-e', 'MARIADB_ROOT_PASSWORD=root', '-e', 'MARIADB_DATABASE=policlinica', 'mariadb:11.8');
  }
  docker('build', '-t', 'pm-php', '-f', 'tools/php.Dockerfile', 'tools');
  for (let i = 0; i < 60; i++) {
    if (dockerOut('exec', 'pm-maria', 'mariadb-admin', '-uroot', '-proot', 'ping').status === 0) break;
    spawnSync('node', ['-e', 'setTimeout(()=>{},1000)']);
  }
  console.log('MariaDB lista en localhost:3307 (root/root).');
} else if (cmd === 'test') {
  sincronizar();
  const archivo = resto[0] ?? 'libs.php';
  dockerOut('exec', 'pm-maria', 'mariadb', '-uroot', '-proot', '-e', `DROP DATABASE IF EXISTS ${BASE}_test; CREATE DATABASE ${BASE}_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  docker('run', '--rm', '--network', 'pmnet', ...entorno(`${BASE}_test`), '-v', `${TRABAJO}/php:/app`, 'pm-php', 'php', `/app/tests/${archivo}`);
} else if (cmd === 'serve') {
  sincronizar();
  rmSync(`${TRABAJO}/site`, { recursive: true, force: true });
  if (process.env.PM_SITE === 'paquete') {
    // el paquete tal como se sube (node tools/empaquetar-php.mjs) + el enrutador que hace de .htaccess
    cpSync('C:/pm-pkg-php/public_html', `${TRABAJO}/site`, { recursive: true });
    cpSync('php/dev-router.php', `${TRABAJO}/site/dev-router.php`);
  } else {
    if (existsSync('dist')) cpSync('dist', `${TRABAJO}/site`, { recursive: true });
    cpSync('php', `${TRABAJO}/site`, { recursive: true });
  }
  dockerOut('exec', 'pm-maria', 'mariadb', '-uroot', '-proot', '-e', `CREATE DATABASE IF NOT EXISTS ${BASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  dockerOut('rm', '-f', WEB);
  docker('run', '-d', '--name', WEB, '--network', 'pmnet', '-p', `${PUERTO}:8081`, ...entorno(BASE), '-e', 'PM_ADMIN_CORREO=admin@prueba.test', '-e', 'PM_ADMIN_CLAVE=Prueba-local-123', '-e', 'PHP_CLI_SERVER_WORKERS=4', '-v', `${TRABAJO}/site:/site`, 'pm-php', 'php', '-S', '0.0.0.0:8081', '-t', '/site', '/site/dev-router.php');
  console.log(`Sitio en http://localhost:${PUERTO} (instalar una vez: /instalar?token=token-de-prueba; admin admin@prueba.test / Prueba-local-123)`);
} else if (cmd === 'apache') {
  // el paquete (node tools/empaquetar-php.mjs) servido por Apache + mod_php con su .htaccess, como en el hosting
  rmSync(`${TRABAJO}/apache`, { recursive: true, force: true });
  mkdirSync(TRABAJO, { recursive: true });
  cpSync('C:/pm-pkg-php/public_html', `${TRABAJO}/apache`, { recursive: true });
  docker('build', '-t', 'pm-apache', '-f', 'tools/apache.Dockerfile', 'tools');
  dockerOut('exec', 'pm-maria', 'mariadb', '-uroot', '-proot', '-e', `CREATE DATABASE IF NOT EXISTS ${BASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  dockerOut('rm', '-f', `pm-apache-${ID}`);
  docker('run', '-d', '--name', `pm-apache-${ID}`, '--network', 'pmnet', '-p', `${PUERTO}:80`, ...entorno(BASE), '-e', 'PM_ADMIN_CORREO=admin@prueba.test', '-e', 'PM_ADMIN_CLAVE=Prueba-local-123', '-v', `${TRABAJO}/apache:/var/www/html`, 'pm-apache');
  console.log(`Apache en http://localhost:${PUERTO} (instalar: /instalar?token=token-de-prueba)`);
} else if (cmd === 'sh') {
  sincronizar();
  docker('run', '--rm', '--network', 'pmnet', ...entorno(`${BASE}_test`), '-v', `${TRABAJO}/php:/app`, 'pm-php', ...resto);
} else if (cmd === 'down') {
  dockerOut('rm', '-f', WEB, `pm-apache-${ID}`);
  if (resto[0] === 'todo') dockerOut('rm', '-f', 'pm-maria');
  console.log('Apagado.');
} else {
  console.log('Uso: node tools/php-env.mjs up | test <archivo> | serve | sh <cmd> | down');
}
