<?php
// Pruebas de app/lib/*.php contra una base limpia: puerto de tests/db.check.mjs, tests/sitio.check.mjs y tests/senal.check.mjs
// (el hash/sesión de TypeScript ya no existe: ahora es password_hash y la sesión de PHP).
//   PM_ID=mia node tools/php-env.mjs test libs.php
declare(strict_types=1);

require __DIR__ . '/../app/boot.php';

// cualquier aviso o error de PHP (índice sin definir, conversión rara…) rompe la prueba; las obsolescencias de archivos ajenos
// a app/lib (boot.php, auth.php…) solo se muestran, para no ocultar fallos propios
set_error_handler(function (int $n, string $msg, string $archivo, int $linea): bool {
    if (($n & (E_DEPRECATED | E_USER_DEPRECATED)) && !str_contains(str_replace('\\', '/', $archivo), '/app/lib/')) {
        fwrite(STDERR, "AVISO (no es de lib/): $msg en $archivo:$linea\n");
        return true;
    }
    throw new ErrorException($msg, 0, $n, $archivo, $linea);
});

function falla(string $msg, int $linea): never {
    fwrite(STDERR, "FALLO (línea $linea): $msg\n");
    exit(1);
}
function afirmar(bool $ok, string $msg = 'afirmación falsa'): void {
    if (!$ok) falla($msg, debug_backtrace(0, 1)[0]['line']);
}
/** Igualdad estricta (mismos tipos, mismo orden en los arrays). */
function igual(mixed $obtenido, mixed $esperado, string $msg = ''): void {
    if ($obtenido !== $esperado) {
        falla(($msg !== '' ? "$msg — " : '') . 'esperado ' . json_encode($esperado, JSON_UNESCAPED_UNICODE) . ' y llegó ' . json_encode($obtenido, JSON_UNESCAPED_UNICODE), debug_backtrace(0, 1)[0]['line']);
    }
}
function coincide(string $patron, mixed $texto, string $msg = ''): void {
    if (!is_string($texto) || !preg_match($patron, $texto)) {
        falla(($msg !== '' ? "$msg — " : '') . "«" . json_encode($texto, JSON_UNESCAPED_UNICODE) . "» no cumple $patron", debug_backtrace(0, 1)[0]['line']);
    }
}
function utc(string $s): DateTimeImmutable { return new DateTimeImmutable($s, new DateTimeZone('UTC')); }

igual(migrar(), ['001_schema.sql', '002_seed.sql', '003_pisos.sql'], 'la base limpia aplica las tres migraciones');
igual(migrar(), [], 'migrar de nuevo no repite nada');

// ════════════════════════ sitio.php ════════════════════════

// Teléfonos
igual(telHref('0414-1640799'), 'tel:+584141640799');
igual(telHref('(0261) 700-5100'), 'tel:+582617005100');
igual(telHref('04141640799'), 'tel:+584141640799');
igual(telHref('+58 412-4248304'), 'tel:+584124248304');
igual(telHref('+58 (0261) 700-5141'), 'tel:+582617005141', 'quita el 0 de troncal');
igual(telHref(''), '');
igual(telHref('   '), '');

// WhatsApp: igual que el enlace oficial de la clínica
igual(waHref(), 'https://api.whatsapp.com/send/?phone=584124248304&text=Solicitud+de+cita');
igual(waHref('Cita con Dra. Ana'), 'https://api.whatsapp.com/send/?phone=584124248304&text=Cita+con+Dra.+Ana');
coincide('/text=Informaci%C3%B3n\+%26\+m%C3%A1s$/', waHref('Información & más'));

// Iniciales
igual(iniciales('Dra. Rossy Vera'), 'RV');
igual(iniciales('Dra Neyla Carolina Soto León'), 'NS');
igual(iniciales('Dr. Roman de Vicente'), 'RV', 'ignora partículas');
igual(iniciales('Dra. Mariela Fox'), 'MF');
igual(iniciales('Dr. Juan José Delgado Dupont'), 'JD');
igual(iniciales('Dr. Ana'), 'A');
igual(iniciales('Dra.'), '');
igual(iniciales('dra. ñoño pérez'), 'ÑP');

// «Abierto ahora»: hora de Maracaibo = UTC−4
$horario = fn(array $o = []) => $o + ['id' => 'x', 'nombre' => 'X', 'desde' => 8, 'hasta' => 16];
$citas = $horario(['dias' => [1, 2, 3, 4, 5]]);
$lun = fn(int $h, int $m = 0) => utc('2026-10-19 00:00:00')->modify('+' . ($h + 4) . " hours +$m minutes");   // lunes 19-oct-2026, hora local h:m
igual(estaAbierto($citas, $lun(8)), true, 'abre a las 8:00');
igual(estaAbierto($citas, $lun(15, 59)), true);
igual(estaAbierto($citas, $lun(16)), false, '`hasta` es exclusivo');
igual(estaAbierto($citas, $lun(7, 59)), false);
igual(estaAbierto($citas, utc('2026-10-24 16:00:00')), false, 'sábado');
igual(estaAbierto($citas, utc('2026-10-20 02:00:00')), false, '02:00 UTC del martes = lunes 22:00 en Maracaibo');
igual(estaAbierto($horario(), $lun(10)), null, 'sin días no se calcula');
$emerg = $horario(['desde' => 0, 'hasta' => 24, 'dias' => [0, 1, 2, 3, 4, 5, 6], 'h24' => true]);
igual(estaAbierto($emerg, $lun(3)), true);
igual(estaAbierto($emerg, $lun(23, 59)), true);
igual(horaCaracas($lun(14, 30)), 14.5);
igual(horaCaracas(utc('2026-10-19 02:00:00')), 22.0, 'cruza la medianoche UTC');

// Fechas de la base (UTC sin zona) en hora de Maracaibo
igual(fechaCaracas('2026-10-19 19:20:00'), '19 de octubre de 2026');
igual(fechaCaracas('2026-10-19 19:20:00', 'hora'), '3:20 p. m.');
igual(fechaCaracas('2026-10-20 02:00:00'), '19 de octubre de 2026', 'madrugada UTC = noche anterior en Maracaibo');
afirmar(str_contains(strtolower(fechaCaracas('2026-10-19 19:20:00', 'mes')), 'oct'));
igual(fechaCaracas('2026-10-19 19:20:00', 'corta'), '19 oct., 3:20 p. m.');
igual(fechaCaracas('2026-10-19 04:05:00', 'hora'), '12:05 a. m.', 'medianoche local = 12, no 0');
igual(fechaCaracas('2026-10-19 16:00:00', 'hora'), '12:00 p. m.', 'mediodía local = 12 p. m.');
igual(fechaCaracas(utc('2026-01-05 12:00:00')), '5 de enero de 2026', 'acepta DateTimeImmutable');

