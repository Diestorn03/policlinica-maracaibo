<?php
// Marco de las páginas privadas. Astro (npm run build:php) genera un HTML de cada zona con el CSS y los scripts reales
// (dist/shell/<zona>/index.html → app/shell/<zona>.html) y marcas @@…@@ que aquí se rellenan.
declare(strict_types=1);

/**
 * Envía una página completa y termina.
 * $area: 'acceso' | 'panel' | 'medico' | 'secretaria' | 'admin' (qué marco usar)
 * $contenido: HTML ya escapado del <main> (lo que va en la marca @@CONTENIDO@@)
 * $head: HTML extra para <head> (p. ej. <noscript><meta http-equiv="refresh" …></noscript>)
 */
function pagina(string $area, string $titulo, string $zona, string $contenido, ?array $usuario = null, string $head = '', int $estado = 200): never {
    $ruta = __DIR__ . "/shell/$area.html";
    // sin marco de Astro (desarrollo o pruebas) se usa uno mínimo con las mismas marcas
    $plantilla = is_file($ruta) ? (string) file_get_contents($ruta)
        : '<!doctype html><html lang="es-VE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>@@TITULO@@</title>@@HEAD@@</head><body class="app"><header class="app-bar"><span class="app-bar__zona">@@ZONA@@</span> <span class="app-bar__who"><b>@@USUARIO_NOMBRE@@</b> <small>@@USUARIO_ROL@@</small></span><form method="post" action="/api/sesion"><input type="hidden" name="accion" value="salir"><button type="submit">Salir</button></form></header><main class="app-main" id="contenido">@@CONTENIDO@@</main></body></html>';
    $html = strtr($plantilla, [
        '@@TITULO@@' => e($titulo),
        '@@ZONA@@' => e($zona),
        '@@USUARIO_NOMBRE@@' => e($usuario['nombre'] ?? ''),
        '@@USUARIO_ROL@@' => e(ROLES[$usuario['rol'] ?? ''] ?? ''),
        '@@HEAD@@' => $head,
        '@@CONTENIDO@@' => $contenido,
    ]);
    http_response_code($estado);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    echo $html;
    exit;
}

/** Atributos del campo que falló al enviar un formulario: marcado, descrito por el aviso y con el foco (como marca() en Astro). */
function marcaCampo(?string $fallo, string $campo): string {
    return $fallo === $campo ? ' aria-invalid="true" aria-describedby="aviso-error" autofocus' : '';
}

/** Aviso ?ok= / ?error= de la URL (máx. 240 caracteres) como lo pintan las páginas de Astro. */
function avisoUrl(): array {
    $ok = isset($_GET['ok']) ? mb_substr((string) $_GET['ok'], 0, 240) : null;
    $error = isset($_GET['error']) ? mb_substr((string) $_GET['error'], 0, 240) : null;
    return [$ok, $error];
}
