<?php
// Piezas de los paneles de telemedicina. Equivale a src/components/tele/{FilaCola,EnCurso,Historial,Videollamada}.astro + avisos.ts.
// El marcado es idéntico al de Astro: tele.css y los scripts (tele.js, api.js, la videollamada) dependen de estas clases y atributos.
// Todas devuelven HTML ya escapado. Los datos de entrada son los de lib/tele.php (cola(), historial()).
declare(strict_types=1);

const TELE_EMERGENCIAS_TEXTO = '+58 (0261) 700-5141';
const TELE_EMERGENCIAS_HREF = 'tel:+582617005141';

/** ?error=… de los paneles: solo se pintan los mensajes que mandan lib/tele.php y los endpoints; el resto sale como un aviso genérico ('' si no hay ninguno). */
function teleErrorConocido(?string $v): string {
    $v = trim($v ?? '');
    if ($v === '') return '';
    $conocidos = [
        'Tu usuario no está habilitado para telemedicina.',
        'Consulta no válida.',
        'Acción no válida.',
        'Escribe el diagnóstico antes de finalizar la consulta.',
        'No está atendiendo esta consulta o ya fue finalizada.',
        'El médico ya está atendiendo otra consulta.',
        'Ese paciente ya fue tomado por otro médico o salió de la sala.',
    ];
    if (in_array($v, $conocidos, true) || preg_match('/^Tu afiliación venció el \d{2}\/\d{2}\/\d{4}\. Escríbenos para renovarla\.$/u', $v)) return $v;
    return 'No se pudo completar la acción. Inténtalo de nuevo.';
}

/** ¿El aviso es por la afiliación? Solo entonces tiene sentido ofrecer «Renovar». */
function teleEsDeAfiliacion(string $v): bool { return str_contains($v, 'afiliación'); }

/** Atributo booleano: ' hidden' si se cumple (como Astro con hidden={cond}). */
function teleOculto(bool $cond): string { return $cond ? ' hidden' : ''; }

/** «19 de octubre de 2026» de una fecha AAAA-MM-DD (sin zona horaria: no se convierte, a diferencia de fechaCaracas()). */
function teleFechaLarga(string $ymd): string {
    $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    [$a, $m, $d] = array_map('intval', explode('-', substr($ymd, 0, 10)));
    return $d . ' de ' . ($meses[$m - 1] ?? '') . ' de ' . $a;
}

/** Texto de la edad en la cola. */
function teleEdad(?int $edad, string $vacio): string { return $edad === null ? $vacio : $edad . ' años'; }

/** Una fila de la cola del médico. Sin $c es la plantilla que clona el script (<template id="pl-fila">). */
function teleFila(?array $c = null, int $orden = 1): string {
    $seg = $c ? time() - aFecha($c['creada'])->getTimestamp() : 0;
    $edad = $c ? teleEdad(isset($c['edad']) ? (int) $c['edad'] : null, 'Sin registrar') : '';
    $id = $c ? e($c['id']) : '';
    return '<tr' . ($c ? ' data-id="' . $id . '" data-creada="' . e($c['creada']) . '"' : '') . '>'
        . '<td data-etiqueta="Turno" data-campo="orden">' . ($c ? $orden : '') . '</td>'
        . '<td data-etiqueta="Paciente"><div><b data-campo="paciente">' . ($c ? e($c['paciente']) : '') . '</b><small data-campo="siguiente">' . ($c && $orden === 1 ? 'Siguiente' : '') . '</small></div></td>'
        . '<td data-etiqueta="Edad" data-campo="edad">' . e($edad) . '</td>'
        . '<td data-etiqueta="Esperando"><div><time data-campo="reloj">' . ($c ? e(esperando($c['creada'])) : '') . '</time><small data-campo="largo">' . ($seg >= 1200 ? 'Más de 20 min' : ($seg >= 600 ? 'Más de 10 min' : '')) . '</small></div></td>'
        . '<td data-etiqueta="Motivo" data-campo="motivo">' . ($c ? e(($c['motivo'] ?? '') ?: 'Sin motivo indicado') : '') . '</td>'
        . '<td><button type="submit" name="consulta"' . ($c ? ' value="' . $id . '"' : '') . ' class="btn btn--primary btn--sm"' . ($c ? ' aria-label="' . e('Atender a ' . $c['paciente']) . '"' : '') . '>Atender</button></td>'
        . '</tr>';
}

