<?php
// Funciones puras del sitio (sin base de datos): teléfonos, WhatsApp, iniciales, horarios y fechas. Equivale a src/lib/sitio.ts.
declare(strict_types=1);

const WA_NUMERO = '584124248304';

/** Del techo al sótano: el orden en que se recorre el edificio. OJO: PHP convierte las claves '3','2','1' en enteros (usa (string) $id al compararlas). */
const PISOS = ['3' => '3er piso', '2' => '2do piso', '1' => '1er piso', 'pb' => 'Planta baja', 's' => 'Sótano'];

/** '0414-1640799' → 'tel:+584141640799'. Con «+» conserva los dígitos (y quita el 0 de troncal: «+58 (0261)…»). Vacío → '' */
function telHref(string $n): string {
    $d = preg_replace('/\D/', '', $n) ?? '';
    if ($d === '') return '';
    return str_starts_with(trim($n), '+') ? 'tel:+' . preg_replace('/^580/', '58', $d) : 'tel:+58' . ltrim($d, '0');
}

/** Enlace de WhatsApp de la clínica, igual que el oficial (espacios como «+»). */
function waHref(string $mensaje = 'Solicitud de cita'): string {
    // http_build_query codifica «*» y URLSearchParams no
    return 'https://api.whatsapp.com/send/?' . strtr(http_build_query(['phone' => WA_NUMERO, 'text' => $mensaje]), ['%2A' => '*']);
}

/** 'Dra. Rossy Vera' → 'RV'; 'Dra. Neyla Carolina Soto León' → 'NS' (1.ª letra del nombre + del primer apellido) */
function iniciales(string $nombre): string {
    $sinTitulo = preg_replace('/^\s*dra?\b\.?\s*/iu', '', $nombre) ?? $nombre;
    $p = array_values(array_filter(
        preg_split('/\s+/u', $sinTitulo, -1, PREG_SPLIT_NO_EMPTY) ?: [],
        fn(string $w) => !in_array(mb_strtolower($w), ['de', 'del', 'la', 'las', 'los', 'y', 'da', 'van', 'von'], true)
    ));
    if (!$p) return '';
    $ap = count($p) >= 3 ? $p[count($p) - 2] : $p[count($p) - 1];
    return mb_strtoupper(mb_substr($p[0], 0, 1) . (count($p) > 1 ? mb_substr($ap, 0, 1) : ''));
}

/** Instante de Maracaibo = UTC−4 fija (sin horario de verano), como marca de tiempo «desplazada» para leerla con gmdate(). */
function _caracas(?DateTimeInterface $ahora): int {
    return ($ahora ?? new DateTimeImmutable('now', new DateTimeZone('UTC')))->getTimestamp() - 4 * 3600;
}

/** true/false si el horario trae días; null si no consta (no se calcula «Abierto ahora»). `hasta` es exclusivo.
 *  $h = ['desde' => 8, 'hasta' => 16, 'dias' => [1,2,3,4,5], 'h24' => true] (0 = domingo … 6 = sábado). */
function estaAbierto(array $h, ?DateTimeInterface $ahora = null): ?bool {
    if (!isset($h['dias'])) return null;
    $c = _caracas($ahora);
    $hora = (int) gmdate('G', $c) + (int) gmdate('i', $c) / 60;
    return in_array((int) gmdate('w', $c), $h['dias'], true)
        && (!empty($h['h24']) || ($hora >= $h['desde'] && $hora < $h['hasta']));
}

/** Hora actual de Maracaibo en horas decimales (0–24), para la aguja del reloj. */
function horaCaracas(?DateTimeInterface $ahora = null): float {
    $c = _caracas($ahora);
    return (int) gmdate('G', $c) + (int) gmdate('i', $c) / 60;
}

/** Fecha de la base (UTC sin zona) en hora de Maracaibo, en español de Venezuela (sin intl).
 *  $formato: 'fecha' = '19 de octubre de 2026' · 'hora' = '3:20 p. m.' · 'corta' = '19 oct., 3:20 p. m.' · 'mes' = 'oct.' */
