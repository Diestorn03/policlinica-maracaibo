<?php
// Marco común de /admin/* y ayudas de las pantallas de administración.
// Equivale a src/components/admin/AdminShell.astro + src/components/admin/util.ts + ficha() de src/components/directorio/buscar.ts.
// El marcado es idéntico al de Astro: admin.css y los scripts (filtrar, edicion, los de cada página) dependen de estas clases y atributos.
declare(strict_types=1);

const ADMIN_PESTANAS = [
    ['resumen', 'Resumen', '/admin/'], ['medicos', 'Médicos', '/admin/medicos/'], ['clientes', 'Clientes', '/admin/clientes/'],
    ['usuarios', 'Usuarios', '/admin/usuarios/'], ['especialidades', 'Especialidades', '/admin/especialidades/'], ['consultas', 'Consultas', '/admin/consultas/'],
];
const ADMIN_ESTADOS = ['espera' => 'En espera', 'atendiendo' => 'En videollamada', 'finalizada' => 'Finalizada', 'cancelada' => 'Cancelada'];

/**
 * Página completa de /admin/*: cabecera (h1 + subtítulo), pestañas, caja de aviso (?error= / ?ok=) y el contenido.
 * $activa: resumen | medicos | clientes | usuarios | especialidades | consultas. $contenido ya viene escapado.
 * $fallo: el error de un POST que vuelve a mostrar la página con lo escrito (en vez de redirigir con ?error=).
 */
function adminMarco(string $titulo, string $activa, string $contenido, array $yo, ?string $sub = null, ?string $fallo = null): never {
    [$ok, $error] = avisoUrl();
    if ($fallo !== null) $error = mb_substr($fallo, 0, 240);
    $pestanas = '';
    foreach (ADMIN_PESTANAS as [$id, $texto, $href]) {
        $pestanas .= '<a href="' . e(u($href)) . '"' . ($id === $activa ? ' aria-current="page"' : '') . '>' . e($texto) . '</a>';
    }
    $aviso = ($error !== null && $error !== '') ? '<p class="alert alert--error" id="aviso-error">' . e($error) . '</p>'
        : (($ok !== null && $ok !== '') ? '<p class="alert alert--ok">' . e($ok) . '</p>' : '');
    // el <style> protege el formulario móvil incluso cuando un navegador conserva una hoja de estilos previa en caché
    $html = '<style>
    @media (max-width: 760px) {
      .adm .checks { columns: 1 !important; column-count: 1 !important; column-width: auto !important; max-height: none !important; overflow: visible !important; }
    }
  </style>
  <div class="adm">
    <header class="adm-cab">
      <h1>' . e($titulo) . '</h1>' . ($sub !== null && $sub !== '' ? '
      <p>' . e($sub) . '</p>' : '') . '
    </header>
    <nav class="adm-tabs" aria-label="Secciones de administración">' . $pestanas . '</nav>
    <div class="adm-aviso" id="aviso" role="status">' . $aviso . '</div>
' . $contenido . '
  </div>';
    pagina('admin', $titulo, 'Administración', $html, $yo, '', $fallo !== null ? 422 : 200);
}

/** Redirección 303 a la misma página con el aviso en la URL (?ok=… o ?error=…) y, si hace falta, algo más («&editar=5»). */
function adminVolver(string $aqui, string $clave, string $texto, string $extra = ''): never {
    redirigir($aqui . '?' . $clave . '=' . rawurlencode($texto) . $extra);
}

/** Atributo booleano de HTML: ' hidden' si se cumple, nada si no (como Astro con hidden={cond}). */
function adminAttr(bool $cond, string $atributo): string { return $cond ? ' ' . $atributo : ''; }

/** Entero positivo de un campo de formulario; 0 si no lo es (Number(f.get('id')) || 0). */
function adminNum(mixed $v): int { return is_string($v) && ctype_digit($v) ? (int) $v : 0; }

/** Texto de un campo de formulario ('' si falta o llegó como lista). */
function adminTexto(mixed $v): string { return is_string($v) ? $v : ''; }

/** Hoy en Maracaibo (UTC−4) como AAAA-MM-DD, para comparar con las fechas de afiliación. */
function adminHoy(): string { return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify('-4 hours')->format('Y-m-d'); }

/** '2027-10-19' → '19/10/2027' */
function adminDmy(string $iso): string { return implode('/', array_reverse(explode('-', $iso))); }

/** Estado de la afiliación de un cliente según su fecha de vencimiento: ['clase' => vigente|vencida|sin, 'texto' => …] */
function adminAfiliacion(?string $vence, ?string $hoy = null): array {
    $hoy ??= adminHoy();
    if ($vence === null || $vence === '') return ['clase' => 'sin', 'texto' => 'Sin fecha'];
    return $vence >= $hoy ? ['clase' => 'vigente', 'texto' => 'Vigente hasta ' . adminDmy($vence)] : ['clase' => 'vencida', 'texto' => 'Vencida el ' . adminDmy($vence)];
}

/** Concordancia en singular: adminPl(1, 'cliente', 'clientes') → 'cliente' */
function adminPl(int $n, string $uno, string $varios): string { return $n === 1 ? $uno : $varios; }

/** «ficha» de una fila para el filtro del navegador (data-clave): textos normalizados con clave() separados por «|». */
function adminFicha(string ...$textos): string { return implode('|', array_map('clave', $textos)); }

/** Primera letra en mayúscula (UTF-8). */
function adminCapital(string $s): string { return mb_strtoupper(mb_substr($s, 0, 1)) . mb_substr($s, 1); }
