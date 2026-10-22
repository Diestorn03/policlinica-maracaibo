<?php
// Arranque común de la versión PHP + MariaDB: configuración, conexión, ayudas y librerías.
// Todo el código vive en app/ (bloqueado por app/.htaccess); solo index.php es público.
declare(strict_types=1);

mb_internal_encoding('UTF-8');
// En producción los errores van al registro del hosting, no a la página (romperían las cabeceras y el JSON). Para depurar: 'debug' => true en la configuración.
ini_set('display_errors', '0');
date_default_timezone_set('UTC');

/** Configuración: PM_CONFIG (ruta) o, por defecto, ../policlinica-config.php (fuera de public_html) o app/config.php. Devuelve un array. */
function config(string $clave = '', mixed $defecto = null): mixed {
    static $c = null;
    if ($c === null) {
        $c = [];
        foreach ([getenv('PM_CONFIG') ?: '', dirname(__DIR__, 2) . '/policlinica-config.php', __DIR__ . '/config.php'] as $ruta) {
            if ($ruta !== '' && is_file($ruta)) { $c = require $ruta; break; }
        }
        // las variables de entorno PM_DB_HOST, PM_DB_NAME, PM_DB_USER, PM_DB_PASS, PM_ADMIN_*… completan o reemplazan (pruebas con Docker)
        foreach (['db_host' => 'PM_DB_HOST', 'db_name' => 'PM_DB_NAME', 'db_user' => 'PM_DB_USER', 'db_pass' => 'PM_DB_PASS', 'site_url' => 'PM_SITE_URL', 'ice_servers' => 'PM_ICE_SERVERS', 'instalar_token' => 'PM_INSTALAR_TOKEN', 'admin_correo' => 'PM_ADMIN_CORREO', 'admin_clave' => 'PM_ADMIN_CLAVE'] as $k => $env) {
            if (($v = getenv($env)) !== false && $v !== '') $c[$k] = $v;
        }
    }
    return $clave === '' ? $c : ($c[$clave] ?? $defecto);
}
if (config('debug') === true) ini_set('display_errors', '1');

/** Conexión PDO a MariaDB (UTC, utf8mb4, errores como excepciones). */
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . config('db_host', 'localhost') . ';dbname=' . config('db_name', '') . ';charset=utf8mb4',
            (string) config('db_user', ''), (string) config('db_pass', ''),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ]
        );
        $pdo->exec("SET time_zone = '+00:00'");   // sin PDO::MYSQL_ATTR_INIT_COMMAND: está obsoleta desde PHP 8.4
    }
    return $pdo;
}

/** Todas las filas de una consulta con parámetros posicionales (?). */
function filas(string $sql, array $params = []): array {
    $s = db()->prepare($sql);
    $s->execute($params);
    return $s->fetchAll();
}
/** Una fila o null. */
function fila(string $sql, array $params = []): ?array {
    $s = db()->prepare($sql);
    $s->execute($params);
    $r = $s->fetch();
    return $r === false ? null : $r;
}
/** Un solo valor (primera columna de la primera fila) o null. */
function valor(string $sql, array $params = []): mixed {
    $r = fila($sql, $params);
    return $r === null ? null : array_values($r)[0];
}
/** Ejecuta INSERT/UPDATE/DELETE. Devuelve las filas afectadas. */
function ejecutar(string $sql, array $params = []): int {
    $s = db()->prepare($sql);
    $s->execute($params);
    return $s->rowCount();
}
function ultimoId(): int { return (int) db()->lastInsertId(); }

/** Escapa para HTML. */
function e(mixed $s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
/** Antepone la base del sitio (siempre «/» en el hosting propio); se deja por paridad con las plantillas de Astro. */
function u(string $ruta): string { return $ruta; }

/** minúsculas, sin acentos ni «Dr./Dra.»: para ordenar y buscar (igual que clave() de src/lib/db.ts). Sin depender de intl. */
function clave(string $s): string {
    $s = mb_strtolower(strtr($s, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'Á' => 'a', 'É' => 'e', 'Í' => 'i', 'Ó' => 'o', 'Ú' => 'u', 'Ü' => 'u',
        'à' => 'a', 'è' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u', 'â' => 'a', 'ê' => 'e', 'î' => 'i', 'ô' => 'o', 'û' => 'u', 'ç' => 'c', 'ñ' => 'n', 'Ñ' => 'n']));
    $s = preg_replace('/^\s*dra?\b[.,]?\s*/u', '', $s) ?? $s;
    return trim(preg_replace('/\s+/u', ' ', $s) ?? $s);
}
function slugify(string $s): string { return trim(preg_replace('/[^a-z0-9]+/', '-', clave($s)) ?? '', '-'); }

/** Fecha SQL (UTC) «AAAA-MM-DD HH:MM:SS» → DateTimeImmutable. */
function aFecha(string $s): DateTimeImmutable { return new DateTimeImmutable($s, new DateTimeZone('UTC')); }

/** Redirección 303 (después de un POST) y fin. */
function redirigir(string $url): never {
    header('Location: ' . $url, true, 303);
    exit;
}
/** Respuesta JSON y fin. */
function json(mixed $datos, int $estado = 200): never {
    http_response_code($estado);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
/** Texto simple con código de estado y fin. */
function texto(string $t, int $estado = 200): never {
    http_response_code($estado);
    header('Content-Type: text/plain; charset=utf-8');
    echo $t;
    exit;
}

/** Los POST de formularios solo valen desde el propio sitio (Origin o, si falta, Referer). Sin sesión de CSRF: SameSite=Lax + esta comprobación. */
function exigirMismoOrigen(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') return;
    $origen = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
    $host = parse_url($origen, PHP_URL_HOST);
    $propio = $_SERVER['HTTP_HOST'] ?? '';
    $propio = preg_replace('/:\d+$/', '', $propio) ?? $propio;
    if ($origen === '' || !is_string($host) || strcasecmp($host, $propio) !== 0) texto('Envío desde otro sitio no permitido.', 403);
}

require_once __DIR__ . '/auth.php';
foreach (glob(__DIR__ . '/lib/*.php') ?: [] as $modulo) require_once $modulo;   // medicos, usuarios, tele, sitio, senal, migrar, admin_ui…
require_once __DIR__ . '/shell.php';
