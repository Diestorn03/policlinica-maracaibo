<?php
// /admin/consultas/ · las últimas consultas de telemedicina de toda la clínica (historial() sin cliente ni médico).
// Equivale a src/pages/admin/consultas.astro.
declare(strict_types=1);

$yo = exigir(['admin']);
$consultas = historial();
$n = count($consultas);

ob_start(); ?>
  <section class="panel" aria-label="Consultas">
<?php if ($n === 0): ?>
    <p class="adm-vacio">Todavía no hay consultas. Aparecerán aquí cuando un cliente entre a la sala de espera.</p>
<?php else: ?>
      <div class="panel__head">
        <h2><?= $n === 1 ? 'Última consulta' : "Últimas $n consultas" ?></h2>
        <p class="note">La lista muestra como máximo las últimas 50.</p>
      </div>
      <div class="table-wrap">
        <table class="table adm-tabla">
          <thead><tr><th scope="col">Fecha</th><th scope="col">Paciente</th><th scope="col">Médico</th><th scope="col">Motivo</th><th scope="col">Diagnóstico</th><th scope="col">Estado</th><th scope="col">Duración</th></tr></thead>
          <tbody>
<?php foreach ($consultas as $c):
    $min = $c['atendida'] ? duracion($c['atendida'], $c['finalizada']) : null;
    $claseEstado = 'estado' . ($c['estado'] === 'atendiendo' ? ' estado--on' : '') . (in_array($c['estado'], ['finalizada', 'cancelada'], true) ? ' estado--fin' : '');
?>
            <tr>
              <td data-label="Fecha"><?= e(fechaCaracas($c['creada'], 'corta')) ?></td>
              <td data-label="Paciente"><b class="nombre"><?= e($c['paciente']) ?></b></td>
              <td data-label="Médico"><?= $c['medico'] !== null && $c['medico'] !== '' ? e($c['medico']) : '<span class="sin">Sin atender</span>' ?></td>
              <td data-label="Motivo"><?= $c['motivo'] !== '' ? e($c['motivo']) : '<span class="sin">Sin motivo</span>' ?></td>
              <td data-label="Diagnóstico"><?= $c['diagnostico'] !== '' ? e($c['diagnostico']) : '<span class="sin">' . ($c['estado'] === 'finalizada' ? 'Sin diagnóstico registrado' : '—') . '</span>' ?></td>
              <td data-label="Estado"><span class="<?= $claseEstado ?>"><?= e(ADMIN_ESTADOS[$c['estado']] ?? $c['estado']) ?></span></td>
              <td data-label="Duración"><?= $min !== null ? $min . ' min' : '<span class="sin">Sin dato</span>' ?></td>
            </tr>
<?php endforeach ?>
          </tbody>
        </table>
      </div>
<?php endif ?>
  </section>
<?php
adminMarco('Consultas', 'consultas', ob_get_clean(), $yo, 'Las videollamadas de toda la clínica, de la más reciente a la más antigua.');