// Duración y espera
igual(duracion('2026-10-19 19:00:00', '2026-10-19 19:18:20'), 18);
igual(duracion('2026-10-19 19:00:00', null), null);
$t = utc('2026-10-19 19:07:32');
igual(esperando('2026-10-19 19:00:00', $t), '07:32');
igual(esperando('2026-10-19 19:07:30', $t), '00:02');
igual(esperando('2026-10-19 18:02:00', $t), '1 h 05 min');
igual(esperando('2026-10-19 19:10:00', $t), '00:00', 'nunca negativo');

// Ubicación del consultorio (piso y puertas) desde el texto del WordPress
$U = function (string $s): array { $u = ubicacion($s); return [$u['piso'], implode(' ', $u['puertas']), $u['texto']]; };
igual($U('2do Piso C Nro 28'), ['2', '28', '2do piso, consultorio 28']);
igual($U('P.B Consultorio NRO 32'), ['pb', '32', 'Planta baja, consultorio 32']);
igual($U('PB C NRO 13-14-14B'), ['pb', '13 14 14B', 'Planta baja, consultorio 13, 14, 14B']);
igual($U('1er.Piso C. Nro. 16'), ['1', '16', '1er piso, consultorio 16']);
igual($U('1er Piso  C. Nro.19 A'), ['1', '19A', '1er piso, consultorio 19A']);
igual($U('3 piso C Nro 45B'), ['3', '45B', '3er piso, consultorio 45B']);
igual($U('Primer Piso C NRO 20'), ['1', '20', '1er piso, consultorio 20']);
igual($U('Sótano C Nro 36'), ['s', '36', 'Sótano, consultorio 36']);
igual($U('C Nro 5 P.B'), ['pb', '5', 'Planta baja, consultorio 5']);
igual($U('1er Piso Frente a Pabellón'), ['1', '', '1er piso, frente a Pabellón']);
igual($U('PB'), ['pb', '', 'Planta baja']);
igual($U('C Nro.1'), [null, '1', 'c Nro.1']);
igual(miniatura('/medicos/dr-x.jpg'), '/medicos/t/dr-x.webp');
igual(miniatura('/fotos/12?v=ab'), '/fotos/12?v=ab');
igual(array_map('strval', array_keys(PISOS)), ['3', '2', '1', 'pb', 's'], 'del techo al sótano');
igual(PISOS['pb'], 'Planta baja');

// ════════════════════════ medicos.php ════════════════════════

// Datos importados
$esps = especialidades();
$todos = medicos();
igual(count($esps), 50);
igual(count($todos), 125);
afirmar(!array_filter($todos, fn($m) => !$m['especialidades']), 'todo médico tiene especialidad');
afirmar(!array_filter($todos, fn($m) => !preg_match('/^(Dra?\. |[A-Z])/u', $m['nombre'])), 'nombres normalizados');
igual(count(array_filter($todos, fn($m) => $m['piso'] !== '')), 124, 'la migración identifica todos los pisos confirmados');
igual(array_values(array_filter($todos, fn($m) => $m['id'] === 14))[0]['piso'], '', 'el único consultorio histórico sin piso queda pendiente');
igual(count(array_filter($todos, fn($m) => ubicacion($m['consultorio'])['piso'] === null)), 1, 'todos los consultorios reales tienen piso salvo uno («C Nro.1»)');
igual(array_keys($todos[0]), ['id', 'nombre', 'telefono', 'consultorio', 'piso', 'consultorios', 'foto', 'especialidades']);
igual(array_keys($todos[0]['especialidades'][0]), ['id', 'slug', 'nombre']);
igual(is_int($esps[0]['id']) && is_int($esps[0]['total']), true);
foreach ($todos as $m) {
    $claves = array_map('clave', array_column($m['especialidades'], 'nombre'));
    $ord = $claves; sort($ord);
    igual($claves, $ord, 'especialidades de cada médico en orden alfabético');
}

// Cifras de la portada y vitrina de retratos
$res = resumen();
igual([$res['medicos'], $res['especialidades']], [125, 50]);
igual(count($res['top']), 8);
$tot = array_column($res['top'], 'total');
$desc = $tot; rsort($desc);
igual($tot, $desc, 'top ordenado de mayor a menor');
igual($res['top'][0], ['slug' => 'ginecologia-y-obstetricia', 'nombre' => 'Ginecología y obstetricia', 'total' => 17]);
afirmar($res['conMedicos'] < $res['especialidades'], 'hay especialidades sin médicos');
$conFoto = array_values(array_filter($todos, fn($m) => $m['foto'] !== ''));
igual(count($conFoto), 122, '3 médicos sin foto');
$r1 = retratosDelDia(12, utc('2026-10-19 16:00:00'));
$r2 = retratosDelDia(12, utc('2026-10-20 16:00:00'));
igual(count($r1), 12);
afirmar(!array_filter($r1, fn($m) => $m['foto'] === ''), 'solo médicos con foto');
igual($r1[0]['id'], $conFoto[(292 * 5) % 122]['id'], 'empieza en (día del año × 5) mod N');   // 19-oct = día 292
afirmar($r1[0]['id'] !== $r2[0]['id'], 'rota cada día');
igual($r2[0]['id'], $conFoto[(293 * 5) % 122]['id']);
igual(retratosDelDia(12, utc('2026-10-20 02:00:00')), $r1, 'a las 22:00 de Maracaibo sigue siendo el día 19');
igual(count(retratosDelDia(500)), 122, 'n mayor que N: sin repetir');
igual(retratosDelDia(12, utc('2026-12-31 16:00:00'))[0]['id'], $conFoto[(365 * 5) % 122]['id']);

