<?php
// Directorio de médicos y especialidades. Equivale a src/lib/db.ts (misma lógica y mismos mensajes), sobre MariaDB.
declare(strict_types=1);

/** Ejecuta $f dentro de una transacción (si ya hay una abierta, solo la ejecuta). Revierte y relanza si falla. */
if (!function_exists('enTransaccion')) {
    function enTransaccion(callable $f): mixed {
        $pdo = db();
        if ($pdo->inTransaction()) return $f();
        $pdo->beginTransaction();
        try {
            $r = $f();
            $pdo->commit();
            return $r;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }
}

/** true si el error de la base es «clave duplicada» (índice único). */
if (!function_exists('esDuplicado')) {
    function esDuplicado(Throwable $e): bool { return $e instanceof PDOException && (int) ($e->errorInfo[1] ?? 0) === 1062; }
}

/** "Dra Ana" / "Dra, Ana" / "Dr.Ana" → "Dra. Ana" */
function tituloMedico(string $s): string {
    $s = preg_replace('/\s+/u', ' ', trim($s)) ?? $s;
    return preg_replace_callback('/^(dra?)\b[.,]?\s*/iu', fn(array $m) => mb_strtolower($m[1]) === 'dra' ? 'Dra. ' : 'Dr. ', $s) ?? $s;
}

/** Patrón LIKE «contiene» sin comodines del usuario (% y _ se descartan; la barra se escapa). */
function _like(string $s): string { return '%' . str_replace(['%', '_', '\\'], ['', '', '\\\\'], $s) . '%'; }

/** Agrega `especialidades` (ordenadas por nombre) a cada médico con una sola consulta. */
function _conEspecialidades(array $medicos): array {
    foreach ($medicos as &$m) { $m['id'] = (int) $m['id']; $m['especialidades'] = []; }
    unset($m);
    if (!$medicos) return [];
    $ids = array_column($medicos, 'id');
    $rows = filas('SELECT x.medico_id, e.id, e.slug, e.nombre FROM medico_especialidad x JOIN especialidades e ON e.id = x.especialidad_id
        WHERE x.medico_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ') ORDER BY e.clave, e.id', $ids);
    $porMedico = [];
    foreach ($rows as $r) $porMedico[(int) $r['medico_id']][] = ['id' => (int) $r['id'], 'slug' => $r['slug'], 'nombre' => $r['nombre']];
    foreach ($medicos as &$m) $m['especialidades'] = $porMedico[$m['id']] ?? [];
    return $medicos;
}

const _CAMPOS_MEDICO = 'm.id, m.nombre, m.telefono, m.consultorio, m.piso, m.consultorios, m.foto';

/** Especialidades con su número de médicos, en orden alfabético */
function especialidades(): array {
    $rows = filas('SELECT e.id, e.slug, e.nombre, COUNT(x.medico_id) AS total FROM especialidades e
        LEFT JOIN medico_especialidad x ON x.especialidad_id = e.id GROUP BY e.id, e.slug, e.nombre, e.clave ORDER BY e.clave');
    return array_map(fn(array $r) => ['id' => (int) $r['id'], 'slug' => $r['slug'], 'nombre' => $r['nombre'], 'total' => (int) $r['total']], $rows);
}

/** Búsqueda pública: q por nombre del médico o de la especialidad; esp = slug exacto */
function medicos(array $f = []): array {
    $like = _like(clave((string) ($f['q'] ?? '')));
    $esp = (string) ($f['esp'] ?? '');
    $rows = filas('SELECT ' . _CAMPOS_MEDICO . ' FROM medicos m
        WHERE (? = \'%%\' OR m.clave LIKE ? OR EXISTS (SELECT 1 FROM medico_especialidad x JOIN especialidades e ON e.id = x.especialidad_id
            WHERE x.medico_id = m.id AND e.clave LIKE ?))
        AND (? = \'\' OR EXISTS (SELECT 1 FROM medico_especialidad x JOIN especialidades e ON e.id = x.especialidad_id
            WHERE x.medico_id = m.id AND e.slug = ?))
        ORDER BY m.clave, m.id', [$like, $like, $like, $esp, $esp]);
    return _conEspecialidades($rows);
}

/** Cifras de la portada, derivadas de la base en cada petición: nunca se quedan viejas tras un alta o baja */
function resumen(): array {
    $e = especialidades();
    $con = array_values(array_filter($e, fn(array $x) => $x['total'] > 0));
    usort($con, fn(array $a, array $b) => $b['total'] <=> $a['total'] ?: strcmp(clave($a['nombre']), clave($b['nombre'])));
    return [
        'medicos' => (int) valor('SELECT COUNT(*) FROM medicos'),
        'especialidades' => count($e),
        'conMedicos' => count($con),
        'top' => array_map(fn(array $x) => ['slug' => $x['slug'], 'nombre' => $x['nombre'], 'total' => $x['total']], array_slice($con, 0, 8)),
    ];
}

/** Retratos de la vitrina: solo médicos con foto, en orden alfabético, empezando en (día del año × 5) mod N y circular.
 *  Rota cada día (hora de Maracaibo) y reparte la vitrina entre todos. */
function retratosDelDia(int $n = 12, ?DateTimeImmutable $hoy = null): array {
    $todos = array_values(array_filter(medicos(), fn(array $m) => $m['foto'] !== ''));
    if (!$todos) return [];
    $c = ($hoy ?? new DateTimeImmutable('now', new DateTimeZone('UTC')))->getTimestamp() - 4 * 3600;
    $dia = (int) gmdate('z', $c) + 1;   // día del año, 1 = 1 de enero
    $out = [];
    for ($i = 0; $i < min($n, count($todos)); $i++) $out[] = $todos[($dia * 5 + $i) % count($todos)];
    return $out;
}

function medico(int $id): ?array {
    $r = fila('SELECT ' . _CAMPOS_MEDICO . ' FROM medicos m WHERE m.id = ?', [$id]);
    return $r ? _conEspecialidades([$r])[0] : null;
}

function _pisoDe(string $s): ?string { return isset(PISOS[$s]) ? $s : null; }

/** «28, 28a; 13-14-14B» → ['28', '28A', …] · '' → [] · formato no válido → null */
function _normalizarConsultorios(string $s): ?array {
    $limpio = mb_strtoupper(trim($s));
    if ($limpio === '') return [];
    $partes = array_filter(array_map('trim', preg_split('/[,;]+/', preg_replace('/(\d)\s*-\s*(\d)/', '$1,$2', $limpio) ?? $limpio) ?: []), fn(string $p) => $p !== '');
    $puertas = [];
    foreach ($partes as $parte) {
        if (!preg_match('/^(\d{1,3})\s*([AB])?$/D', $parte, $m)) return null;
        $puerta = $m[1] . ($m[2] ?? '');
        if (!in_array($puerta, $puertas, true)) $puertas[] = $puerta;
    }
    return $puertas;
}

function _textoUbicacion(string $piso, array $puertas): string {
    return PISOS[$piso] . ($puertas ? ', consultorio ' . implode(', ', $puertas) : '');
}

/** Valida lo que llega del formulario del admin ($_POST; las especialidades en `especialidades[]`).
 *  Devuelve el dato limpio ['nombre','telefono','consultorio','piso','consultorios','especialidades' => int[]] o el mensaje de error. */
function validarMedico(array $post): array|string {
    $g = fn(string $k): string => is_scalar($post[$k] ?? null) ? (string) $post[$k] : '';
    $nombre = mb_substr(tituloMedico($g('nombre')), 0, 120);
    $telefono = mb_substr(trim($g('telefono')), 0, 40);
    $piso = _pisoDe(strtolower(trim($g('piso'))));
    $puertas = _normalizarConsultorios($g('consultorios'));
    $esps = [];
    foreach ((array) ($post['especialidades'] ?? []) as $v) {
        if (!is_scalar($v) || !is_numeric($v)) continue;
        $n = $v + 0;
        if ($n > 0 && $n <= 2147483647 && floor((float) $n) == $n && !in_array((int) $n, $esps, true)) $esps[] = (int) $n;
    }
    if (mb_strlen(clave($nombre)) < 3) return 'Escribe el nombre del médico.';
    if ($piso === null) return 'Elige el piso del consultorio.';
    if ($puertas === null) return 'Escribe consultorios como 28, 28A o 13, 14, 14B.';
    if (!$esps) return 'Elige al menos una especialidad.';
    if ($telefono !== '' && !preg_match('/^[\d\s()+-]{7,}$/D', $telefono)) return 'El teléfono solo puede tener números, espacios, guiones y paréntesis.';
    $original = mb_substr(preg_replace('/\s+/u', ' ', trim($g('consultorio_original'))) ?? '', 0, 80);
    $consultorio = $puertas ? _textoUbicacion($piso, $puertas) : ($original !== '' ? $original : _textoUbicacion($piso, $puertas));
    return ['nombre' => $nombre, 'telefono' => $telefono, 'consultorio' => $consultorio, 'piso' => $piso, 'consultorios' => implode(', ', $puertas), 'especialidades' => $esps];
}

/** Crea (sin id) o actualiza un médico y reemplaza sus especialidades. Devuelve el id. */
function guardarMedico(array $m, ?int $id = null): int {
    return enTransaccion(function () use ($m, $id): int {
        if ($id) {
            ejecutar('UPDATE medicos SET nombre = ?, clave = ?, telefono = ?, consultorio = ?, piso = ?, consultorios = ? WHERE id = ?',
                [$m['nombre'], clave($m['nombre']), $m['telefono'], $m['consultorio'], $m['piso'], $m['consultorios'], $id]);
        } else {
            ejecutar('INSERT INTO medicos (nombre, clave, telefono, consultorio, piso, consultorios) VALUES (?, ?, ?, ?, ?, ?)',
                [$m['nombre'], clave($m['nombre']), $m['telefono'], $m['consultorio'], $m['piso'], $m['consultorios']]);
            $id = ultimoId();
        }
        ejecutar('DELETE FROM medico_especialidad WHERE medico_id = ?', [$id]);
        foreach ($m['especialidades'] as $e) {
            ejecutar('INSERT IGNORE INTO medico_especialidad (medico_id, especialidad_id) SELECT ?, id FROM especialidades WHERE id = ?', [$id, $e]);
        }
        return $id;
    });
}

function borrarMedico(int $id): void { ejecutar('DELETE FROM medicos WHERE id = ?', [$id]); }

/** Guarda la foto subida (la cara de la tarjeta). $archivo = entrada de $_FILES. Devuelve error en texto o null.
 *  El tipo guardado sale de la lista blanca (nunca el texto del navegador), así que /fotos/<id> no puede servir SVG ni HTML. */
function guardarFoto(int $id, array $archivo): ?string {
    $error = (int) ($archivo['error'] ?? UPLOAD_ERR_OK);
    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) return 'La foto pesa más de 1 MB.';
    $tipo = (string) ($archivo['type'] ?? '');
    if (!in_array($tipo, ['image/webp', 'image/jpeg', 'image/png'], true)) return 'La foto debe ser WebP, JPG o PNG.';
    if ($error !== UPLOAD_ERR_OK) return 'No se pudo recibir la foto.';
    $datos = file_get_contents((string) ($archivo['tmp_name'] ?? ''), false, null, 0, 1_000_001);
    if ($datos === false) return 'No se pudo recibir la foto.';
    if (strlen($datos) > 1_000_000) return 'La foto pesa más de 1 MB.';
    enTransaccion(function () use ($id, $tipo, $datos): void {
        $s = db()->prepare('INSERT INTO fotos (medico_id, tipo, datos) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), datos = VALUES(datos)');
        $s->bindValue(1, $id, PDO::PARAM_INT);
        $s->bindValue(2, $tipo);
        $s->bindValue(3, $datos, PDO::PARAM_LOB);   // binario: sin conversión de juego de caracteres
        $s->execute();
        ejecutar('UPDATE medicos SET foto = ? WHERE id = ?', ["/fotos/$id?v=" . base_convert((string) (int) (microtime(true) * 1000), 10, 36), $id]);
    });
    return null;
}

