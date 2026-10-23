<?php
// Usuarios con rol: admin (gestiona todo), médico (atiende la sala de espera), cliente (afiliado con telemedicina) y secretaria (solo inscribe clientes).
// Equivale a src/lib/usuarios.ts. ROLES, hashClave() y verificarClave() están en auth.php.
declare(strict_types=1);

const _CAMPOS_USUARIO = 'id, rol, nombre, correo, cedula, activo, medico_id, telefono, nacimiento, direccion, afiliacion_vence, creado';

/** Fila de la base → usuario con enteros donde corresponde. */
function _usuario(array $r): array {
    $r['id'] = (int) $r['id'];
    $r['activo'] = (int) $r['activo'];
    $r['medico_id'] = $r['medico_id'] === null ? null : (int) $r['medico_id'];
    return $r;
}

/** "v-12.345.678" / "12345678" → "V-12345678"; null si no parece una cédula */
function cedula(string $s): ?string {
    $limpia = preg_replace('/[^VEJPG0-9]/', '', mb_strtoupper($s)) ?? '';
    return preg_match('/^([VEJPG]?)(\d{5,10})$/D', $limpia, $m) ? ($m[1] ?: 'V') . '-' . $m[2] : null;
}

/** 'AAAA-MM-DD' real o null (estricto: rechaza el 30 de febrero, que MariaDB no admite) */
function _fecha(string $s): ?string {
    return preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D', $s, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1]) ? $s : null;
}

