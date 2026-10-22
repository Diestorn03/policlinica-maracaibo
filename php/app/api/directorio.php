<?php
// GET /api/directorio · médicos y especialidades de la base, en JSON público con ETag.
// El HTML estático del directorio nace con los datos de ejemplo; src/components/directorio/vivo.ts pide esto y refresca las listas.
// `no-cache` + ETag: el navegador siempre pregunta y, si no cambió nada, recibe un 304 sin cuerpo.
declare(strict_types=1);

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metodo !== 'GET' && $metodo !== 'HEAD') {
    header('Allow: GET, HEAD');
    texto('Método no permitido', 405);
}

$cuerpo = json_encode(['especialidades' => especialidades(), 'medicos' => medicos()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
$etag = '"' . md5($cuerpo) . '"';

header('Cache-Control: no-cache');
header('ETag: ' . $etag);
// If-None-Match puede traer varios valores y el prefijo W/ (los proxies lo añaden al comprimir)
foreach (explode(',', $_SERVER['HTTP_IF_NONE_MATCH'] ?? '') as $visto) {
    $visto = trim($visto);
    if ($visto === '*' || preg_replace('/^W\//', '', $visto) === $etag) {
        http_response_code(304);
        exit;
    }
}
header('Content-Type: application/json; charset=utf-8');
if ($metodo === 'GET') echo $cuerpo;
