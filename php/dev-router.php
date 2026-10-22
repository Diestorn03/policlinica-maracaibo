<?php
// Solo para pruebas locales (no se sube): el servidor integrado de PHP hace lo que hace .htaccess en Apache.
$p = (string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($p, '/app/') || $p === '/app') { http_response_code(403); exit; }
$archivo = __DIR__ . $p;
if ($p !== '/' && is_file($archivo)) return false;
if (is_dir($archivo) && is_file(rtrim($archivo, '/') . '/index.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile(rtrim($archivo, '/') . '/index.html');
    return true;
}
require __DIR__ . '/index.php';
