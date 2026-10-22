<?php
// Señalización de la videollamada entre el médico y el paciente de una consulta en curso (roles médico y cliente; sin sesión, 401).
// Equivale a src/server/api/senal.ts, pero por sondeo corto (el hosting no admite conexiones largas):
// GET  ?sala=…&sesion=…[&desde=N]  → { mensajes: [...] }  o { fin: true } si la consulta ya terminó
// POST JSON { sala, tipo, datos }  → 204 (se lo entrega al otro lado)
declare(strict_types=1);

const SENAL_TIPOS = ['oferta', 'respuesta', 'ice', 'salir'];
const SENAL_MAX_CUERPO = 40000;

$yo = exigir(['medico', 'cliente'], true);
session_write_close();   // la sesión solo se lee: el sondeo no bloquea las demás peticiones de la misma persona

/** Rol ('medico' | 'cliente') con el que participa el usuario en esa sala; null si no es el médico o el paciente de una consulta en curso. */
$participa = fn(mixed $sala): ?string => is_string($sala) && preg_match('/^pm-[a-z0-9]{24}$/', $sala) ? salaDe($sala, $yo['id']) : null;

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metodo === 'GET') {
    $sala = is_string($_GET['sala'] ?? null) ? $_GET['sala'] : '';
    $sesion = mb_substr(is_string($_GET['sesion'] ?? null) ? $_GET['sesion'] : '', 0, 40);
    $desde = max(0, (int) ($_GET['desde'] ?? 0));
    $rol = $sesion === '' ? null : $participa($sala);
    if ($rol === null) json(['fin' => true]);
    json(['mensajes' => senalSondear($sala, $rol, $sesion, $desde)]);
}
if ($metodo !== 'POST') {
    header('Allow: GET, POST');
    texto('Método no permitido', 405);
}

$cuerpo = (string) file_get_contents('php://input', false, null, 0, SENAL_MAX_CUERPO + 1);
if (strlen($cuerpo) > SENAL_MAX_CUERPO) texto('Mensaje demasiado grande', 413);
$m = json_decode($cuerpo, true);
if (!is_array($m)) texto('JSON no válido', 400);
$rol = $participa($m['sala'] ?? null);
if (!in_array($m['tipo'] ?? null, SENAL_TIPOS, true) || $rol === null) texto('No autorizado', 403);
senalEnviar($m['sala'], $rol, $m['tipo'], $m['datos'] ?? null);
http_response_code(204);
