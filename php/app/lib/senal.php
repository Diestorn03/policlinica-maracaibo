<?php
// Señalización de la videollamada (WebRTC): el servidor solo pasa los mensajes de conexión entre el médico y el paciente de una sala.
// El video y el audio van directo entre los dos navegadores. Equivale a src/lib/senal.ts, pero por SONDEO CORTO sobre MariaDB
// (el hosting no admite conexiones largas ni estado en memoria): cada llamada responde de inmediato con lo que haya.
// Tablas: `senales` (mensajes con id creciente; el navegador recuerda el último id que vio) y `senales_lado` (quién está conectado y con qué sesión).
declare(strict_types=1);

const SENAL_VIVO = 75;   // segundos sin sondear antes de dar por desconectado a un lado (un móvil con la pestaña en segundo plano sondea muy espaciado)

/** 'cliente' → 'medico' y viceversa; null si el rol no es de videollamada. */
function _otroLado(string $rol): ?string { return ['medico' => 'cliente', 'cliente' => 'medico'][$rol] ?? null; }

/** Rol del usuario en la sala ('medico' | 'cliente') si participa en una consulta en curso con esa sala; si no, null. */
function salaDe(string $sala, int $usuarioId): ?string {
    if (!preg_match('/^pm-[a-z0-9]{24}$/D', $sala)) return null;
    $c = fila("SELECT cliente_id, medico_id FROM consultas WHERE sala = ? AND estado = 'atendiendo'", [$sala]);
    if (!$c) return null;
    if ((int) $c['cliente_id'] === $usuarioId) return 'cliente';
    return $c['medico_id'] !== null && (int) $c['medico_id'] === $usuarioId ? 'medico' : null;
}

/** Registra que el lado está presente y devuelve sus mensajes nuevos (id > $desde, en orden, máx. 50): [['id' => n, 'tipo' => s, 'datos' => json|null], …].
 *  $sesion cambia con cada carga de página: una sesión nueva (o llevar más de 75 s sin sondear) reinicia la conexión
 *  de los dos lados con un aviso `presente`. */
function senalSondear(string $sala, string $rol, string $sesion, int $desde): array {
    $otro = _otroLado($rol);
    if ($otro === null) return [];
    $sesion = mb_substr($sesion, 0, 40);
    $yo = fila('SELECT sesion, (visto > UTC_TIMESTAMP() - INTERVAL ' . SENAL_VIVO . ' SECOND) AS vivo FROM senales_lado WHERE sala = ? AND rol = ?', [$sala, $rol]);
    if (!$yo || $yo['sesion'] !== $sesion || !$yo['vivo']) {
        enTransaccion(function () use ($sala, $rol, $otro, $sesion): void {
            ejecutar('DELETE FROM senales WHERE sala = ? AND para = ?', [$sala, $rol]);
            ejecutar('INSERT INTO senales_lado (sala, rol, sesion, visto) VALUES (?, ?, ?, UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE sesion = VALUES(sesion), visto = VALUES(visto)', [$sala, $rol, $sesion]);
            if (_ladoVivo($sala, $otro)) {
                ejecutar("INSERT INTO senales (sala, para, tipo) VALUES (?, ?, 'presente'), (?, ?, 'presente')", [$sala, $otro, $sala, $rol]);
            }
        });
    } else {
        ejecutar('UPDATE senales_lado SET visto = UTC_TIMESTAMP() WHERE sala = ? AND rol = ?', [$sala, $rol]);
    }
    // ponytail: poda al azar (1 de cada 50 llamadas), sin tarea programada; el hosting compartido no tiene cron garantizado
    if (random_int(1, 50) === 1) {
        ejecutar('DELETE FROM senales WHERE creado < UTC_TIMESTAMP() - INTERVAL 10 MINUTE');
        ejecutar('DELETE FROM senales_lado WHERE visto < UTC_TIMESTAMP() - INTERVAL 1 HOUR');
    }
    $mensajes = filas('SELECT id, tipo, datos FROM senales WHERE sala = ? AND para = ? AND id > ? ORDER BY id LIMIT 50', [$sala, $rol, $desde]);
    return array_map(fn(array $m) => ['id' => (int) $m['id'], 'tipo' => $m['tipo'], 'datos' => $m['datos'] === null ? null : json_decode($m['datos'], true)], $mensajes);
}

/** true si ese lado sondeó hace menos de SENAL_VIVO segundos. */
function _ladoVivo(string $sala, string $rol): bool {
    return valor('SELECT 1 FROM senales_lado WHERE sala = ? AND rol = ? AND visto > UTC_TIMESTAMP() - INTERVAL ' . SENAL_VIVO . ' SECOND', [$sala, $rol]) !== null;
}

/** Deja un mensaje para el otro lado. false si el otro no está conectado (nadie lo recibiría). */
function senalEnviar(string $sala, string $rolOrigen, string $tipo, mixed $datos): bool {
    $otro = _otroLado($rolOrigen);
    if ($otro === null || !_ladoVivo($sala, $otro)) return false;
    ejecutar('INSERT INTO senales (sala, para, tipo, datos) VALUES (?, ?, ?, ?)',
        [$sala, $otro, $tipo, $datos === null ? null : json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)]);
    return true;
}
