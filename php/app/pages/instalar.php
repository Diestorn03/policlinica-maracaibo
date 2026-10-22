<?php
// /instalar?token=… crea las tablas, carga los 125 médicos y, si no hay administrador, crea el primero con admin_correo / admin_clave de la configuración.
// Se puede volver a llamar tras una actualización: solo aplica lo que falte. Quitar instalar_token de la configuración al terminar.
declare(strict_types=1);
require_once __DIR__ . '/../lib/migrar.php';

$token = (string) config('instalar_token', '');
if ($token === '' || !hash_equals($token, (string) ($_GET['token'] ?? ''))) texto('No encontrado', 404);

$informe = [];
try {
    $informe[] = 'Base de datos: ' . config('db_name', '?');
    $aplicadas = migrar();
    $informe[] = $aplicadas ? 'Migraciones aplicadas: ' . implode(', ', $aplicadas) : 'Migraciones: ya estaba al día.';
    $correo = strtolower(trim((string) config('admin_correo', '')));
    $clave = (string) config('admin_clave', '');
    if ((int) valor("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'") === 0) {
        if ($correo !== '' && $clave !== '') {
            ejecutar("INSERT INTO usuarios (rol, nombre, correo, clave_hash) VALUES ('admin', ?, ?, ?)", [(string) config('admin_nombre', 'Administración'), $correo, hashClave($clave)]);
            $informe[] = "Administrador creado: $correo";
        } else {
            $informe[] = 'Falta admin_correo y admin_clave en la configuración para crear el administrador.';
        }
    } else {
        $informe[] = 'Ya existe un administrador.';
    }
    $informe[] = 'Médicos en el directorio: ' . valor('SELECT COUNT(*) FROM medicos');
    $informe[] = 'Listo. Quita instalar_token de la configuración.';
} catch (Throwable $ex) {
    $informe[] = 'Error: ' . $ex->getMessage();
    texto(implode("\n", $informe), 500);
}
texto(implode("\n", $informe));