function quitarFoto(int $id): void {
    enTransaccion(function () use ($id): void {
        ejecutar('DELETE FROM fotos WHERE medico_id = ?', [$id]);
        ejecutar("UPDATE medicos SET foto = '' WHERE id = ?", [$id]);
    });
}

/** ['tipo' => 'image/webp', 'datos' => bytes] de la foto subida, o null. */
function foto(int $id): ?array {
    $r = fila('SELECT tipo, datos FROM fotos WHERE medico_id = ?', [$id]);
    return $r ? ['tipo' => (string) $r['tipo'], 'datos' => (string) $r['datos']] : null;
}

function _normalizarEspecialidad(string $nombre): string {
    return mb_substr(preg_replace('/\s+/u', ' ', trim($nombre)) ?? '', 0, 80);
}

function crearEspecialidad(string $nombre): ?string {
    $nombre = _normalizarEspecialidad($nombre);
    if (mb_strlen(clave($nombre)) < 3) return 'Escribe el nombre de la especialidad.';
    $slug = slugify($nombre);
    if (fila('SELECT 1 FROM especialidades WHERE slug = ? OR clave = ?', [$slug, clave($nombre)])) return 'Esa especialidad ya existe.';
    try {
        ejecutar('INSERT INTO especialidades (slug, nombre, clave) VALUES (?, ?, ?)', [$slug, $nombre, clave($nombre)]);
    } catch (PDOException $e) {
        if (esDuplicado($e)) return 'Esa especialidad ya existe.';
        throw $e;
    }
    return null;
}

