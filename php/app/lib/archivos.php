<?php
// Documentos de la consulta (pedido de la clínica): el paciente envía informes o estudios (PDF, Word o fotos) desde que entra a la sala
// de espera hasta que termina la videollamada, y el médico que lo atiende los descarga (en la consulta en curso y en su historial).
// Se guardan en la base (tabla archivos). El tipo se decide por los primeros bytes, no por la extensión ni por lo que diga el navegador.
// Solo en la versión PHP: en la demo los simula el navegador (src/scripts/api.js).
declare(strict_types=1);

const ARCHIVOS_POR_CONSULTA = 10;
const ARCHIVO_TOPE = 10 * 1024 * 1024;   // por archivo; PHP o MariaDB pueden imponer uno menor (archivoMaxBytes())
const ARCHIVO_TIPOS = [
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg' => 'image/jpeg',
    'png' => 'image/png',
];

/** «8M», «512K», «1G» de php.ini → bytes (0 = sin límite). */
function bytesIni(string $v): int {
    $v = trim($v);
    $n = (int) $v;
    return match (strtolower(substr($v, -1))) { 'g' => $n << 30, 'm' => $n << 20, 'k' => $n << 10, default => $n };
}

/** Lo más que puede pesar un documento: el tope de la clínica o lo que dejen PHP (upload_max_filesize, post_max_size) y MariaDB
 *  (max_allowed_packet), lo que sea menor. Se muestra en el panel del paciente, así que siempre es el límite real del servidor. */
function archivoMaxBytes(): int {
    static $max = null;
    if ($max !== null) return $max;
    $margen = 65536;   // el resto del formulario multipart y de la sentencia INSERT
    $limites = [ARCHIVO_TOPE, bytesIni((string) ini_get('upload_max_filesize')), bytesIni((string) ini_get('post_max_size')) - $margen, (int) valor('SELECT @@max_allowed_packet') - $margen];
    return $max = min(array_filter($limites, fn(int $l) => $l > 0));
}

/** «1,2 MB» o «350 KB». */
function tamanoTexto(int $bytes): string {
    return $bytes >= 1048576 ? str_replace('.', ',', (string) round($bytes / 1048576, 1)) . ' MB' : max(1, (int) round($bytes / 1024)) . ' KB';
}

/** Tipo por la firma del archivo: 'pdf' | 'doc' | 'docx' | 'jpg' | 'png', o null si no es uno de esos.
 *  Word se confirma con la extensión: un .doc es un contenedor OLE (como un .xls) y un .docx es un ZIP con word/ dentro. */
function tipoArchivo(string $datos, string $nombre): ?string {
    $ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
    return match (true) {
        str_contains(substr($datos, 0, 1024), '%PDF-') => 'pdf',   // la norma admite basura antes de la firma
        str_starts_with($datos, "\xFF\xD8\xFF") => 'jpg',
        str_starts_with($datos, "\x89PNG\r\n\x1A\n") => 'png',
        $ext === 'doc' && str_starts_with($datos, "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1") => 'doc',
        $ext === 'docx' && str_starts_with($datos, "PK\x03\x04") && str_contains($datos, 'word/') => 'docx',
        default => null,
    };
}

/** El nombre que se muestra y con el que se descarga: sin carpetas ni caracteres de control, 120 caracteres como mucho y con la extensión de su tipo. */
function nombreArchivo(string $nombre, string $tipo): string {
    $base = preg_replace('#^.*[/\\\\]#u', '', $nombre) ?? '';   // sin carpetas (basename() depende del locale con nombres no ASCII)
    $base = preg_replace('/\.[^.]*$/u', '', $base) ?? '';     // la extensión la pone el tipo real
    $base = trim(preg_replace('/[\x00-\x1F\x7F\s]+/u', ' ', $base) ?? '');
    return ($base !== '' ? mb_substr($base, 0, 120) : 'documento') . '.' . $tipo;
}

/** La consulta activa del cliente (en espera o con el médico), o null. */
function _consultaActiva(int $clienteId): ?int {
    $id = valor("SELECT id FROM consultas WHERE cliente_id = ? AND estado IN ('espera', 'atendiendo')", [$clienteId]);
    return $id === null ? null : (int) $id;
}

