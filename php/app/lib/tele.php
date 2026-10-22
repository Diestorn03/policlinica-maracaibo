<?php
// Telemedicina: sala de espera → el médico atiende y el servidor crea una sala opaca y la videollamada va directo entre los dos navegadores
// (WebRTC, ver senal.php). Equivale a src/lib/tele.ts. «En vivo» = los paneles consultan /api/espera y /api/cola cada pocos segundos.
// Las reglas «un cliente, una consulta activa» y «un médico, una videollamada a la vez» las garantizan los índices únicos del esquema.
declare(strict_types=1);

/** Saca de la cola a quien cerró la página (5 min sin latido) y cierra consultas olvidadas (4 h). */
function _limpiarConsultas(): void {
    ejecutar("UPDATE consultas SET estado = 'cancelada', finalizada = UTC_TIMESTAMP() WHERE estado = 'espera' AND visto < UTC_TIMESTAMP() - INTERVAL 5 MINUTE");
    ejecutar("UPDATE consultas SET estado = 'cancelada', finalizada = UTC_TIMESTAMP() WHERE estado = 'atendiendo' AND atendida < UTC_TIMESTAMP() - INTERVAL 4 HOUR");
}

/** El cliente entra a la sala. Error en texto si su afiliación venció. Si ya estaba en la sala, no duplica. */
function entrar(int $clienteId, string $motivo = ''): ?string {
    $u = fila("SELECT afiliacion_vence AS v FROM usuarios WHERE id = ? AND rol = 'cliente' AND activo = 1", [$clienteId]);
    if (!$u) return 'Tu usuario no está habilitado para telemedicina.';
    if ($u['v'] && (string) $u['v'] < gmdate('Y-m-d')) return 'Tu afiliación venció el ' . implode('/', array_reverse(explode('-', (string) $u['v']))) . '. Escríbenos para renovarla.';
    _limpiarConsultas();
    try {
        ejecutar('INSERT INTO consultas (cliente_id, motivo) VALUES (?, ?)', [$clienteId, mb_substr(trim($motivo), 0, 200)]);
    } catch (PDOException $e) {
        if (!esDuplicado($e)) throw $e;   // ya tenía una consulta activa (índice único): no se duplica
    }
    return null;
}

/** Latido + estado de la consulta activa del cliente (null si no tiene):
 *  ['id','estado','sala','creada','atendida','medico','posicion'] */