// Búsqueda sin acentos, por especialidad y por slug
afirmar((bool) array_filter(medicos(['q' => 'pena']), fn($m) => str_contains($m['nombre'], 'Peña')));
afirmar(count(medicos(['q' => 'CARDIO'])) >= 9);
$cardio = medicos(['esp' => 'cardiologia']);
afirmar(count($cardio) >= 7 && !array_filter($cardio, fn($m) => !array_filter($m['especialidades'], fn($e) => $e['slug'] === 'cardiologia')));
igual(count(medicos(['q' => '%'])), 125, '% no es comodín');
igual(count(medicos(['q' => '_'])), 125, '_ no es comodín');
igual(count(medicos(['esp' => 'no-existe'])), 0);
igual(medicos(['q' => 'a\\']), [], 'la barra invertida es un carácter más, no escapa el comodín');
igual(medicos(['q' => 'zzzzzz']), []);
igual(medico(999999), null);
igual(medico($todos[5]['id']), $todos[5]);

// Validación del formulario
igual(is_string(validarMedico(['nombre' => 'Dr', 'especialidades' => '1'])), true);
igual(is_string(validarMedico(['nombre' => 'Ana Pérez'])), true);
igual(is_string(validarMedico(['nombre' => 'Ana Pérez', 'especialidades' => '1', 'telefono' => '<script>'])), true);
igual(validarMedico(['nombre' => 'Dr', 'piso' => '2', 'especialidades' => '1']), 'Escribe el nombre del médico.');
igual(validarMedico(['nombre' => 'Ana Pérez', 'piso' => '2', 'consultorios' => '28', 'especialidades' => '1', 'telefono' => '<script>']), 'El teléfono solo puede tener números, espacios, guiones y paréntesis.');
igual(validarMedico(['nombre' => 'Ana Pérez', 'piso' => '2', 'consultorios' => '28']), 'Elige al menos una especialidad.');
coincide('/piso/', validarMedico(['nombre' => 'Ana Pérez', 'piso' => '4', 'consultorios' => '28', 'especialidades' => '1']));
coincide('/piso/', validarMedico(['nombre' => 'Ana Pérez', 'piso' => 'constructor', 'consultorios' => '28', 'especialidades' => '1']), 'un piso manipulado no se acepta');
coincide('/consultorios/', validarMedico(['nombre' => 'Ana Pérez', 'piso' => '2', 'consultorios' => '28Z', 'especialidades' => '1']));
$ok = validarMedico(['nombre' => 'dra,  ana pérez', 'telefono' => '0414-1234567', 'piso' => '2', 'consultorios' => '28 a, 29, 28A', 'especialidades' => ['3', '3', '5', 'x']]);
igual($ok, ['nombre' => 'Dra. ana pérez', 'telefono' => '0414-1234567', 'consultorio' => '2do piso, consultorio 28A, 29', 'piso' => '2', 'consultorios' => '28A, 29', 'especialidades' => [3, 5]]);
$conReferencia = validarMedico(['nombre' => 'Dra. Ana Pérez', 'piso' => '1', 'consultorios' => '', 'consultorio_original' => '1er Piso Frente a Pabellón', 'especialidades' => '1']);
igual($conReferencia['consultorio'], '1er Piso Frente a Pabellón', 'preserva referencias históricas sin número');
igual(validarMedico(['nombre' => 'Dra. Ana Pérez', 'piso' => 'PB', 'consultorios' => '13-14-14B', 'especialidades' => ['1']])['consultorios'], '13, 14, 14B');
igual(tituloMedico('Dra Ana'), 'Dra. Ana');
igual(tituloMedico('  Dr.Ana   López '), 'Dr. Ana López');

// Crear, editar, foto, borrar
$id = guardarMedico($ok);
$creado = medico($id);
igual([$creado['piso'], $creado['consultorios'], $creado['consultorio']], ['2', '28A, 29', '2do piso, consultorio 28A, 29']);
$idsEsp = array_column($creado['especialidades'], 'id'); sort($idsEsp);
igual($idsEsp, [3, 5]);
guardarMedico(['nombre' => 'Dra. Ana Pérez', 'especialidades' => [7]] + $ok, $id);
$editado = medico($id);
igual($editado['nombre'], 'Dra. Ana Pérez');
igual(array_column($editado['especialidades'], 'id'), [7]);
igual(count(medicos()), 126);
$tmp = tempnam(sys_get_temp_dir(), 'foto');
file_put_contents($tmp, '<svg/>');
coincide('/WebP/', guardarFoto($id, ['name' => 'x.svg', 'type' => 'image/svg+xml', 'tmp_name' => $tmp, 'error' => UPLOAD_ERR_OK, 'size' => 6]));
$binario = "\x01\x02\x03\xff\x00\xfe\xc3\x28";   // incluye bytes que no son UTF-8 válido
file_put_contents($tmp, $binario);
igual(guardarFoto($id, ['name' => 'x.webp', 'type' => 'image/webp', 'tmp_name' => $tmp, 'error' => UPLOAD_ERR_OK, 'size' => 8]), null);
igual(foto($id), ['tipo' => 'image/webp', 'datos' => $binario], 'la foto binaria vuelve idéntica');
coincide('~^/fotos/' . $id . '\?v=~', medico($id)['foto']);
file_put_contents($tmp, "\x89PNG");
igual(guardarFoto($id, ['name' => 'x.png', 'type' => 'image/png', 'tmp_name' => $tmp, 'error' => UPLOAD_ERR_OK, 'size' => 4]), null);
igual(foto($id), ['tipo' => 'image/png', 'datos' => "\x89PNG"], 'subir otra foto reemplaza la anterior');
file_put_contents($tmp, str_repeat('a', 1_000_001));
coincide('/1 MB/', guardarFoto($id, ['name' => 'x.jpg', 'type' => 'image/jpeg', 'tmp_name' => $tmp, 'error' => UPLOAD_ERR_OK, 'size' => 1_000_001]));
coincide('/1 MB/', guardarFoto($id, ['name' => 'x.jpg', 'type' => '', 'tmp_name' => '', 'error' => UPLOAD_ERR_INI_SIZE, 'size' => 0]));
quitarFoto($id);
igual([foto($id), medico($id)['foto']], [null, '']);
file_put_contents($tmp, "\x01\x02\x03");
guardarFoto($id, ['name' => 'x.webp', 'type' => 'image/webp', 'tmp_name' => $tmp, 'error' => UPLOAD_ERR_OK, 'size' => 3]);
unlink($tmp);
$uMed = guardarUsuario(validarUsuario(['rol' => 'medico', 'nombre' => 'Dra. Ana Pérez', 'correo' => 'ana.perez@clinica.test', 'medico_id' => (string) $id, 'clave' => 'clave-segura-1'], true));
igual(is_int($uMed), true);
borrarMedico($id);
igual(medico($id), null);
igual(foto($id), null, 'la foto se borra en cascada');
igual(usuario($uMed)['medico_id'], null, 'el usuario médico queda sin ficha (ON DELETE SET NULL)');
igual(borrarUsuario($uMed, 0), null);
igual(count(medicos()), 125);

