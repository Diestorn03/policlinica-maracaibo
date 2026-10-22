<?php
// /admin/especialidades/ · las especialidades del directorio, con cuántos médicos tiene cada una. Solo se borran las que no tienen médicos.
// Equivale a src/pages/admin/especialidades.astro.
declare(strict_types=1);

$yo = exigir(['admin']);
$aqui = u('/admin/especialidades/');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = adminTexto($_POST['accion'] ?? '');
    if ($accion === 'borrar') {
        $error = borrarEspecialidad(adminNum($_POST['id'] ?? ''));
        adminVolver($aqui, ...($error ? ['error', $error] : ['ok', 'La especialidad se borró.']));
    }
    if ($accion === 'editar') {
        $error = editarEspecialidad(adminNum($_POST['id'] ?? ''), adminTexto($_POST['nombre'] ?? ''));
        adminVolver($aqui, ...($error ? ['error', $error] : ['ok', 'La especialidad se actualizó.']));
    }
    if ($accion === 'crear') {
        $error = crearEspecialidad(adminTexto($_POST['nombre'] ?? ''));
        adminVolver($aqui, ...($error ? ['error', $error] : ['ok', 'La especialidad se agregó.']));
    }
    adminVolver($aqui, 'error', 'Acción no válida.');
}

$lista = especialidades();
$vacias = count(array_filter($lista, fn(array $x) => (int) $x['total'] === 0));

ob_start(); ?>
  <section class="panel" aria-labelledby="nueva-t">
    <h2 id="nueva-t" class="h-lg">Agregar una especialidad</h2>
    <form class="nueva" method="post" action="<?= e($aqui) ?>">
      <label class="campo"><span>Nombre</span><input class="input" name="nombre" required minlength="3" maxlength="80" autocomplete="off" /></label>
      <button class="btn btn--primary" type="submit" name="accion" value="crear">Agregar</button>
    </form>
  </section>

  <section class="panel" aria-labelledby="lista-t">
    <div class="panel__head">
      <h2 id="lista-t"><?= count($lista) ?> <?= adminPl(count($lista), 'especialidad', 'especialidades') ?></h2>
<?php if ($vacias > 0): ?>
      <p class="note"><?= $vacias ?> <?= $vacias === 1 ? 'no tiene' : 'no tienen' ?> médicos todavía.</p>
<?php endif ?>
    </div>
    <ul class="esp-lista">
<?php foreach ($lista as $x): $total = (int) $x['total']; ?>
      <li>
        <span><b class="nombre"><?= e($x['nombre']) ?></b></span>
        <span class="cuantos"><?= $total === 0 ? 'Sin médicos' : '<a class="link" href="' . e(u('/directorio/?esp=' . $x['slug'])) . '">' . $total . ' ' . ($total === 1 ? 'médico' : 'médicos') . '</a>' ?></span>
        <details class="editar">
          <summary>Editar <span class="sr-only"><?= e($x['nombre']) ?></span></summary>
          <form method="post" action="<?= e($aqui) ?>">
            <input type="hidden" name="id" value="<?= e($x['id']) ?>" />
            <label class="campo"><span>Nombre</span><input class="input" name="nombre" required minlength="3" maxlength="80" autocomplete="off" value="<?= e($x['nombre']) ?>" /></label>
            <button class="btn btn--primary btn--sm" type="submit" name="accion" value="editar">Guardar cambio</button>
          </form>
        </details>
<?php if ($total === 0): ?>
        <details class="borrar">
          <summary>Borrar <span class="sr-only"><?= e($x['nombre']) ?></span></summary>
          <form method="post" action="<?= e($aqui) ?>">
            <input type="hidden" name="id" value="<?= e($x['id']) ?>" />
            <p>¿Borrar la especialidad «<?= e($x['nombre']) ?>»? No se puede deshacer.</p>
            <button class="btn btn--navy btn--sm" type="submit" name="accion" value="borrar">Sí, borrar</button>
          </form>
        </details>
<?php endif ?>
      </li>
<?php endforeach ?>
    </ul>
  </section>
<?php
adminMarco('Especialidades', 'especialidades', ob_get_clean(), $yo, 'Las especialidades que se pueden asignar a un médico. Una especialidad se borra solo cuando ya no tiene médicos.');