function fechaCaracas(string|DateTimeInterface $s, string $formato = 'fecha'): string {
    $c = _caracas(is_string($s) ? aFecha($s) : $s);
    $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    $cortos = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];
    $m = (int) gmdate('n', $c) - 1;
    $h = (int) gmdate('G', $c);
    $hora = ($h % 12 ?: 12) . ':' . gmdate('i', $c) . ' ' . ($h < 12 ? 'a. m.' : 'p. m.');
    return match ($formato) {
        'hora' => $hora,
        'corta' => gmdate('j', $c) . ' ' . $cortos[$m] . ', ' . $hora,
        'mes' => $cortos[$m],
        default => gmdate('j', $c) . ' de ' . $meses[$m] . ' de ' . gmdate('Y', $c),
    };
}

/** Minutos enteros entre dos fechas de la base; null si la consulta no terminó.
 *  OJO: devuelve ?int (como el .ts), no string: las páginas pintan «$min min» o «Sin dato». */
function duracion(?string $desde, ?string $hasta): ?int {
    if ($desde === null || $hasta === null || $hasta === '') return null;
    return (int) round((aFecha($hasta)->getTimestamp() - aFecha($desde)->getTimestamp()) / 60);
}

/** Tiempo esperando: '07:32' (mm:ss) o '1 h 05 min' */
function esperando(string $creada, ?DateTimeInterface $ahora = null): string {
    $ahora ??= new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $s = max(0, $ahora->getTimestamp() - aFecha($creada)->getTimestamp());
    $dos = fn(int $n) => str_pad((string) $n, 2, '0', STR_PAD_LEFT);
    return $s >= 3600 ? intdiv($s, 3600) . ' h ' . $dos(intdiv($s % 3600, 60)) . ' min' : $dos(intdiv($s, 60)) . ':' . $dos($s % 60);
}

/** Primera letra en minúscula (multibyte) */
function _minuscula1(string $s): string { return mb_strtolower(mb_substr($s, 0, 1)) . mb_substr($s, 1); }

/** "2do Piso C Nro 28" → ['piso' => '2', 'puertas' => ['28'], 'texto' => '2do piso, consultorio 28'].
 *  Los consultorios del WordPress vienen escritos de mil formas ("P.B Consultorio NRO 32", "1er.Piso C. Nro. 16", "PB C NRO 13-14-14B"). */
function ubicacion(string $raw): array {
    $t = mb_strtolower($raw);
    $piso = preg_match('/s[oó]tano/u', $t) ? 's' : (preg_match('/\bp\.?\s?b\b|planta baja/u', $t) ? 'pb'
        : (preg_match('/\b(1(er)?|primer)\.?\s*pis/u', $t) ? '1' : (preg_match('/\b(2(do)?|segundo)\.?\s*pis/u', $t) ? '2'
        : (preg_match('/\b(3(er|ro)?|tercer)\.?\s*pis/u', $t) ? '3' : null))));
    $resto = preg_replace('/s[oó]tano|\bp\.?\s?b\b\.?|planta baja|\b(?:[123](?:er|do|ro)?|primer|segundo|tercer)\.?\s*pis[oó]/iu', ' ', $raw) ?? $raw;
    $puertas = [];
    if (preg_match_all('/(\d{1,3})\s?([AB])?(?![\w])/iu', $resto, $ms, PREG_SET_ORDER)) {
        foreach ($ms as $m) $puertas[] = $m[1] . mb_strtoupper($m[2] ?? '');
    }
    $puertas = array_values(array_unique($puertas));
    $nombre = $piso !== null ? PISOS[$piso] : null;
    $detalle = $puertas ? 'consultorio ' . implode(', ', $puertas) : _minuscula1(trim(preg_replace('/\s+/u', ' ', $resto) ?? $resto));
    $texto = $nombre !== null ? ($detalle !== '' ? "$nombre, $detalle" : $nombre) : _minuscula1(trim($raw));
    return ['piso' => $piso, 'puertas' => $puertas, 'texto' => $texto];
}

/** Miniatura 160 px de la foto importada (/medicos/t/*.webp); las subidas desde el admin ya son pequeñas */
function miniatura(string $foto): string {
    return preg_replace('#^/medicos/([^/]+)\.jpg$#', '/medicos/t/$1.webp', $foto) ?? $foto;
}