// Especialidades
igual(crearEspecialidad('Geriatría'), null);
coincide('/existe/', crearEspecialidad('geriatría'));
coincide('/Escribe/', crearEspecialidad('  '));
$buscar = fn(string $slug) => array_values(array_filter(especialidades(), fn($e) => $e['slug'] === $slug))[0];
$geri = $buscar('geriatria');
igual($geri['total'], 0);
coincide('/no existe/', editarEspecialidad(0, 'Medicina geriátrica'));
coincide('/Escribe/', editarEspecialidad($geri['id'], '  '));
igual(editarEspecialidad($geri['id'], 'Medicina geriátrica'), null);
$geriEditada = $buscar('geriatria');
igual([$geriEditada['slug'], $geriEditada['nombre']], ['geriatria', 'Medicina geriátrica'], 'editar conserva el slug público');
$cardiologia = array_values(array_filter($cardio[0]['especialidades'], fn($e) => $e['slug'] === 'cardiologia'))[0];
$totalCardiologia = $buscar('cardiologia')['total'];
igual(editarEspecialidad($cardiologia['id'], 'Cardiología clínica'), null);
$cardioEditada = $buscar('cardiologia');
igual([$cardioEditada['slug'], $cardioEditada['nombre'], $cardioEditada['total']], ['cardiologia', 'Cardiología clínica', $totalCardiologia]);
afirmar(!array_filter(medicos(['esp' => 'cardiologia']), fn($m) => !array_filter($m['especialidades'], fn($e) => $e['id'] === $cardiologia['id'] && $e['nombre'] === 'Cardiología clínica')), 'renombrar conserva las asignaciones');
coincide('/existe/', editarEspecialidad($geri['id'], 'Cardiología clínica'));
coincide('/existe/', editarEspecialidad($geri['id'], 'Cardiología clínica!'), 'el renombre no permite duplicar un slug por puntuación');
coincide('/quita/', borrarEspecialidad($cardiologia['id']));
igual(borrarEspecialidad($geri['id']), null);
igual(array_filter(especialidades(), fn($e) => $e['slug'] === 'geriatria'), []);

// Contraseñas (password_hash de PHP en lugar del PBKDF2 de TypeScript) y panel de inicio
$h = hashClave('clave-segura-1');
igual(verificarClave('clave-segura-1', $h), true);
igual(verificarClave('otra', $h), false);
igual(verificarClave('x', null), false, 'usuario inexistente');
igual(inicioDe('medico'), '/medico/');
igual(inicioDe('secretaria'), '/secretaria/');

// ════════════════════════ usuarios.php ════════════════════════

igual(cedula('v-12.345.678'), 'V-12345678');
igual(cedula('12345678'), 'V-12345678');
igual(cedula('J-123456789'), 'J-123456789');
igual(cedula('V-1'), null);
igual(cedula('hola'), null);

