<?php
// /medico/ · panel del médico: la sala de espera en vivo, sus consultas en curso y su historial.
// Equivale a src/pages/medico/index.astro. El servidor pinta lo que hay; el script (en el marco) sondea /api/cola cada 4 s y reconcilia por id.
declare(strict_types=1);
require_once __DIR__ . '/partials/tele.php';

$yo = exigir(['medico']);
$viva = cola($yo['id']);
$pasadas = historial(['medicoId' => $yo['id']]);
$error = teleErrorConocido(is_string($_GET['error'] ?? null) ? $_GET['error'] : null);
$atendiendo = is_string($_GET['atendiendo'] ?? null) ? $_GET['atendiendo'] : '';
$tomado = false;
foreach ($viva['enCurso'] as $c) if ((string) $c['id'] === $atendiendo) $tomado = true;
$n = count($viva['espera']);
$enEspera = $n === 0 ? 'Nadie en espera' : $n . ' ' . ($n === 1 ? 'paciente' : 'pacientes') . ' en espera';
$head = '<noscript><meta http-equiv="refresh" content="10"></noscript>';

ob_start();
?>
<div class="t t--medico" data-cola>
    <header class="medico__cab">
      <div>
        <h1 class="t-titulo">Sala de espera</h1>
        <p class="medico__estado"><b data-contador><?= e($enEspera) ?></b> <span class="js-solo">Actualizado a las <time data-actualizado>--</time></span></p>
      </div>
      <button type="button" class="btn btn--outline btn--sm js-solo" aria-pressed="false" data-sonido><span data-sonido-txt>Sonido de aviso: apagado</span></button>
    </header>

    <p class="sr-only" role="status" aria-live="polite" data-anuncio></p>
    <p class="t-aviso" role="status" data-sin-conexion hidden>Sin conexión. Seguimos intentando…</p>
    <p class="t-aviso" role="alert" tabindex="-1" data-error<?= teleOculto($error === '') ?>><?= e($error) ?></p>

    <!-- Consultas en curso -->
    <section class="t-azul" aria-labelledby="t-curso" data-curso-sec<?= teleOculto(!$viva['enCurso']) ?>>
      <div class="grid-bg" aria-hidden="true"></div>
      <h2 id="t-curso">En curso</h2>
      <p class="t-aviso" role="status" data-tomado<?= teleOculto(!$tomado) ?>>Ya es tu paciente. La videollamada se abre aquí automáticamente.</p>
      <ul class="medico__curso" data-curso>
<?php foreach ($viva['enCurso'] as $c): ?>
        <?= teleEnCurso($c, (string) $c['id'] === $atendiendo) ?>

<?php endforeach ?>
      </ul>
    </section>

    <!-- Cola -->
    <section class="t-hoja" aria-labelledby="t-cola">
      <h2 id="t-cola">Pacientes en espera</h2>
      <form id="cola" method="post" action="<?= e(u('/api/cola')) ?>" class="medico__form">
        <input type="hidden" name="accion" value="atender">
        <table class="t-tabla t-tabla--cola" data-tabla<?= teleOculto($n === 0) ?>>
          <caption class="sr-only">Pacientes en espera, por orden de llegada</caption>
          <thead><tr><th scope="col">Turno</th><th scope="col">Paciente</th><th scope="col">Edad</th><th scope="col">Esperando</th><th scope="col">Motivo</th><th scope="col"><span class="sr-only">Acción</span></th></tr></thead>
          <tbody data-filas>
<?php foreach ($viva['espera'] as $i => $c): ?>
            <?= teleFila($c, $i + 1) ?>

<?php endforeach ?>
          </tbody>
        </table>
        <p class="t-vacio" data-vacio<?= teleOculto($n > 0) ?>>Cuando llegue alguien, aparecerá aquí. Esta página se actualiza sola.</p>
      </form>
    </section>

    <?= teleHistorial($pasadas, 'medico') ?>


    <template id="pl-fila"><?= teleFila() ?></template>
    <template id="pl-curso"><?= teleEnCurso() ?></template>
  </div>
<?php
pagina('medico', 'Sala de espera', 'Panel del médico', (string) ob_get_clean(), $yo, $head);