/** Agrega un documento a la consulta activa del cliente. Error en texto o null. */
function guardarArchivo(int $clienteId, string $nombre, string $datos): ?string {
    $consulta = _consultaActiva($clienteId);
    if ($consulta === null) return 'Entra a la sala de espera para enviar documentos.';
    if ($datos === '') return 'El archivo está vacío.';
    if (strlen($datos) > archivoMaxBytes()) return 'El archivo pesa más de ' . tamanoTexto(archivoMaxBytes()) . '.';
    $tipo = tipoArchivo($datos, $nombre);
    if ($tipo === null) return 'Solo se pueden enviar PDF, Word (.doc o .docx) o fotos JPG o PNG.';
    if ((int) valor('SELECT COUNT(*) FROM archivos WHERE consulta_id = ?', [$consulta]) >= ARCHIVOS_POR_CONSULTA) return 'Ya enviaste ' . ARCHIVOS_POR_CONSULTA . ' documentos en esta consulta.';
    $s = db()->prepare('INSERT INTO archivos (consulta_id, nombre, tipo, tamano, datos) VALUES (?, ?, ?, ?, ?)');
    $s->bindValue(1, $consulta, PDO::PARAM_INT);
    $s->bindValue(2, nombreArchivo($nombre, $tipo));
    $s->bindValue(3, ARCHIVO_TIPOS[$tipo]);
    $s->bindValue(4, strlen($datos), PDO::PARAM_INT);
    $s->bindValue(5, $datos, PDO::PARAM_LOB);   // binario: sin conversión de juego de caracteres
    $s->execute();
    return null;
}

/** El paciente quita un documento que envió por error (solo mientras su consulta sigue activa). */
function quitarArchivo(int $clienteId, int $archivoId): bool {
    return ejecutar("DELETE a FROM archivos a JOIN consultas c ON c.id = a.consulta_id
        WHERE a.id = ? AND c.cliente_id = ? AND c.estado IN ('espera', 'atendiendo')", [$archivoId, $clienteId]) === 1;
}

/** Los documentos, sin el contenido, de varias consultas: [consulta_id => [['id','nombre','tamano','subido'], …]]. */
function archivosDe(array $consultas): array {
    $ids = array_values(array_unique(array_map('intval', $consultas)));
    if (!$ids) return [];
    $out = array_fill_keys($ids, []);
    $marcas = implode(', ', array_fill(0, count($ids), '?'));
    foreach (filas("SELECT id, consulta_id, nombre, tamano, subido FROM archivos WHERE consulta_id IN ($marcas) ORDER BY id", $ids) as $r) {
        $out[(int) $r['consulta_id']][] = ['id' => (int) $r['id'], 'nombre' => $r['nombre'], 'tamano' => (int) $r['tamano'], 'subido' => $r['subido']];
    }
    return $out;
}

/** Un documento con su contenido si quien lo pide puede verlo: el paciente de la consulta o el médico que la atiende o la atendió. */
function archivoPara(int $archivoId, array $yo): ?array {
    $r = fila('SELECT a.nombre, a.tipo, a.datos, c.cliente_id, c.medico_id FROM archivos a JOIN consultas c ON c.id = a.consulta_id WHERE a.id = ?', [$archivoId]);
    if (!$r) return null;
    $id = (int) $yo['id'];
    $suyo = match ($yo['rol']) {
        'cliente' => (int) $r['cliente_id'] === $id,
        'medico' => $r['medico_id'] !== null && (int) $r['medico_id'] === $id,
        default => false,
    };
    return $suyo ? ['nombre' => (string) $r['nombre'], 'tipo' => (string) $r['tipo'], 'datos' => (string) $r['datos']] : null;
}

/** Borra los documentos de las consultas canceladas: si el paciente se fue sin que lo atendieran, nadie debe quedarse con ellos. */
function _limpiarArchivos(): void {
    ejecutar("DELETE a FROM archivos a JOIN consultas c ON c.id = a.consulta_id WHERE c.estado = 'cancelada'");
}
