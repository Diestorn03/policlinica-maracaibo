<?php
// /panel/ · panel del cliente: tres momentos en el mismo bloque azul, según estado(): inicio · sala de espera · te atienden.
// Equivale a src/pages/panel/index.astro. El servidor pinta el que toca; el script (en el marco) lo cambia sin recargar sondeando /api/espera cada 4 s.
// Al terminar la consulta o dejar de estar en la sala recarga con ?fin=… para mostrar el aviso y refrescar el historial.
declare(strict_types=1);
require_once __DIR__ . '/partials/tele.php';

$yo = exigir(['cliente']);
$consulta = estado($yo['id']);
$pasadas = historial(['clienteId' => $yo['id']]);
$ficha = usuario($yo['id']);
$error = teleErrorConocido(is_string($_GET['error'] ?? null) ? $_GET['error'] : null);
$fin = is_string($_GET['fin'] ?? null) ? $_GET['fin'] : null;
$inicial = !$consulta ? 'inicio' : ($consulta['estado'] === 'espera' ? 'espera' : 'atiende');
$primer = preg_split('/\s+/u', trim($yo['nombre']))[0] ?? '';

$delante = fn(int $n): string => $n <= 0 ? 'Eres el siguiente.' : 'Hay ' . $n . ' ' . ($n === 1 ? 'persona' : 'personas') . ' antes que tú.';

// Afiliación contra el día de hoy en Caracas (el último día aún vale)
$hoy = (new DateTimeImmutable('now', new DateTimeZone('America/Caracas')))->format('Y-m-d');
$vence = $ficha['afiliacion_vence'] ?? null;
$dias = $vence ? (int) round((strtotime($vence . ' UTC') - strtotime($hoy . ' UTC')) / 86400) : null;
$fechaVence = $vence ? teleFechaLarga($vence) : '';
$afiliacion = $dias === null ? '' : ($dias < 0 ? "Tu afiliación venció el $fechaVence." : ($dias <= 30 ? "Tu afiliación vence el $fechaVence." : "Tu afiliación está vigente hasta el $fechaVence."));

$head = $consulta && $consulta['estado'] === 'espera' ? '<noscript><meta http-equiv="refresh" content="10"></noscript>' : '';
$posicion = (int) ($consulta['posicion'] ?? 1);
$whatsRenovar = e(waHref('Renovar mi afiliación'));
$iconoVideo = '<svg class="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>';

