<?php
// Controlador frontal: Apache manda aquí todo lo que no es un archivo (ver .htaccess). Las páginas públicas son HTML estático de Astro.
declare(strict_types=1);

require __DIR__ . '/app/boot.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

$ruta = rtrim('/' . trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/'), '/') ?: '/';

$tabla = [
    '/acceso' => 'pages/acceso.php',
    '/panel' => 'pages/panel.php',
    '/medico' => 'pages/medico.php',
    '/secretaria' => 'pages/secretaria.php',
    '/admin' => 'pages/admin/index.php',
    '/admin/medicos' => 'pages/admin/medicos.php',
    '/admin/clientes' => 'pages/admin/clientes.php',
    '/admin/usuarios' => 'pages/admin/usuarios.php',
    '/admin/especialidades' => 'pages/admin/especialidades.php',
    '/admin/consultas' => 'pages/admin/consultas.php',
    '/api/sesion' => 'api/sesion.php',
    '/api/espera' => 'api/espera.php',
    '/api/cola' => 'api/cola.php',
    '/api/senal' => 'api/senal.php',
    '/api/directorio' => 'api/directorio.php',
    '/instalar' => 'pages/instalar.php',
];

if (isset($tabla[$ruta])) {
    exigirMismoOrigen();
    require __DIR__ . '/app/' . $tabla[$ruta];
    exit;
}
if (preg_match('#^/fotos/(\d+)$#', $ruta, $m)) {
    $_GET['id'] = $m[1];
    require __DIR__ . '/app/api/foto.php';
    exit;
}

http_response_code(404);
$p = __DIR__ . '/404.html';
if (is_file($p)) { header('Content-Type: text/html; charset=utf-8'); readfile($p); } else { echo 'No encontrado'; }