/** Usuarios por rol y/o texto (nombre, correo o cédula), en orden alfabético. */
function usuarios(array $f = []): array {
    $rol = (string) ($f['rol'] ?? '');
    $like = _like(trim((string) ($f['q'] ?? '')));
    return array_map('_usuario', filas('SELECT ' . _CAMPOS_USUARIO . ' FROM usuarios WHERE (? = \'\' OR rol = ?)
        AND (? = \'%%\' OR nombre LIKE ? OR correo LIKE ? OR cedula LIKE ?) ORDER BY nombre, id', [$rol, $rol, $like, $like, $like, $like]));
}

function usuario(int $id): ?array {
    $r = fila('SELECT ' . _CAMPOS_USUARIO . ' FROM usuarios WHERE id = ?', [$id]);
    return $r ? _usuario($r) : null;
}

/** Para iniciar sesión con correo o cédula: ['id','rol','clave_hash','version','activo'] o null */
function porLogin(string $login): ?array {
    $r = fila('SELECT id, rol, clave_hash, version, activo FROM usuarios WHERE correo = ? OR cedula = ?', [trim($login), cedula($login) ?? '']);
    return $r ? ['id' => (int) $r['id'], 'rol' => $r['rol'], 'clave_hash' => $r['clave_hash'], 'version' => (int) $r['version'], 'activo' => (int) $r['activo']] : null;
}

/** Lo que se comprueba en cada petición privada: ['id','rol','nombre','version','activo'] o null */
function sesionUsuario(int $id): ?array {
    $r = fila('SELECT id, rol, nombre, version, activo FROM usuarios WHERE id = ?', [$id]);
    return $r ? ['id' => (int) $r['id'], 'rol' => $r['rol'], 'nombre' => $r['nombre'], 'version' => (int) $r['version'], 'activo' => (int) $r['activo']] : null;
}

/** Valida el formulario del admin ($_POST). En una edición la clave vacía significa "no cambiarla".
 *  Devuelve ['rol','nombre','correo','cedula','activo','medico_id','telefono','nacimiento','direccion','afiliacion_vence','clave'] o el mensaje de error. */
function validarUsuario(array $post, bool $nuevo): array|string {
    $g = fn(string $k): string => is_scalar($post[$k] ?? null) ? trim((string) $post[$k]) : '';
    $rol = $g('rol');
    if (!isset(ROLES[$rol])) return 'Elige un rol.';
    $nombre = mb_substr(preg_replace('/\s+/u', ' ', $g('nombre')) ?? '', 0, 120);
    if (mb_strlen($nombre) < 3) return 'Escribe el nombre completo.';
    $correo = mb_substr(mb_strtolower($g('correo')), 0, 120);
    if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/D', $correo)) return 'El correo no es válido.';
    $ced = $g('cedula') !== '' ? cedula($g('cedula')) : null;
    if ($g('cedula') !== '' && !$ced) return 'La cédula debe ser como V-12345678.';
    if ($rol === 'cliente' && !$ced) return 'La cédula es obligatoria para los clientes.';
    $telefono = mb_substr($g('telefono'), 0, 40);
    if ($telefono !== '' && !preg_match('/^[\d\s()+-]{7,}$/D', $telefono)) return 'El teléfono solo puede tener números, espacios, guiones y paréntesis.';
    $nacimiento = $g('nacimiento') !== '' ? _fecha($g('nacimiento')) : null;
    if ($g('nacimiento') !== '' && (!$nacimiento || $nacimiento > gmdate('Y-m-d'))) return 'La fecha de nacimiento no es válida.';
    $vence = $g('afiliacion_vence') !== '' ? _fecha($g('afiliacion_vence')) : null;
    if ($g('afiliacion_vence') !== '' && !$vence) return 'La fecha de vencimiento no es válida.';
    $medicoId = ctype_digit($g('medico_id')) && (int) $g('medico_id') > 0 ? (int) $g('medico_id') : null;
    $clave = $g('clave') !== '' ? $g('clave') : null;
    if ($nuevo && !$clave) return 'Asigna una contraseña.';
    if ($clave && mb_strlen($clave) < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    return [
        'rol' => $rol, 'nombre' => $nombre, 'correo' => $correo, 'cedula' => $ced, 'activo' => !isset($post['activo']) && !$nuevo ? 0 : 1,
        'telefono' => $telefono, 'nacimiento' => $nacimiento, 'direccion' => mb_substr($g('direccion'), 0, 200),
        'afiliacion_vence' => $rol === 'cliente' ? $vence : null, 'medico_id' => $rol === 'medico' ? $medicoId : null, 'clave' => $clave,
    ];
}

/** Las mismas reglas de cédula y teléfono como `pattern` de los formularios: el navegador marca el campo antes de enviar.
 *  Iguales a PATRON_CEDULA y PATRON_TELEFONO de usuarios.ts. */
const PATRON_CEDULA = '[VvEeJjPpGg]?[ .\-]*(?:[0-9][ .\-]*){5,10}';
const PATRON_TELEFONO = '[0-9 \(\)+\-]{7,}';

/** El campo que causó un error de validarUsuario() o guardarUsuario() (null si no es de un campo): el formulario vuelve con
 *  lo escrito y marca solo ese. Sale del texto del mensaje, como campoDelError() de usuarios.ts (la prueba lo cubre). */
function campoDelError(string $mensaje): ?string {
    $tabla = ['/\brol\b/u' => 'rol', '/nombre/u' => 'nombre', '/correo/u' => 'correo', '/cédula/u' => 'cedula', '/teléfono/u' => 'telefono',
        '/nacimiento/u' => 'nacimiento', '/vencimiento/u' => 'afiliacion_vence', '/contraseña/u' => 'clave'];
    foreach ($tabla as $re => $campo) if (preg_match($re, $mensaje)) return $campo;
    return null;
}

/** Alta exclusiva de secretaria: descarta los campos de privilegio y fuerza un cliente activo. */
function validarCliente(array $post): array|string {
    foreach (['rol', 'medico_id', 'activo'] as $k) unset($post[$k]);
    $post['rol'] = 'cliente';
    return validarUsuario($post, true);
}

function _otrosAdmins(int $id): int {
    return (int) valor("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id != ?", [$id]);
}

/** Crea o actualiza. Devuelve el id o un mensaje de error. */
function guardarUsuario(array $u, ?int $id = null): int|string {
    $dup = fila('SELECT correo, cedula FROM usuarios WHERE (correo = ? OR (? IS NOT NULL AND cedula = ?)) AND id != ?', [$u['correo'], $u['cedula'], $u['cedula'], $id ?? 0]);
    if ($dup) return mb_strtolower($dup['correo']) === mb_strtolower($u['correo']) ? 'Ya existe un usuario con ese correo.' : 'Ya existe un usuario con esa cédula.';
    $clave = $u['clave'] ?? null;
    try {
        if ($id) {
            $antes = usuario($id);
            if (!$antes) return 'El usuario no existe.';
            if ($antes['rol'] === 'admin' && ($u['rol'] !== 'admin' || !$u['activo']) && !_otrosAdmins($id)) return 'Debe quedar al menos un administrador activo.';
            enTransaccion(function () use ($u, $id, $antes, $clave): void {
                ejecutar('UPDATE usuarios SET rol = ?, nombre = ?, correo = ?, cedula = ?, activo = ?, medico_id = ?, telefono = ?,
                    nacimiento = ?, direccion = ?, afiliacion_vence = ?, version = version + ? WHERE id = ?',
                    [$u['rol'], $u['nombre'], $u['correo'], $u['cedula'], $u['activo'], $u['medico_id'], $u['telefono'], $u['nacimiento'], $u['direccion'], $u['afiliacion_vence'],
                        ($clave || $antes['activo'] !== (int) $u['activo']) ? 1 : 0, $id]);
                if ($clave) ejecutar('UPDATE usuarios SET clave_hash = ? WHERE id = ?', [hashClave($clave), $id]);
            });
            return $id;
        }
        if (!$clave) return 'Asigna una contraseña.';
        ejecutar('INSERT INTO usuarios (rol, nombre, correo, cedula, clave_hash, activo, medico_id, telefono, nacimiento, direccion, afiliacion_vence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$u['rol'], $u['nombre'], $u['correo'], $u['cedula'], hashClave($clave), $u['activo'], $u['medico_id'], $u['telefono'], $u['nacimiento'], $u['direccion'], $u['afiliacion_vence']]);
        return ultimoId();
    } catch (PDOException $e) {
        // carrera con otro alta (índice único) o médico inexistente (clave foránea)
        if (esDuplicado($e)) return 'Ya existe un usuario con ese correo o esa cédula.';
        if ((int) ($e->errorInfo[1] ?? 0) === 1452) return 'El médico elegido no existe.';
        throw $e;
    }
}

/** Nadie se borra a sí mismo ni deja la clínica sin administrador. */
function borrarUsuario(int $id, int $actorId): ?string {
    if ($id === $actorId) return 'No puedes borrar tu propio usuario.';
    $u = usuario($id);
    if ($u && $u['rol'] === 'admin' && !_otrosAdmins($id)) return 'Debe quedar al menos un administrador activo.';
    enTransaccion(function () use ($id): void {
        // la clave foránea consultas.medico_id no tiene ON DELETE SET NULL (columna generada): se hace a mano
        ejecutar('UPDATE consultas SET medico_id = NULL WHERE medico_id = ?', [$id]);
        ejecutar('DELETE FROM usuarios WHERE id = ?', [$id]);
    });
    return null;
}

/** Edad cumplida en años (para la cola del médico). Por defecto, con la fecha de hoy en Maracaibo. */
function edad(?string $nacimiento, ?DateTimeImmutable $hoy = null): ?int {
    if (!$nacimiento) return null;
    $hoy ??= (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify('-4 hours');
    [$a, $m, $d] = array_map('intval', explode('-', $nacimiento));
    $mes = (int) $hoy->format('n');
    return (int) $hoy->format('Y') - $a - ($mes < $m || ($mes === $m && (int) $hoy->format('j') < $d) ? 1 : 0);
}

/** Cifras del admin. «Ahora» usa las mismas ventanas que tele.php (5 min sin latido en la sala, 4 h en curso).
 *  Devuelve medicos, especialidades, sinMedicos, vigentes, enEspera, atendiendo, consultasHoy y porVencer (clientes que vencen en ≤ 30 días). */
function resumenAdmin(?DateTimeImmutable $ahora = null): array {
    $utc = new DateTimeZone('UTC');
    $hoy = ($ahora ?? new DateTimeImmutable('now', $utc))->setTimezone($utc)->modify('-4 hours')->format('Y-m-d');
    $en30 = (new DateTimeImmutable($hoy, $utc))->modify('+30 days')->format('Y-m-d');
    $inicio = (new DateTimeImmutable($hoy, $utc))->modify('+4 hours');   // medianoche de Maracaibo en UTC
    $n = fn(string $q, array $p = []): int => (int) valor($q, $p);
    return [
        'medicos' => $n('SELECT COUNT(*) FROM medicos'),
        'especialidades' => $n('SELECT COUNT(*) FROM especialidades'),
        'sinMedicos' => $n('SELECT COUNT(*) FROM especialidades e WHERE NOT EXISTS (SELECT 1 FROM medico_especialidad x WHERE x.especialidad_id = e.id)'),
        'vigentes' => $n("SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente' AND activo = 1 AND afiliacion_vence >= ?", [$hoy]),
        'enEspera' => $n("SELECT COUNT(*) FROM consultas WHERE estado = 'espera' AND visto >= UTC_TIMESTAMP() - INTERVAL 5 MINUTE"),
        'atendiendo' => $n("SELECT COUNT(*) FROM consultas WHERE estado = 'atendiendo' AND atendida >= UTC_TIMESTAMP() - INTERVAL 4 HOUR"),
        'consultasHoy' => $n('SELECT COUNT(*) FROM consultas WHERE creada >= ? AND creada < ?', [$inicio->format('Y-m-d H:i:s'), $inicio->modify('+1 day')->format('Y-m-d H:i:s')]),
        'porVencer' => array_map('_usuario', filas("SELECT " . _CAMPOS_USUARIO . " FROM usuarios WHERE rol = 'cliente' AND activo = 1 AND afiliacion_vence BETWEEN ? AND ? ORDER BY afiliacion_vence, nombre", [$hoy, $en30])),
    ];
}
