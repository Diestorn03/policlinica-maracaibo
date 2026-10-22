<?php
// POST /api/sesion · usuario (correo o cédula) + clave [+ volver] → abre la sesión y lleva a su panel.  POST accion=salir → la cierra.
// Equivale a src/server/api/sesion.ts. El formulario vive en /acceso/, que muestra ?error=datos | ?error=limite | ?salio=1
declare(strict_types=1);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    texto('Método no permitido', 405);
}

/** Campo de formulario como texto ('' si falta o llegó como lista). */
$campo = fn(string $nombre): string => is_string($_POST[$nombre] ?? null) ? $_POST[$nombre] : '';

if ($campo('accion') === 'salir') {
    cerrarSesion();
    redirigir('/acceso/?salio=1');
}
if (!permitirIntento(ipCliente())) redirigir('/acceso/?error=limite');

$u = porLogin($campo('usuario'));
$ok = verificarClave($campo('clave'), $u['clave_hash'] ?? null);
if (!$u || !$ok || !(int) $u['activo']) redirigir('/acceso/?error=datos');

abrirSesion($u);   // regenera el id de sesión (contra session fixation)
$inicio = inicioDe($u['rol']);
$volver = $campo('volver');
// solo se vuelve a una página del propio panel (nada de redirecciones abiertas)
redirigir(str_starts_with($volver, $inicio) && !str_contains($volver, '//') && !preg_match('/[\x00-\x1f\x7f]/', $volver) ? $volver : $inicio);
