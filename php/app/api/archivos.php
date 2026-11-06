<?php
// Documentos de la consulta (lib/archivos.php). Solo en la versión PHP.
// POST /api/archivos (rol cliente): archivo=<multipart> → lo agrega a su consulta activa · accion=quitar&id=N → lo quita.
//      Con «Accept: application/json» responde {archivos: […]} o {error, archivos} (el panel envía sin recargar: no corta la videollamada);
//      sin JS vuelve a /panel/ (con ?docs=<error> si no se pudo).
// GET /api/archivos/<id> (php/index.php deja el id en $_GET['id']): el paciente de la consulta o su médico descargan el documento.
declare(strict_types=1);

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (isset($_GET['id'])) {
    if ($metodo !== 'GET' && $metodo !== 'HEAD') {
        header('Allow: GET, HEAD');
        texto('Método no permitido', 405);
    }
    $yo = exigir(['cliente', 'medico'], true);
    session_write_close();
    $a = ctype_digit((string) $_GET['id']) ? archivoPara((int) $_GET['id'], $yo) : null;
    if (!$a) texto('Documento no encontrado', 404);
    $ascii = preg_replace('/[^\x20-\x7E]|["\\\\]/', '_', $a['nombre']) ?? 'documento';
    header('Content-Type: ' . $a['tipo']);
    header("Content-Disposition: attachment; filename=\"$ascii\"; filename*=UTF-8''" . rawurlencode($a['nombre']));
    header('Content-Length: ' . strlen($a['datos']));
    header('X-Content-Type-Options: nosniff');
    if ($metodo === 'GET') echo $a['datos'];
    exit;
}

if ($metodo !== 'POST') {
    header('Allow: POST');
    texto('Método no permitido', 405);
}
$yo = exigir(['cliente'], true);
session_write_close();

$responder = function (?string $error) use ($yo): never {
    if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
        $consulta = _consultaActiva($yo['id']);
        json(['archivos' => $consulta === null ? [] : archivosDe([$consulta])[$consulta]] + ($error ? ['error' => $error] : []), $error ? 400 : 200);
    }
    redirigir($error ? '/panel/?docs=' . rawurlencode($error) : '/panel/');
};

if (($_POST['accion'] ?? null) === 'quitar') {
    $id = is_string($_POST['id'] ?? null) && ctype_digit($_POST['id']) ? (int) $_POST['id'] : 0;
    $responder(quitarArchivo($yo['id'], $id) ? null : 'Ese documento ya no está.');
}

// si el envío pasó post_max_size, PHP descarta el cuerpo entero: se avisa del límite en vez de decir que falta el archivo
$f = $_FILES['archivo'] ?? null;
$demasiado = 'El archivo pesa más de ' . tamanoTexto(archivoMaxBytes()) . '.';
if (!is_array($f) || !is_int($f['error'] ?? null)) $responder(!$_POST && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0 ? $demasiado : 'Elige un archivo para enviar.');
$responder(match ($f['error']) {
    UPLOAD_ERR_OK => is_uploaded_file((string) $f['tmp_name']) ? guardarArchivo($yo['id'], (string) $f['name'], (string) file_get_contents((string) $f['tmp_name'])) : 'No se pudo recibir el archivo. Inténtalo de nuevo.',
    UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => $demasiado,
    UPLOAD_ERR_NO_FILE => 'Elige un archivo para enviar.',
    default => 'No se pudo recibir el archivo. Inténtalo de nuevo.',
});