/** Renombra sin cambiar el slug público ni las asignaciones de médicos. */
function editarEspecialidad(int $id, string $nombre): ?string {
    if ($id <= 0 || !fila('SELECT 1 FROM especialidades WHERE id = ?', [$id])) return 'La especialidad no existe.';
    $nombre = _normalizarEspecialidad($nombre);
    $claveNombre = clave($nombre);
    if (mb_strlen($claveNombre) < 3) return 'Escribe el nombre de la especialidad.';
    $slug = slugify($nombre);
    foreach (filas('SELECT nombre, clave FROM especialidades WHERE id != ?', [$id]) as $otra) {
        if (slugify($otra['nombre']) === $slug || $otra['clave'] === $claveNombre) return 'Esa especialidad ya existe.';
    }
    try {
        ejecutar('UPDATE especialidades SET nombre = ?, clave = ? WHERE id = ?', [$nombre, $claveNombre, $id]);
    } catch (PDOException $e) {
        if (esDuplicado($e)) return 'Esa especialidad ya existe.';
        throw $e;
    }
    return null;
}

/** Solo se borra si ningún médico la tiene: así nadie queda sin especialidad por accidente. */
function borrarEspecialidad(int $id): ?string {
    if (fila('SELECT 1 FROM medico_especialidad WHERE especialidad_id = ?', [$id])) return 'Primero quita esta especialidad a sus médicos.';
    ejecutar('DELETE FROM especialidades WHERE id = ?', [$id]);
    return null;
}