ob_start();
?>
<div class="t" data-estados data-actual="<?= $inicial ?>">
    <p class="t-aviso" role="status" data-sin-conexion hidden>Sin conexión. Seguimos intentando…</p>

    <!-- Inicio -->
    <section class="t-azul" data-estado="inicio" aria-labelledby="t-inicio"<?= teleOculto($inicial !== 'inicio') ?>>
      <div class="grid-bg" aria-hidden="true"></div>
      <h1 class="t-titulo" id="t-inicio" tabindex="-1">Hola, <?= e($primer) ?></h1>
      <p class="t-aviso" role="status" data-fin="termino"<?= teleOculto($fin !== 'termino') ?>>La consulta terminó. Gracias por conectarte.</p>
      <p class="t-aviso" role="status" data-fin="fuera"<?= teleOculto($fin !== 'fuera') ?>>Ya no estás en la sala de espera. Pasa cuando la pantalla se apaga o se pierde la conexión por varios minutos. Pulsa «Entrar a la videollamada» para volver a entrar.</p>
      <div class="t-aviso" role="alert" tabindex="-1" data-error<?= teleOculto($error === '') ?>>
        <p><?= e($error) ?></p>
        <a class="link" data-renovar href="<?= $whatsRenovar ?>" target="_blank" rel="noopener"<?= teleOculto(!teleEsDeAfiliacion($error)) ?>>Escribir por WhatsApp</a>
      </div>
      <p>Habla con un médico por videollamada. Pulsa el botón y espera tu turno en la sala de espera: te atienden por orden de llegada.</p>
      <form class="panel__entrar" method="post" action="<?= e(u('/api/espera')) ?>" data-entrar>
        <input type="hidden" name="accion" value="entrar">
        <div class="t-campo">
          <label for="motivo">Motivo de la consulta (opcional)</label>
          <input class="input" id="motivo" name="motivo" maxlength="200" autocomplete="off">
        </div>
        <button class="btn btn--white t-grande" type="submit"><?= $iconoVideo ?><span>Entrar a la videollamada</span></button>
      </form>
    </section>

    <!-- Sala de espera -->
    <section class="t-azul" data-estado="espera" aria-labelledby="t-espera"<?= teleOculto($inicial !== 'espera') ?>>
      <div class="grid-bg" aria-hidden="true"></div>
      <h1 class="t-titulo" id="t-espera" tabindex="-1">Estás en la sala de espera</h1>
      <dl class="panel__cifras">
        <div>
          <dt>Tu turno</dt>
          <dd class="panel__n" data-posicion><?= $posicion ?></dd>
          <dd data-linea><?= e($delante($posicion - 1)) ?></dd>
        </div>
        <div>
          <dt>Esperando</dt>
          <dd class="panel__n"><time data-reloj<?= $consulta ? ' data-creada="' . e($consulta['creada']) . '"' : '' ?>><?= $consulta ? e(esperando($consulta['creada'])) : '00:00' ?></time></dd>
        </div>
      </dl>
      <p>No cierres esta página. Cuando un médico te atienda, aquí aparecerá el botón para entrar a la videollamada.</p>
      <div class="t-aviso" data-largo hidden>
        <p>Está tardando más de lo normal. Puedes seguir esperando o escribirnos por WhatsApp.</p>
        <a class="link" href="<?= e(waHref('Consulta de telemedicina')) ?>" target="_blank" rel="noopener">Escribir por WhatsApp</a>
      </div>
      <h2 class="panel__sub">Mientras esperas</h2>
      <ul class="panel__tips">
        <li>Permite el uso de la cámara y el micrófono si tu navegador te lo pide.</li>
        <li>Busca un lugar con buena luz y poco ruido.</li>
        <li>Ten a mano tus informes o estudios, si los tienes.</li>
      </ul>
      <form method="post" action="<?= e(u('/api/espera')) ?>">
        <input type="hidden" name="accion" value="cancelar">
        <button class="btn t-borde" type="submit">Salir de la sala</button>
      </form>
      <p class="sr-only" role="status" aria-live="polite" data-anuncio></p>
    </section>

    <!-- Te atienden -->
    <section class="t-azul" data-estado="atiende" aria-labelledby="t-atiende"<?= teleOculto($inicial !== 'atiende') ?>>
      <div class="grid-bg" aria-hidden="true"></div>
      <h1 class="t-titulo" id="t-atiende" tabindex="-1"><span data-medico><?= e(($consulta['medico'] ?? '') ?: 'Un médico') ?></span> te está esperando</h1>
      <p>La videollamada se abrirá automáticamente aquí. Permite el uso de cámara y micrófono cuando tu navegador lo solicite.</p>
      <?= teleVideollamada((string) ($consulta['sala'] ?? ''), 'cliente') ?>

    </section>

<?php if ($afiliacion !== ''): ?>
    <p class="panel__afiliacion"><?= e($afiliacion) ?><?php if ($dias !== null && $dias <= 30): ?> <a class="link" href="<?= $whatsRenovar ?>" target="_blank" rel="noopener">Renovar por WhatsApp</a><?php endif ?></p>
<?php endif ?>

    <?= teleHistorial($pasadas, 'cliente') ?>


    <p class="t-emergencia">¿Es una emergencia? No uses la videollamada: llama al <a href="<?= e(TELE_EMERGENCIAS_HREF) ?>"><?= e(TELE_EMERGENCIAS_TEXTO) ?></a>, a toda hora.</p>
  </div>
<?php
pagina('panel', 'Mi panel', 'Panel del paciente', (string) ob_get_clean(), $yo, $head);
