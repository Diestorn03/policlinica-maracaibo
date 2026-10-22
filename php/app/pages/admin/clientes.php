<?php
// /admin/clientes/ · afiliados con telemedicina: sus datos y si la afiliación está vigente. Se editan en Usuarios (mismo formulario).
// Equivale a src/pages/admin/clientes.astro.
declare(strict_types=1);

$yo = exigir(['admin']);
$clientes = usuarios(['rol' => 'cliente']);
$hoy = adminHoy();
$filas = array_map(fn(array $c) => ['c' => $c, 'af' => adminAfiliacion($c['afiliacion_vence'], $hoy), 'anos' => edad($c['nacimiento'])], $clientes);
// igual que el Resumen: un cliente inactivo no cuenta
$vigentes = count(array_filter($filas, fn(array $f) => (int) $f['c']['activo'] === 1 && $f['af']['clase'] === 'vigente'));

ob_start(); ?>
  <section class="panel" aria-labelledby="lista-t">
    <div class="panel__head">
      <div>
        <h2 id="lista-t"><span data-cuenta-de="#cuerpo"><?= count($clientes) ?></span> <?= adminPl(count($clientes), 'cliente', 'clientes') ?></h2>
        <p class="note"><?= $vigentes ?> con la afiliación vigente</p>
      </div>
      <div class="filtro">
        <div role="search">
          <label class="sr-only" for="buscar">Buscar un cliente</label>
          <input class="input" id="buscar" type="search" data-filtra="#cuerpo" placeholder="Nombre, cédula o correo" autocomplete="off" />
        </div>
        <a class="btn btn--primary btn--sm" href="<?= e(u('/admin/usuarios/?nuevo=cliente#ficha')) ?>">Agregar un cliente</a>
      </div>
    </div>
    <div class="table-wrap">
      <table class="table adm-tabla">
        <thead><tr><th scope="col">Cliente</th><th scope="col">Nacimiento</th><th scope="col">Teléfono</th><th scope="col">Correo</th><th scope="col">Dirección</th><th scope="col">Afiliación</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody id="cuerpo">
<?php foreach ($filas as ['c' => $c, 'af' => $af, 'anos' => $anos]):
    $activo = (int) $c['activo'] === 1;
    $sinCedula = $c['cedula'] === null || $c['cedula'] === '';
    $claseAf = 'estado' . ($activo && $af['clase'] === 'vigente' ? ' estado--on' : '') . (!$activo ? ' estado--fin' : '');
?>
          <tr data-clave="<?= e(adminFicha($c['nombre'], (string) $c['cedula'], $c['correo'], $c['telefono'])) ?>">
            <td data-label="Cliente"><div class="apila"><b class="nombre"><?= e($c['nombre']) ?></b><span><?= $sinCedula ? '<span class="sin">Sin cédula</span>' : e($c['cedula']) ?><?= !$activo ? ' <span class="estado">Inactivo</span>' : '' ?></span></div></td>
            <td data-label="Nacimiento"><?php if ($c['nacimiento']): ?><div class="apila"><span><?= e(adminDmy($c['nacimiento'])) ?></span><?= $anos !== null ? '<span class="sin">' . $anos . ' años</span>' : '' ?></div><?php else: ?><span class="sin">Sin dato</span><?php endif ?></td>
            <td data-label="Teléfono"><?= $c['telefono'] !== '' ? '<a class="link" href="' . e(telHref($c['telefono'])) . '">' . e($c['telefono']) . '</a>' : '<span class="sin">Sin dato</span>' ?></td>
            <td data-label="Correo"><?= e($c['correo']) ?></td>
            <td data-label="Dirección"><?= $c['direccion'] !== '' ? e($c['direccion']) : '<span class="sin">Sin dato</span>' ?></td>
            <td data-label="Afiliación"><span class="<?= $claseAf ?>"><?= e($af['texto']) ?></span></td>
            <td class="acc"><a href="<?= e(u('/admin/usuarios/?editar=' . $c['id'] . '#ficha')) ?>" aria-label="<?= e('Editar a ' . $c['nombre']) ?>">Editar</a></td>
          </tr>
<?php endforeach ?>
        </tbody>
      </table>
    </div>
    <p class="adm-vacio" data-vacio-de="#cuerpo" hidden>Ningún cliente coincide con esa búsqueda.</p>
<?php if (!$clientes): ?>
    <p class="adm-vacio">Todavía no hay clientes. Agrega el primero con el botón de arriba.</p>
<?php endif ?>
  </section>
<?php
adminMarco('Clientes', 'clientes', ob_get_clean(), $yo, 'Los afiliados que usan la telemedicina. Con la afiliación vencida no pueden entrar a la videollamada.');
