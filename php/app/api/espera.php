<?php
// Sala de espera del cliente. Equivale a src/server/api/espera.ts (rol cliente; sin sesión, 401).
// GET  → latido + estado JSON: { consulta: null | { estado, posicion, sala, medico, ... } }   (el panel lo llama cada 4 s)
// POST accion=entrar [motivo] | accion=cancelar → vuelve a /panel/ (funciona sin JS); con ?error=… si no pudo entrar
declare(strict_types=1);

$yo = exigir(['cliente'], true);
session_write_close();   // la sesión solo se lee: así los sondeos simultáneos de una misma persona no se esperan entre sí

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metodo === 'GET') json(['consulta' => estado($yo['id'])]);
if ($metodo !== 'POST') {
    header('Allow: GET, POST');
    texto('Método no permitido', 405);
}

if (($_POST['accion'] ?? null) === 'cancelar') {
    cancelar($yo['id']);
    redirigir('/panel/');
}
$error = entrar($yo['id'], is_string($_POST['motivo'] ?? null) ? $_POST['motivo'] : '');
redirigir($error ? '/panel/?error=' . rawurlencode($error) : '/panel/');