$nuevoUsuario = fn(array $o) => validarUsuario($o + ['clave' => 'clave-segura-1'], true);
coincide('/rol/', $nuevoUsuario(['rol' => 'root', 'nombre' => 'Ana', 'correo' => 'a@b.co']));
coincide('/rol/', $nuevoUsuario(['rol' => 'constructor', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co']));
coincide('/cédula/', $nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co']));
coincide('/cédula/', $nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co', 'cedula' => 'V-1']));
coincide('/8 caracteres/', $nuevoUsuario(['rol' => 'admin', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co', 'clave' => 'corta']));
igual(validarUsuario(['rol' => 'admin', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co'], true), 'Asigna una contraseña.');
igual($nuevoUsuario(['rol' => 'admin', 'nombre' => 'An', 'correo' => 'a@b.co']), 'Escribe el nombre completo.');
igual($nuevoUsuario(['rol' => 'admin', 'nombre' => 'Ana Pérez', 'correo' => 'a@b']), 'El correo no es válido.');
coincide('/fecha de nacimiento/', $nuevoUsuario(['rol' => 'admin', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co', 'nacimiento' => '2999-01-01']));
coincide('/fecha de nacimiento/', $nuevoUsuario(['rol' => 'admin', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co', 'nacimiento' => '2026-02-30']));
// cada error señala su campo, para que el formulario vuelva con lo escrito y marque solo ese (igual que en tests/db.check.mjs)
$campoDe = fn(array $o) => campoDelError($nuevoUsuario($o + ['rol' => 'cliente', 'nombre' => 'Ana Pérez', 'correo' => 'ana@correo.test', 'cedula' => 'V-11111111']));
igual(
    [$campoDe(['rol' => 'root']), $campoDe(['nombre' => 'A']), $campoDe(['correo' => 'ana@']), $campoDe(['cedula' => 'abc']), $campoDe(['cedula' => '']), $campoDe(['telefono' => 'llámame']),
        $campoDe(['nacimiento' => '2999-01-01']), $campoDe(['afiliacion_vence' => 'mañana']), $campoDe(['clave' => 'corta'])],
    ['rol', 'nombre', 'correo', 'cedula', 'cedula', 'telefono', 'nacimiento', 'afiliacion_vence', 'clave'], 'campoDelError');
igual(campoDelError('Debe quedar al menos un administrador activo.'), null);
igual([PATRON_CEDULA, PATRON_TELEFONO], ['[VvEeJjPpGg]?[ .\-]*(?:[0-9][ .\-]*){5,10}', '[0-9 \(\)+\-]{7,}'], 'los pattern son los de usuarios.ts');
coincide('/fecha de vencimiento/', $nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co', 'cedula' => '1234567', 'afiliacion_vence' => 'mañana']));
coincide('/teléfono/', $nuevoUsuario(['rol' => 'admin', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co', 'telefono' => 'abc']));
$edicion = validarUsuario(['rol' => 'admin', 'nombre' => 'Ana Pérez', 'correo' => 'A@B.co'], false);
igual([$edicion['correo'], $edicion['clave'], $edicion['activo']], ['a@b.co', null, 0], 'editar: sin casilla «activo» desactiva; clave vacía = no cambiarla');
igual(validarUsuario(['rol' => 'admin', 'nombre' => 'Ana Pérez', 'correo' => 'a@b.co', 'activo' => '1'], false)['activo'], 1);

$admin = guardarUsuario($nuevoUsuario(['rol' => 'admin', 'nombre' => 'Admin Clínica', 'correo' => 'Admin@Clinica.test']));
$datosSecretaria = $nuevoUsuario(['rol' => 'secretaria', 'nombre' => 'Sara Secretaria', 'correo' => 'secretaria@clinica.test']);
igual($datosSecretaria['rol'], 'secretaria');
$secretaria = guardarUsuario($datosSecretaria);
igual(porLogin('secretaria@clinica.test')['rol'], 'secretaria', 'la secretaria puede iniciar sesión');
$altaPorSecretaria = validarCliente(['rol' => 'admin', 'medico_id' => '1', 'activo' => '0', 'nombre' => 'Carla Cliente', 'correo' => 'carla@correo.test', 'cedula' => 'V-24681357', 'afiliacion_vence' => '2020-01-01', 'clave' => 'clave-segura-1']);
igual([$altaPorSecretaria['rol'], $altaPorSecretaria['medico_id'], $altaPorSecretaria['activo']], ['cliente', null, 1], 'la alta de secretaria descarta campos de privilegio');
$clienteInscrito = guardarUsuario($altaPorSecretaria);
igual(is_int($clienteInscrito), true);
igual(usuario($clienteInscrito)['rol'], 'cliente');
$doc = guardarUsuario($nuevoUsuario(['rol' => 'medico', 'nombre' => 'Dra. Ana Médica', 'correo' => 'medica@clinica.test', 'medico_id' => '1']));
$cli = guardarUsuario($nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Pedro Paciente', 'correo' => 'pedro@correo.test', 'cedula' => 'v 12.345.678', 'nacimiento' => '1950-03-01', 'afiliacion_vence' => '2099-12-31']));
$cli2 = guardarUsuario($nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Rosa Paciente', 'correo' => 'rosa@correo.test', 'cedula' => '87654321', 'afiliacion_vence' => '2020-01-01']));
afirmar(count(array_filter([$admin, $doc, $cli, $cli2], 'is_int')) === 4);
coincide('/correo/', guardarUsuario($nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Otro', 'correo' => 'pedro@correo.test', 'cedula' => '999999'])));
coincide('/correo/', guardarUsuario($nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Otro', 'correo' => 'PEDRO@correo.test', 'cedula' => '999999'])), 'el correo no distingue mayúsculas');
coincide('/cédula/', guardarUsuario($nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Otro', 'correo' => 'x@correo.test', 'cedula' => 'V12345678'])));
coincide('/médico/', guardarUsuario($nuevoUsuario(['rol' => 'medico', 'nombre' => 'Dr. Fantasma', 'correo' => 'fantasma@clinica.test', 'medico_id' => '999999'])), 'ficha de médico inexistente: error, no excepción');
igual(porLogin('v-12345678')['id'], $cli, 'entra con cédula en cualquier formato');
igual(porLogin('admin@clinica.test')['id'], $admin, 'correo sin distinguir mayúsculas');
igual(porLogin('nadie@clinica.test'), null);
igual(array_keys(porLogin('admin@clinica.test')), ['id', 'rol', 'clave_hash', 'version', 'activo']);
igual(usuario($cli)['cedula'], 'V-12345678');
igual(usuario($doc)['medico_id'], 1);
igual(array_keys(usuario($cli)), ['id', 'rol', 'nombre', 'correo', 'cedula', 'activo', 'medico_id', 'telefono', 'nacimiento', 'direccion', 'afiliacion_vence', 'creado']);
igual(usuario($cli)['nacimiento'], '1950-03-01');
igual(usuario(999999), null);
igual(array_column(usuarios(['rol' => 'secretaria']), 'id'), [$secretaria]);
igual(array_column(usuarios(['q' => 'pedro']), 'id'), [$cli]);
igual(array_column(usuarios(['q' => '12345678']), 'id'), [$cli], 'busca por cédula');
igual(array_column(usuarios(['q' => 'pacientE', 'rol' => 'cliente']), 'nombre'), ['Pedro Paciente', 'Rosa Paciente'], 'orden alfabético');
igual(count(usuarios(['q' => '%'])), count(usuarios()), '% no es comodín');
coincide('/propio/', borrarUsuario($admin, $admin));
coincide('/administrador/', guardarUsuario(validarUsuario(['rol' => 'cliente', 'nombre' => 'Admin Clínica', 'correo' => 'admin@clinica.test', 'cedula' => '5555555'], false), $admin));
coincide('/administrador/', borrarUsuario($admin, $doc), 'tampoco se borra al último administrador');
igual(guardarUsuario(validarUsuario(['rol' => 'cliente', 'nombre' => 'X Y Z', 'correo' => 'x@y.co', 'cedula' => '1234567'], false), 999999), 'El usuario no existe.');
$v1 = sesionUsuario($cli)['version'];
guardarUsuario(validarUsuario(['rol' => 'cliente', 'nombre' => 'Pedro Paciente', 'correo' => 'pedro@correo.test', 'cedula' => 'V-12345678', 'activo' => '1', 'nacimiento' => '1950-03-01', 'afiliacion_vence' => '2099-12-31', 'clave' => 'nueva-clave-99'], false), $cli);
igual(sesionUsuario($cli)['version'], $v1 + 1, 'cambiar la clave cierra sus sesiones');
igual(verificarClave('nueva-clave-99', porLogin('pedro@correo.test')['clave_hash']), true);
igual(verificarClave('clave-segura-1', porLogin('pedro@correo.test')['clave_hash']), false);
guardarUsuario(validarUsuario(['rol' => 'cliente', 'nombre' => 'Pedro Paciente', 'correo' => 'pedro@correo.test', 'cedula' => 'V-12345678', 'activo' => '1', 'nacimiento' => '1950-03-01', 'afiliacion_vence' => '2099-12-31'], false), $cli);
igual(sesionUsuario($cli)['version'], $v1 + 1, 'guardar sin cambiar clave ni estado no cierra sesiones');
guardarUsuario(validarUsuario(['rol' => 'cliente', 'nombre' => 'Pedro Paciente', 'correo' => 'pedro@correo.test', 'cedula' => 'V-12345678', 'nacimiento' => '1950-03-01', 'afiliacion_vence' => '2099-12-31'], false), $cli);
igual([sesionUsuario($cli)['version'], sesionUsuario($cli)['activo']], [$v1 + 2, 0], 'desactivar cierra sus sesiones');
guardarUsuario(validarUsuario(['rol' => 'cliente', 'nombre' => 'Pedro Paciente', 'correo' => 'pedro@correo.test', 'cedula' => 'V-12345678', 'activo' => '1', 'nacimiento' => '1950-03-01', 'afiliacion_vence' => '2099-12-31'], false), $cli);
igual(edad('1950-03-01', utc('2026-02-28')), 75);
igual(edad('1950-03-01', utc('2026-03-01')), 76);
igual(edad(null), null);

// Resumen del admin: derivado de la base, con ventanas «ahora» como las de tele.php
$ra = resumenAdmin();
igual([$ra['medicos'], $ra['especialidades']], [count(medicos()), count(especialidades())]);
afirmar($ra['sinMedicos'] >= 8, 'hay especialidades sin médicos');
igual($ra['vigentes'], 1, 'solo Pedro tiene la afiliación vigente (Rosa venció en 2020)');
igual($ra['porVencer'], []);
$hoyC = utc('now')->modify('-4 hours')->format('Y-m-d');
$en = fn(int $d) => utc($hoyC)->modify("+$d days")->format('Y-m-d');
$pronto = guardarUsuario($nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Lucía Pronto', 'correo' => 'lucia@correo.test', 'cedula' => '11223344', 'afiliacion_vence' => $en(10)]));
$lejos = guardarUsuario($nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Mario Lejos', 'correo' => 'mario@correo.test', 'cedula' => '44332211', 'afiliacion_vence' => $en(31)]));
$hoyMismo = guardarUsuario($nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Hugo Hoy', 'correo' => 'hugo@correo.test', 'cedula' => '55667788', 'afiliacion_vence' => $hoyC]));
$ra2 = resumenAdmin();
igual(array_column($ra2['porVencer'], 'id'), [$hoyMismo, $pronto], 'vence hoy o en ≤ 30 días, por fecha');
igual($ra2['vigentes'], $ra['vigentes'] + 3, 'vigente = vence hoy o después');
igual(array_column(resumenAdmin(utc('now')->modify('+21 days'))['porVencer'], 'id'), [$lejos], 'la ventana se mueve con la fecha');
igual($ra['enEspera'] + $ra['atendiendo'] + $ra['consultasHoy'], 0);
foreach ([$lejos, $hoyMismo, $pronto] as $borrar) igual(borrarUsuario($borrar, $admin), null);

// ════════════════════════ tele.php ════════════════════════

coincide('/venció el 01\/01\/2020/', entrar($cli2, ''));
coincide('/habilitado/', entrar($doc, ''));
coincide('/habilitado/', entrar(999999, ''));
igual(entrar($cli, 'Dolor de cabeza'), null);
igual(entrar($cli, 'otra vez'), null, 'reentrar no duplica');
igual((int) valor('SELECT COUNT(*) FROM consultas WHERE cliente_id = ?', [$cli]), 1);
$enEspera = estado($cli);
igual(array_keys($enEspera), ['id', 'estado', 'sala', 'creada', 'atendida', 'medico', 'posicion']);
igual($enEspera['estado'], 'espera');
igual($enEspera['posicion'], 1);
igual(estado($cli2), null);
$colaDoc = cola($doc);
igual(count($colaDoc['espera']), 1);
igual([$colaDoc['espera'][0]['paciente'], $colaDoc['espera'][0]['edad'], $colaDoc['espera'][0]['motivo']], ['Pedro Paciente', edad('1950-03-01'), 'Dolor de cabeza']);
igual(array_keys($colaDoc['espera'][0]), ['id', 'motivo', 'creada', 'paciente', 'edad']);
$sala = salaVideo();
coincide('/^pm-[a-z0-9]{24}$/', $sala, 'la sala automática no contiene datos personales ni una URL');
igual(atender($enEspera['id'], $doc, $sala), true);
igual(atender($enEspera['id'], $admin, $sala), false, 'dos médicos no toman al mismo paciente');
$atendido = estado($cli);
igual([$atendido['estado'], $atendido['sala'], $atendido['medico']], ['atendiendo', $sala, 'Dra. Ana Médica']);
afirmar(!array_key_exists('enlace', $atendido), 'la API no expone enlaces de videollamada');
igual(cola($doc)['enCurso'][0]['sala'], $sala);
igual(array_keys(cola($doc)['enCurso'][0]), ['id', 'motivo', 'creada', 'paciente', 'edad', 'sala']);
igual(cola($admin)['enCurso'], [], 'la videollamada en curso es solo del médico que la tomó');
// Sala de la videollamada: solo la ven el médico y el paciente de la consulta en curso
igual([salaDe($sala, $cli), salaDe($sala, $doc), salaDe($sala, $admin), salaDe($sala, $cli2)], ['cliente', 'medico', null, null]);
igual(salaDe('pm-no-es-valida', $cli), null);
igual(salaDe('pm-zzzzzzzzzzzzzzzzzzzzzzzz', $cli), null);
// Una consulta nueva del mismo paciente: el índice único impide dos activas, la API lo traduce a «no duplica»
ejecutar("INSERT INTO consultas (cliente_id, motivo) VALUES (?, 'Consulta simultánea de prueba')", [$cli2]);
$simultanea = array_values(array_filter(cola($doc)['espera'], fn($c) => $c['paciente'] === 'Rosa Paciente'))[0];
igual(atender($simultanea['id'], $doc, salaVideo()), false, 'un médico no puede abrir dos videollamadas a la vez');
try {
    ejecutar("UPDATE consultas SET estado = 'atendiendo', medico_id = ? WHERE id = ?", [$doc, $simultanea['id']]);
    falla('el índice único debía impedir un segundo «atendiendo» del mismo médico', __LINE__);
} catch (PDOException $e) {
    igual(esDuplicado($e), true, 'consultas_un_medico_atendiendo');
}
try {
    ejecutar("INSERT INTO consultas (cliente_id, motivo) VALUES (?, 'doble')", [$cli2]);
    falla('el índice único debía impedir una segunda consulta activa del mismo cliente', __LINE__);
} catch (PDOException $e) {
    igual(esDuplicado($e), true, 'consultas_una_activa');
}
ejecutar("UPDATE consultas SET estado = 'cancelada', finalizada = UTC_TIMESTAMP() WHERE cliente_id = ? AND estado = 'espera'", [$cli2]);
coincide('/diagnóstico/', finalizar($enEspera['id'], $doc, '  '), 'no se finaliza sin diagnóstico');
igual(estado($cli)['estado'], 'atendiendo', 'un diagnóstico vacío no cierra la consulta');
coincide('/No está atendiendo esta consulta/', finalizar($enEspera['id'], $admin, 'Diagnóstico ajeno'), 'solo el médico asignado puede finalizar');
igual(finalizar($enEspera['id'], $doc, "Migraña\r\nsin aura."), null);
igual(estado($cli), null);
igual(salaDe($sala, $cli), null, 'terminada la consulta, la sala ya no sirve');
coincide('/No está atendiendo/', finalizar($enEspera['id'], $doc, 'Otra vez'), 'no se finaliza dos veces');
$pasada = historial(['clienteId' => $cli])[0];
igual([$pasada['estado'], $pasada['medico'], $pasada['paciente'], $pasada['diagnostico']], ['finalizada', 'Dra. Ana Médica', 'Pedro Paciente', "Migraña\nsin aura."]);
igual(array_keys($pasada), ['id', 'estado', 'motivo', 'diagnostico', 'creada', 'atendida', 'finalizada', 'paciente', 'medico']);
igual(historial(['medicoId' => $doc])[0]['diagnostico'], "Migraña\nsin aura.");
igual(array_values(array_filter(historial(), fn($c) => $c['id'] === $enEspera['id']))[0]['diagnostico'], "Migraña\nsin aura.", 'el administrador ve el diagnóstico');
igual(array_column(historial(['clienteId' => $cli2]), 'estado'), ['cancelada']);
// Una llamada abandonada no puede terminar como consulta finalizada sin diagnóstico.
igual(entrar($cli, 'Seguimiento'), null);
$abandonada = estado($cli);
igual(atender($abandonada['id'], $doc, salaVideo()), true);
ejecutar('UPDATE consultas SET atendida = UTC_TIMESTAMP() - INTERVAL 5 HOUR WHERE id = ?', [$abandonada['id']]);
igual(estado($cli), null, 'el sondeo del cliente cierra una llamada abandonada');
$cierreAutomatico = historial(['clienteId' => $cli])[0];
igual([$cierreAutomatico['estado'], $cierreAutomatico['diagnostico']], ['cancelada', ''], 'el cierre automático no inventa un diagnóstico');
// quien cierra la página sale de la cola a los 5 minutos
entrar($cli, '');
ejecutar("UPDATE consultas SET visto = UTC_TIMESTAMP() - INTERVAL 6 MINUTE WHERE estado = 'espera'");
igual(count(cola($doc)['espera']), 0);
igual(historial(['clienteId' => $cli])[0]['estado'], 'cancelada');
// cancelar
entrar($cli, '');
cancelar($cli);
igual([estado($cli), historial(['clienteId' => $cli])[0]['estado']], [null, 'cancelada']);
// latido: estado() renueva `visto` y mantiene a quien sigue en la página
entrar($cli, '');
ejecutar('UPDATE consultas SET visto = UTC_TIMESTAMP() - INTERVAL 4 MINUTE WHERE cliente_id = ? AND estado = \'espera\'', [$cli]);
igual(estado($cli)['estado'], 'espera');
ejecutar('UPDATE consultas SET visto = UTC_TIMESTAMP() - INTERVAL 4 MINUTE WHERE cliente_id = ? AND estado = \'espera\'', [$cli]);
estado($cli);
igual(count(cola($doc)['espera']), 1, 'el latido renueva la espera');
// orden de la cola y posición
$cli3 = guardarUsuario($nuevoUsuario(['rol' => 'cliente', 'nombre' => 'Tomás Tercero', 'correo' => 'tomas@correo.test', 'cedula' => '13572468', 'afiliacion_vence' => '2099-12-31']));
entrar($cli3, 'Segundo');
igual([estado($cli)['posicion'], estado($cli3)['posicion']], [1, 2]);
igual(array_column(cola($doc)['espera'], 'paciente'), ['Pedro Paciente', 'Tomás Tercero']);
igual(aFecha('2026-10-19 19:20:00')->format('Y-m-d\TH:i:sP'), '2026-10-19T19:20:00+00:00');
// el médico borrado deja sus consultas sin médico (MariaDB no permite ON DELETE SET NULL con la columna generada)
$enBorrado = estado($cli);
igual(atender($enBorrado['id'], $doc, salaVideo()), true);
igual(finalizar($enBorrado['id'], $doc, 'Control normal'), null);
cancelar($cli3);
igual(borrarUsuario($doc, $admin), null);
igual(usuario($doc), null);
$huerfana = array_values(array_filter(historial(), fn($c) => $c['id'] === $enBorrado['id']))[0];
igual([$huerfana['estado'], $huerfana['medico'], $huerfana['diagnostico']], ['finalizada', null, 'Control normal'], 'la consulta sobrevive sin médico');
igual(borrarUsuario($cli3, $admin), null);
igual((int) valor('SELECT COUNT(*) FROM consultas WHERE cliente_id = ?', [$cli3]), 0, 'borrar a un cliente borra sus consultas (cascada)');
igual(usuarios(['rol' => 'medico']), []);
cancelar($cli);

// ════════════════════════ senal.php ════════════════════════

$sala = 'pm-abcdefghijklmnopqrstuvwx';
$tipos = fn(array $ms) => array_column($ms, 'tipo');
// el médico llega primero y espera; el paciente llega y los dos reciben «presente»
igual(senalSondear($sala, 'medico', 'm1', 0), [], 'el médico llega solo: nada que recibir');
$delPaciente = senalSondear($sala, 'cliente', 'c1', 0);
$delMedico = senalSondear($sala, 'medico', 'm1', 0);
igual($tipos($delPaciente), ['presente']);
igual($tipos($delMedico), ['presente']);
igual($delMedico[0]['datos'], null);
igual(is_int($delMedico[0]['id']) && is_int($delPaciente[0]['id']), true);
$ultMedico = $delMedico[0]['id'];
$ultPaciente = $delPaciente[0]['id'];
igual(senalSondear($sala, 'cliente', 'c1', $ultPaciente), [], 'sin mensajes nuevos, el sondeo vuelve vacío');
igual(senalSondear($sala, 'medico', 'm1', $ultMedico), []);
// un mensaje del médico le llega al paciente
igual(senalEnviar($sala, 'medico', 'oferta', ['sdp' => 'x', 'type' => 'offer']), true);
$m = senalSondear($sala, 'cliente', 'c1', $ultPaciente);
igual(count($m), 1);
igual([$m[0]['tipo'], $m[0]['datos']], ['oferta', ['sdp' => 'x', 'type' => 'offer']]);
igual(senalSondear($sala, 'medico', 'm1', $ultMedico), [], 'el mensaje es para el otro lado');
igual(senalSondear($sala, 'cliente', 'c1', $m[0]['id']), [], 'con el último id visto ya no se repite');
// y la respuesta vuelve (con acentos y null en los datos)
igual(senalEnviar($sala, 'cliente', 'respuesta', ['sdp' => 'ñandú ✓']), true);
igual(senalEnviar($sala, 'cliente', 'ice', null), true);
$vuelta = senalSondear($sala, 'medico', 'm1', $ultMedico);
igual($tipos($vuelta), ['respuesta', 'ice']);
igual([$vuelta[0]['datos'], $vuelta[1]['datos']], [['sdp' => 'ñandú ✓'], null]);
$ultMedico = $vuelta[1]['id'];
// el paciente recarga la página (sesión nueva): los dos vuelven a empezar
igual(senalEnviar($sala, 'medico', 'ice', ['candidate' => 'viejo']), true);
$recarga = senalSondear($sala, 'cliente', 'c2', 0);
igual($tipos($recarga), ['presente'], 'al reiniciar se descartan sus mensajes pendientes');
$aviso = senalSondear($sala, 'medico', 'm1', $ultMedico);
igual($tipos($aviso), ['presente']);
$ultMedico = $aviso[0]['id'];
$ultPaciente = $recarga[0]['id'];
// mismo texto de sesión: no reinicia
igual(senalSondear($sala, 'cliente', 'c2', $ultPaciente), []);
igual(senalSondear($sala, 'medico', 'm1', $ultMedico), []);
// otra sala no se mezcla, y a un lado desconectado no se le entrega nada
igual(senalEnviar('pm-zzzzzzzzzzzzzzzzzzzzzzzz', 'medico', 'ice', null), false);
igual(senalEnviar($sala, 'otro', 'ice', null), false, 'rol desconocido');
igual(senalSondear($sala, 'otro', 'x', 0), []);
ejecutar("UPDATE senales_lado SET visto = UTC_TIMESTAMP() - INTERVAL 76 SECOND WHERE sala = ? AND rol = 'cliente'", [$sala]);
igual(senalEnviar($sala, 'medico', 'ice', null), false, 'el paciente lleva más de 75 s sin sondear');
igual(senalEnviar($sala, 'cliente', 'ice', null), true, 'el médico sigue vivo');
// el paciente vuelve con la misma sesión tras más de 75 s: se reinicia igual que una sesión nueva
$ultMedico = senalSondear($sala, 'medico', 'm1', $ultMedico)[0]['id'];   // recoge el `ice` pendiente
$vuelve = senalSondear($sala, 'cliente', 'c2', 0);
igual($tipos($vuelve), ['presente']);
igual($tipos(senalSondear($sala, 'medico', 'm1', $ultMedico)), ['presente']);
// si el otro lado está caído, el que llega no recibe «presente» de nadie
$sala2 = 'pm-bbbbbbbbbbbbbbbbbbbbbbbb';
igual(senalSondear($sala2, 'cliente', 'c1', 0), []);
ejecutar("UPDATE senales_lado SET visto = UTC_TIMESTAMP() - INTERVAL 76 SECOND WHERE sala = ?", [$sala2]);
igual(senalSondear($sala2, 'medico', 'm1', 0), [], 'el otro lado no está vivo: sin «presente»');
// máximo 50 por sondeo y en orden
$sala3 = 'pm-cccccccccccccccccccccccc';
senalSondear($sala3, 'medico', 'm1', 0);
senalSondear($sala3, 'cliente', 'c1', 0);
for ($i = 1; $i <= 60; $i++) senalEnviar($sala3, 'medico', 'ice', ['n' => $i]);
$lote = senalSondear($sala3, 'cliente', 'c1', 0);
igual(count($lote), 50);
$ids = array_column($lote, 'id');
$orden = $ids; sort($orden);
igual($ids, $orden, 'en orden de id');
igual([$lote[0]['tipo'], $lote[1]['datos'], $lote[49]['datos']], ['presente', ['n' => 1], ['n' => 49]]);
$siguiente = senalSondear($sala3, 'cliente', 'c1', $lote[49]['id']);
igual(array_column($siguiente, 'datos'), array_map(fn($n) => ['n' => $n], range(50, 60)), 'el resto en el siguiente sondeo');
// limpieza de mensajes viejos (1 de cada 50 llamadas): con 600 llamadas la probabilidad de no limpiar es < 1e-5
ejecutar("INSERT INTO senales (sala, para, tipo, creado) VALUES (?, 'medico', 'ice', UTC_TIMESTAMP() - INTERVAL 11 MINUTE)", ['pm-dddddddddddddddddddddddd']);
for ($i = 0; $i < 600; $i++) senalSondear($sala3, 'cliente', 'c1', 0);
igual((int) valor("SELECT COUNT(*) FROM senales WHERE sala = 'pm-dddddddddddddddddddddddd'"), 0, 'se limpian los mensajes de más de 10 minutos');
afirmar((int) valor('SELECT COUNT(*) FROM senales WHERE sala = ?', [$sala3]) > 0, 'los recientes se conservan');

echo "ok · directorio, usuarios, telemedicina, señalización y funciones del sitio (PHP " . PHP_VERSION . " + MariaDB " . valor('SELECT VERSION()') . ")\n";
