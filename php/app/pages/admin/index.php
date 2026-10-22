<?php
// /admin/ · resumen: las cifras de la clínica (resumenAdmin) y las afiliaciones que vencen pronto. Equivale a src/pages/admin/index.astro.
declare(strict_types=1);

$yo = exigir(['admin']);
$r = resumenAdmin();
$porVencer = $r['porVencer'];

ob_start(); ?>
  <div class="panel cifras">
    <section aria-labelledby="c-dir">
      <h2 class="h-lg" id="c-dir">Directorio</h2>
      <dl>
        <div><dt>Médicos</dt><dd><?= e($r['medicos']) ?></dd></div>
        <div><dt>Especialidades</dt><dd><?= e($r['especialidades']) ?><?php if ($r['sinMedicos'] > 0): ?><small><?= e($r['sinMedicos']) ?> sin médicos todavía</small><?php endif ?></dd></div>
      </dl>
      <a class="link" href="<?= e(u('/admin/medicos/')) ?>">Administrar los médicos</a>
    </section>
    <section aria-labelledby="c-tele">
      <h2 class="h-lg" id="c-tele">Telemedicina</h2>
      <dl>
        <div><dt>En la sala de espera</dt><dd><?= e($r['enEspera']) ?></dd></div>
        <div><dt>En videollamada</dt><dd><?= e($r['atendiendo']) ?></dd></div>
        <div><dt>Consultas de hoy</dt><dd><?= e($r['consultasHoy']) ?></dd></div>
      </dl>
      <a class="link" href="<?= e(u('/admin/consultas/')) ?>">Ver las consultas</a>
    </section>
    <section aria-labelledby="c-af">
      <h2 class="h-lg" id="c-af">Afiliaciones</h2>
      <dl>
        <div><dt>Vigentes</dt><dd><?= e($r['vigentes']) ?></dd></div>
        <div><dt>Vencen en 30 días</dt><dd><?= count($porVencer) ?></dd></div>
      </dl>
      <a class="link" href="<?= e(u('/admin/clientes/')) ?>">Ver los clientes</a>
    </section>
  </div>

  <section class="panel" aria-labelledby="vencen-t">
    <div class="panel__head"><h2 id="vencen-t">Afiliaciones que vencen en los próximos 30 días</h2></div>
<?php if (!$porVencer): ?>
    <p class="adm-vacio">Ninguna afiliación vence en los próximos 30 días.</p>
<?php else: ?>
    <div class="table-wrap">
      <table class="table adm-tabla">
        <thead><tr><th scope="col">Cliente</th><th scope="col">Cédula</th><th scope="col">Teléfono</th><th scope="col">Vence</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
<?php foreach ($porVencer as $c): ?>
          <tr>
            <td data-label="Cliente"><b class="nombre"><?= e($c['nombre']) ?></b></td>
            <td data-label="Cédula"><?= $c['cedula'] !== null && $c['cedula'] !== '' ? e($c['cedula']) : '<span class="sin">Sin cédula</span>' ?></td>
            <td data-label="Teléfono"><?= $c['telefono'] !== '' ? '<a class="link" href="' . e(telHref($c['telefono'])) . '">' . e($c['telefono']) . '</a>' : '<span class="sin">Sin dato</span>' ?></td>
            <td data-label="Vence"><?= e(adminDmy($c['afiliacion_vence'])) ?></td>
            <td class="acc"><a href="<?= e(u('/admin/usuarios/?editar=' . $c['id'] . '#ficha')) ?>" aria-label="<?= e('Renovar la afiliación de ' . $c['nombre']) ?>">Renovar</a></td>
          </tr>
<?php endforeach ?>
        </tbody>
      </table>
    </div>
<?php endif ?>
  </section>
<?php
adminMarco('Resumen', 'resumen', ob_get_clean(), $yo, 'Así está la Policlínica ahora. Las cifras son las del momento en que abriste la página.');
