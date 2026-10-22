<?php
// Sesión y roles. Equivale a src/lib/auth.ts + src/middleware.ts: la sesión de PHP guarda id y versión; en cada petición privada
// se relee el usuario en la base (activo y misma versión), así desactivar a alguien o cambiarle la clave lo saca al instante.
declare(strict_types=1);

const ROLES = ['admin' => 'Administrador', 'medico' => 'Médico', 'cliente' => 'Cliente afiliado', 'secretaria' => 'Secretaria'];
const SESION_DURACION = 12 * 3600;

/** Panel al que va cada rol después de entrar. */
function inicioDe(string $rol): string {
    return ['admin' => '/admin/', 'medico' => '/medico/', 'cliente' => '/panel/', 'secretaria' => '/secretaria/'][$rol] ?? '/acceso/';
}

function https(): bool {
    return ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' || ($_SERVER['SERVER_PORT'] ?? '') === '443';
}

function iniciarSesion(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('pm_sesion');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => https(), 'httponly' => true, 'samesite' => 'Lax']);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string) SESION_DURACION);
    session_start();
}

/** Hash de contraseña (bcrypt/argon2 según el servidor). */
function hashClave(string $clave): string { return password_hash($clave, PASSWORD_DEFAULT); }

/** Verifica gastando el mismo tiempo aunque el usuario no exista: no revela qué correos están registrados. */
function verificarClave(string $clave, ?string $guardado): bool {
    static $falso = null;
    $falso ??= password_hash('sin-usuario', PASSWORD_DEFAULT);
    $ok = password_verify($clave, $guardado ?? $falso);
    return $guardado !== null && $ok;
}

/** Abre la sesión de un usuario ya verificado. */
function abrirSesion(array $u): void {
    iniciarSesion();
    session_regenerate_id(true);
    $_SESSION['id'] = (int) $u['id'];
    $_SESSION['version'] = (int) $u['version'];
    $_SESSION['vence'] = time() + SESION_DURACION;
}

function cerrarSesion(): void {
    iniciarSesion();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Lax']);
    }
    session_destroy();
}

/** Usuario de la sesión actual: ['id','rol','nombre'] o null. Relee la base y comprueba activo y versión. */
function usuarioActual(): ?array {
    static $u = false;
    if ($u !== false) return $u;
    $u = null;
    // solo se abre la sesión si el navegador trae la cookie (las páginas públicas no la tocan)
    if (!isset($_COOKIE['pm_sesion'])) return null;
    iniciarSesion();
    if (!isset($_SESSION['id'], $_SESSION['version']) || ($_SESSION['vence'] ?? 0) < time()) return null;
    $f = fila('SELECT id, rol, nombre, version, activo FROM usuarios WHERE id = ?', [$_SESSION['id']]);
    if ($f && (int) $f['activo'] === 1 && (int) $f['version'] === (int) $_SESSION['version']) $u = ['id' => (int) $f['id'], 'rol' => $f['rol'], 'nombre' => $f['nombre']];
    return $u;
}

/** Exige sesión con alguno de los roles. Sin sesión → /acceso/?volver=…  (páginas) o 401 (API). Rol equivocado → a su panel. */
function exigir(array $roles, bool $api = false): array {
    $u = usuarioActual();
    if ($u && in_array($u['rol'], $roles, true)) {
        header('Cache-Control: no-store');
        header('X-Robots-Tag: noindex');
        return $u;
    }
    if ($api) texto('No autorizado', 401);
    if ($u) redirigir(inicioDe($u['rol']));
    redirigir('/acceso/?volver=' . rawurlencode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'));
}

/** Límite de 5 intentos de inicio de sesión por minuto e IP. true = puede intentar. */
function permitirIntento(string $ip): bool {
    ejecutar('DELETE FROM intentos WHERE creado < (UTC_TIMESTAMP() - INTERVAL 10 MINUTE)');
    $n = (int) valor('SELECT COUNT(*) FROM intentos WHERE ip = ? AND creado > (UTC_TIMESTAMP() - INTERVAL 1 MINUTE)', [$ip]);
    ejecutar('INSERT INTO intentos (ip) VALUES (?)', [$ip]);
    return $n < 5;
}

/** IP del visitante (detrás del proxy del hosting se confía en X-Forwarded-For solo si viene de una dirección privada). */
function ipCliente(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    }
    return substr($ip, 0, 45);
}
