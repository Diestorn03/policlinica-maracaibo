<?php
// /acceso/ · entrar: una sola pantalla para todos los roles; cada uno cae en su panel (POST /api/sesion).
// Equivale a src/pages/acceso.astro. Con sesión abierta va directo a su panel. Mensajes: ?error=datos|limite, ?salio=1, ?volver=.
declare(strict_types=1);
require_once __DIR__ . '/partials/tele.php';

if ($yaDentro = usuarioActual()) redirigir(inicioDe($yaDentro['rol']));

$volver = mb_substr(is_string($_GET['volver'] ?? null) ? $_GET['volver'] : '', 0, 200);
$error = is_string($_GET['error'] ?? null) ? $_GET['error'] : null;
// Cada mensaje existe siempre (oculto): el servidor muestra el que toca y el script cubre la página en caché
$avisos = [
    ['datos', 'alert', 'No pudimos entrar con esos datos. Revisa tu correo o cédula y tu contraseña.', $error === 'datos'],
    ['limite', 'alert', 'Hiciste demasiados intentos. Espera un minuto e inténtalo de nuevo.', $error === 'limite'],
    ['salio', 'status', 'Cerraste tu sesión.', ($_GET['salio'] ?? null) === '1'],
];

ob_start();
?>
<div class="acceso">
    <a class="acceso__logo" href="<?= e(u('/')) ?>" aria-label="Policlínica Maracaibo, ir al inicio"><img src="/img/logo.png" alt="" width="159" height="44" loading="lazy" decoding="async"></a>

    <section class="acceso__hoja" aria-labelledby="acceso-t">
      <h1 id="acceso-t">Entrar a tu panel</h1>

      <form class="acceso__form" method="post" action="<?= e(u('/api/sesion')) ?>" data-acceso>
<?php foreach ($avisos as [$id, $rol, $texto, $on]): ?>
        <p class="acceso__aviso" role="<?= $rol ?>" tabindex="-1" data-aviso="<?= $id ?>"<?= teleOculto(!$on) ?>><?= e($texto) ?></p>
<?php endforeach ?>
        <input type="hidden" name="volver" value="<?= e($volver) ?>">
        <div class="acceso__campo">
          <label for="usuario">Correo o cédula</label>
          <input class="input" id="usuario" name="usuario" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required>
        </div>
        <div class="acceso__campo">
          <label for="clave">Contraseña</label>
          <div class="acceso__clave">
            <input class="input" id="clave" name="clave" type="password" autocomplete="current-password" required>
            <button class="acceso__ver js-solo" type="button" aria-controls="clave"><span data-ver>Mostrar</span><span class="sr-only"> la contraseña</span></button>
          </div>
        </div>
        <button class="btn btn--primary" type="submit" data-entrar>Entrar</button>
      </form>
    </section>

    <div class="acceso__ayuda">
      <p>¿Olvidaste tu contraseña? <a class="link" href="<?= e(waHref('Ayuda con mi acceso')) ?>" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>.</p>
      <p>¿Quieres afiliarte? <a class="link" href="<?= e(u('/afiliacion/')) ?>">Conoce el plan de afiliación</a>.</p>
      <p>Emergencias: <a class="acceso__sos" href="<?= e(TELE_EMERGENCIAS_HREF) ?>"><?= e(TELE_EMERGENCIAS_TEXTO) ?></a></p>
    </div>
  </div>
<?php
pagina('acceso', 'Entrar', '', (string) ob_get_clean());
