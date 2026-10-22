<?php
// Cola en vivo del médico. Equivale a src/server/api/cola.ts (rol médico; sin sesión, 401).
// GET → espera y consultas en curso con un código de sala opaco.
// POST atender genera automáticamente la sala; finalizar exige diagnóstico.
declare(strict_types=1);

$yo = exigir(['medico'], true);
session_write_close();   // la sesión solo se lee: los sondeos simultáneos no se esperan entre sí

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metodo === 'GET') json(cola($yo['id']));
if ($metodo !== 'POST') {
    header('Allow: GET, POST');
    texto('Método no permitido', 405);
}

$error = fn(string $m): never => redirigir('/medico/?error=' . rawurlencode($m));
$consulta = is_string($_POST['consulta'] ?? null) ? trim($_POST['consulta']) : '';
$id = ctype_digit($consulta) ? (int) $consulta : 0;
if ($id <= 0) $error('Consulta no válida.');

$accion = $_POST['accion'] ?? null;
if ($accion === 'finalizar') {
    $resultado = finalizar($id, $yo['id'], is_string($_POST['diagnostico'] ?? null) ? $_POST['diagnostico'] : '');
    if ($resultado) $error($resultado);
    redirigir('/medico/');
}
if ($accion !== 'atender') $error('Acción no válida.');
if (!atender($id, $yo['id'], salaVideo())) $error('Ese paciente ya fue tomado por otro médico o salió de la sala.');
redirigir('/medico/?atendiendo=' . $id);