/** Contenedor común de la videollamada (WebRTC propio) para médico y cliente. data-ice = config('ice_servers') (JSON de servidores TURN, opcional). */
function teleVideollamada(string $sala, string $rol): string {
    $ice = config('ice_servers', '');
    $ice = is_array($ice) ? (json_encode($ice, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '') : (string) $ice;
    return '<div class="t-video" data-video data-sala="' . e($sala) . '" data-rol="' . e($rol) . '" data-ice="' . e($ice) . '" tabindex="-1">'
        . '<p class="t-video__estado" data-video-estado role="status">Preparando la videollamada…</p>'
        . '<div class="t-video__marco" data-video-marco></div>'
        . '<p class="t-video__nota">La videollamada se conecta sola, sin cuentas ni contraseñas. Permite cámara y micrófono cuando el navegador lo solicite.</p>'
        . '</div>';
}

/** Una consulta en curso del médico. Sin $c es la plantilla que clona el script (<template id="pl-curso">). */
function teleEnCurso(?array $c = null, bool $actual = false): string {
    return '<li class="t-encurso"' . ($c ? ' data-id="' . e($c['id']) . '"' : '') . ($actual ? ' aria-current="true"' : '') . '>'
        . '<div class="t-encurso__quien">'
        . '<h3 data-campo="paciente">' . ($c ? e($c['paciente']) : '') . '</h3>'
        . '<p data-campo="edad">' . ($c ? e(teleEdad(isset($c['edad']) ? (int) $c['edad'] : null, 'Edad sin registrar')) : '') . '</p>'
        . '<p>Motivo: <span data-campo="motivo">' . ($c ? e(($c['motivo'] ?? '') ?: 'sin motivo indicado') : '') . '</span></p>'
        . '</div>'
        . teleVideollamada($c['sala'] ?? '', 'medico')
        . '<form class="t-finalizar" method="post" action="' . e(u('/api/cola')) . '">'
        . '<input type="hidden" name="accion" value="finalizar">'
        . '<input type="hidden" name="consulta"' . ($c ? ' value="' . e($c['id']) . '"' : '') . '>'
        . '<label class="t-campo"><span>Diagnóstico</span><textarea class="textarea" name="diagnostico" required minlength="3" maxlength="1000" rows="3" placeholder="Escribe el diagnóstico registrado durante la consulta"></textarea><small>Obligatorio para finalizar. Lo verán el cliente, el médico y administración.</small></label>'
        . '<button type="submit" class="btn t-borde" data-enviar-diagnostico' . ($c ? ' aria-label="' . e('Finalizar consulta con ' . $c['paciente']) . '"' : '') . '>Guardar diagnóstico y finalizar</button>'
        . '</form>'
        . '</li>';
}

/** Consultas ya terminadas, en una tabla (en el teléfono, cada fila es un bloque). $rol: 'cliente' | 'medico'. Las fechas se muestran en hora de Maracaibo. */
function teleHistorial(array $items, string $rol): string {
    $cliente = $rol === 'cliente';
    $filas = array_values(array_filter($items, fn($i) => $i['estado'] === 'finalizada' || $i['estado'] === 'cancelada'));
    $quien = $cliente ? 'Médico' : 'Paciente';
    $h = '<section class="t-hoja" aria-labelledby="t-hist"><h2 id="t-hist">' . ($cliente ? 'Tus consultas' : 'Consultas que has atendido') . '</h2>';
    if (!$filas) {
        return $h . '<p class="t-vacio">' . ($cliente ? 'Todavía no tienes consultas por videollamada. Cuando las tengas, aparecerán aquí.' : 'Todavía no has atendido consultas.') . '</p></section>';
    }
    $h .= '<table class="t-tabla"><caption class="sr-only">' . ($cliente ? 'Tus consultas por videollamada' : 'Consultas que has atendido por videollamada') . '</caption>'
        . '<thead><tr><th scope="col">Fecha</th><th scope="col">Hora</th><th scope="col">' . $quien . '</th><th scope="col">Diagnóstico</th><th scope="col">Duración</th><th scope="col">Estado</th></tr></thead><tbody>';
    foreach ($filas as $i) {
        $min = $i['atendida'] ? duracion($i['atendida'], $i['finalizada']) : null;
        $diagnostico = $i['diagnostico'] !== '' ? $i['diagnostico'] : ($i['estado'] === 'finalizada' ? 'Sin diagnóstico registrado' : '—');
        $otro = ($cliente ? $i['medico'] : $i['paciente']) ?: 'Sin médico';
        $h .= '<tr>'
            . '<td data-etiqueta="Fecha">' . e(fechaCaracas($i['creada'])) . '</td>'
            . '<td data-etiqueta="Hora">' . e(fechaCaracas($i['creada'], 'hora')) . '</td>'
            . '<td data-etiqueta="' . $quien . '">' . e($otro) . '</td>'
            . '<td data-etiqueta="Diagnóstico">' . e($diagnostico) . '</td>'
            . '<td data-etiqueta="Duración">' . ($min === null ? '—' : $min . ' min') . '</td>'
            . '<td data-etiqueta="Estado">' . ($i['estado'] === 'finalizada' ? 'Finalizada' : 'Sin atender') . '</td>'
            . '</tr>';
    }
    return $h . '</tbody></table></section>';
}