function estado(int $clienteId): ?array {
    _limpiarConsultas();
    ejecutar("UPDATE consultas SET visto = UTC_TIMESTAMP() WHERE cliente_id = ? AND estado = 'espera'", [$clienteId]);
    $r = fila("SELECT c.id, c.estado, c.sala, c.creada, c.atendida, m.nombre AS medico,
            (SELECT COUNT(*) FROM consultas o WHERE o.estado = 'espera' AND o.id <= c.id) AS posicion
        FROM consultas c LEFT JOIN usuarios m ON m.id = c.medico_id
        WHERE c.cliente_id = ? AND c.estado IN ('espera', 'atendiendo')", [$clienteId]);
    if (!$r) return null;
    $r['id'] = (int) $r['id'];
    $r['posicion'] = (int) $r['posicion'];
    return $r;
}

function cancelar(int $clienteId): void {
    ejecutar("UPDATE consultas SET estado = 'cancelada', finalizada = UTC_TIMESTAMP() WHERE cliente_id = ? AND estado = 'espera'", [$clienteId]);
}

/** Lo que ve el médico: la cola en orden de llegada y sus consultas en curso.
 *  Cada fila: id, motivo, creada, paciente, edad (y sala en `enCurso`). */
function cola(int $medicoId): array {
    _limpiarConsultas();
    $q = fn(string $donde, array $p = []): array => filas("SELECT c.id, c.motivo, c.creada, c.sala, u.nombre AS paciente, u.nacimiento
        FROM consultas c JOIN usuarios u ON u.id = c.cliente_id WHERE $donde ORDER BY c.id", $p);
    $fila = fn(array $r, bool $conSala): array => ['id' => (int) $r['id'], 'motivo' => $r['motivo'], 'creada' => $r['creada'], 'paciente' => $r['paciente'], 'edad' => edad($r['nacimiento'])]
        + ($conSala ? ['sala' => $r['sala']] : []);
    return [
        'espera' => array_map(fn(array $r) => $fila($r, false), $q("c.estado = 'espera'")),
        'enCurso' => array_map(fn(array $r) => $fila($r, true), $q("c.estado = 'atendiendo' AND c.medico_id = ?", [$medicoId])),
    ];
}

/** Identificador impredecible, sin URL ni datos personales, que identifica la videollamada de una consulta: pm-[a-z0-9]{24} */
function salaVideo(): string {
    $abc = '0123456789abcdefghijklmnopqrstuvwxyz';
    $s = '';
    for ($i = 0; $i < 24; $i++) $s .= $abc[random_int(0, 35)];
    return "pm-$s";
}

/** Toma al paciente y asigna una sala generada por el servidor. false si ya no está en espera o si el médico ya tiene una videollamada en curso.
 *  MariaDB (≥ 10.3.2) admite la subconsulta sobre la misma tabla; si dos peticiones simultáneas pasan la comprobación, el índice único
 *  consultas_un_medico_atendiendo rechaza a la segunda con «clave duplicada». */
function atender(int $consultaId, int $medicoId, string $sala): bool {
    try {
        return ejecutar("UPDATE consultas SET estado = 'atendiendo', medico_id = ?, sala = ?, enlace = NULL, atendida = UTC_TIMESTAMP()
            WHERE id = ? AND estado = 'espera' AND NOT EXISTS (
                SELECT 1 FROM (SELECT id FROM consultas WHERE medico_id = ? AND estado = 'atendiendo') AS otra
            )", [$medicoId, $sala, $consultaId, $medicoId]) === 1;
    } catch (PDOException $e) {
        if (esDuplicado($e)) return false;
        throw $e;
    }
}

/** Finaliza solo la consulta asignada al médico y exige un diagnóstico clínico breve. */
function finalizar(int $consultaId, int $medicoId, string $diagnostico): ?string {
    $diagnostico = mb_substr(str_replace(["\r\n", "\r"], "\n", trim($diagnostico)), 0, 1000);
    if (mb_strlen($diagnostico) < 3) return 'Escribe el diagnóstico antes de finalizar la consulta.';
    $n = ejecutar("UPDATE consultas SET estado = 'finalizada', diagnostico = ?, finalizada = UTC_TIMESTAMP() WHERE id = ? AND medico_id = ? AND estado = 'atendiendo'",
        [$diagnostico, $consultaId, $medicoId]);
    return $n === 1 ? null : 'No está atendiendo esta consulta o ya fue finalizada.';
}

/** Historial (últimas 50): del cliente, del médico, o de toda la clínica para el admin. $f = ['clienteId' => n, 'medicoId' => n].
 *  Cada fila: id, estado, motivo, diagnostico, creada, atendida, finalizada, paciente, medico. */
function historial(array $f = []): array {
    $cliente = (int) ($f['clienteId'] ?? 0);
    $medico = (int) ($f['medicoId'] ?? 0);
    return array_map(fn(array $r) => ['id' => (int) $r['id']] + $r, filas("SELECT c.id, c.estado, c.motivo, c.diagnostico, c.creada, c.atendida, c.finalizada, p.nombre AS paciente, m.nombre AS medico
        FROM consultas c JOIN usuarios p ON p.id = c.cliente_id LEFT JOIN usuarios m ON m.id = c.medico_id
        WHERE (? = 0 OR c.cliente_id = ?) AND (? = 0 OR c.medico_id = ?) ORDER BY c.id DESC LIMIT 50", [$cliente, $cliente, $medico, $medico]));
}
