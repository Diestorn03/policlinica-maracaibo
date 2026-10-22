<?php
// /admin/medicos/ · directorio médico: alta, edición (con foto), baja y ubicación estructurada por piso.
// Equivale a src/pages/admin/medicos.astro. La foto llega ya reducida por el navegador (multipart, campo «foto»).
declare(strict_types=1);

$yo = exigir(['admin']);
$aqui = u('/admin/medicos/');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // si el envío superó post_max_size, PHP descarta todo el cuerpo: se avisa en vez de ejecutar un formulario vacío
    if (!$_POST && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) adminVolver($aqui, 'error', 'El envío es demasiado grande. Prueba con una foto más pequeña.');
    $id = adminNum($_POST['id'] ?? '');
    if ($id && !medico($id)) adminVolver($aqui, 'error', 'Ese médico ya no existe.');
    if (($_POST['accion'] ?? '') === 'borrar') {
        if ($id) borrarMedico($id);
        adminVolver($aqui, 'ok', 'El médico se borró del directorio.');
    }
    $datos = validarMedico($_POST);
    if (is_string($datos)) adminVolver($aqui, 'error', $datos, $id ? "&editar=$id" : '');
    $nuevo = guardarMedico($datos, $id ?: null);
    $arch = $_FILES['foto'] ?? null;
    $codigo = is_array($arch) && is_int($arch['error'] ?? null) ? $arch['error'] : UPLOAD_ERR_NO_FILE;
    $subio = $codigo === UPLOAD_ERR_OK && (int) $arch['size'] > 0;
    $errorFoto = $subio ? guardarFoto($nuevo, $arch) : match ($codigo) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'La foto pesa más de 1 MB.',
        UPLOAD_ERR_OK, UPLOAD_ERR_NO_FILE => null,
        default => 'No se pudo recibir la foto.',
    };
    if (!$subio && !empty($_POST['quitar_foto'])) quitarFoto($nuevo);
    if ($errorFoto) adminVolver($aqui, 'error', "Se guardó el médico, pero la foto no: $errorFoto", "&editar=$nuevo");
    adminVolver($aqui, 'ok', $id ? 'Cambios guardados.' : "{$datos['nombre']} se agregó al directorio.");
}

$todos = medicos();
$esps = especialidades();
$editando = null;
foreach ($todos as $med) if (isset($_GET['editar']) && (string) $med['id'] === $_GET['editar']) { $editando = $med; break; }
$abierto = $editando !== null || is_string($_GET['nuevo'] ?? null);   // ?nuevo abre el formulario vacío

$fotoUrl = fn(array $med): string => $med['foto'] !== '' ? u(miniatura($med['foto'])) : '';
$pisoDe = fn(?array $med): string => $med === null ? '' : ($med['piso'] !== '' ? $med['piso'] : (string) (ubicacion($med['consultorio'])['piso'] ?? ''));
$consultoriosDe = fn(?array $med): string => $med === null ? '' : ($med['consultorios'] !== '' ? $med['consultorios'] : implode(', ', ubicacion($med['consultorio'])['puertas']));
$datosDe = fn(array $med): string => json_encode([
    'id' => (int) $med['id'], 'nombre' => $med['nombre'], 'telefono' => $med['telefono'], 'piso' => $pisoDe($med), 'consultorios' => $consultoriosDe($med), 'consultorio_original' => $med['consultorio'],
    'especialidades' => array_map(fn(array $x) => (int) $x['id'], $med['especialidades']), 'foto_url' => $fotoUrl($med),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$ed = $editando;   // abreviatura para la plantilla
$idsEd = $ed ? array_map(fn(array $x) => (int) $x['id'], $ed['especialidades']) : [];
$conFoto = $ed !== null && $ed['foto'] !== '';

ob_start(); ?>
  <details class="panel ficha" id="ficha"<?= adminAttr($abierto, 'open') ?><?= $ed ? ' data-editando="' . e($ed['id']) . '"' : '' ?>>
    <summary>
      <h2 class="titulo">
        <span data-solo-nuevo<?= adminAttr($ed !== null, 'hidden') ?>>Agregar un médico</span>
        <span data-solo-edicion<?= adminAttr($ed === null, 'hidden') ?>>Editar a <span data-texto="nombre"><?= e($ed['nombre'] ?? '') ?></span></span>
      </h2>
      <i class="mas" aria-hidden="true"></i>
    </summary>
    <div class="ficha__cuerpo">
      <form method="post" action="<?= e($aqui) ?>" enctype="multipart/form-data">
        <input type="hidden" name="id" value="<?= e($ed['id'] ?? '') ?>" />
        <input type="hidden" name="consultorio_original" value="<?= e($ed['consultorio'] ?? '') ?>" />
        <div class="form-grid">
          <label class="campo"><span>Nombre</span><input class="input" name="nombre" required maxlength="120" autocomplete="off" value="<?= e($ed['nombre'] ?? '') ?>"<?= adminAttr($abierto, 'autofocus') ?> /><small>Con el título, por ejemplo «Dra. Ana Pérez».</small></label>
          <label class="campo"><span>Teléfono</span><input class="input" name="telefono" type="tel" inputmode="tel" maxlength="40" autocomplete="off" value="<?= e($ed['telefono'] ?? '') ?>" /><small>Opcional. Por ejemplo 0414-1234567.</small></label>
          <label class="campo"><span>Piso</span>
            <select class="select" name="piso" required>
              <option value="">Selecciona un piso</option>
<?php foreach (PISOS as $pisoId => $pisoNombre): ?>
              <option value="<?= e($pisoId) ?>"<?= adminAttr((string) $pisoId === $pisoDe($ed), 'selected') ?>><?= e($pisoNombre) ?></option>
<?php endforeach ?>
            </select>
          </label>
          <label class="campo"><span>Consultorio(s)</span><input class="input" name="consultorios" maxlength="80" autocomplete="off" inputmode="text" value="<?= e($consultoriosDe($ed)) ?>" pattern="\d{1,3}\s*[ABab]?(?:\s*[,;]\s*\d{1,3}\s*[ABab]?)*" /><small>Opcional. Escribe 28, 28A o varios separados por coma: 13, 14, 14B.</small></label>
          <fieldset class="full">
            <legend>Especialidades (elige al menos una)</legend>
            <div class="checks">
<?php foreach ($esps as $x): ?>
              <label class="check"><input type="checkbox" name="especialidades[]" value="<?= e($x['id']) ?>"<?= adminAttr(in_array((int) $x['id'], $idsEd, true), 'checked') ?> /><?= e($x['nombre']) ?></label>
<?php endforeach ?>
            </div>
          </fieldset>
          <div class="full foto">
            <img class="foto__vista" alt="Foto del médico" width="72" height="72"<?= $ed ? ' src="' . e($fotoUrl($ed)) . '"' : '' ?><?= adminAttr(!$conFoto, 'hidden') ?> data-si="foto_url" data-src="foto_url" />
            <div class="campo">
              <label for="foto">Foto (opcional)</label>
              <input class="input" id="foto" type="file" name="foto" accept="image/webp,image/jpeg,image/png" />
              <small>Se reduce a 480 × 480 en tu navegador antes de enviarla.</small>
              <label class="check" data-si="foto_url"<?= adminAttr(!$conFoto, 'hidden') ?>><input type="checkbox" name="quitar_foto" value="1" />Quitar la foto actual</label>
            </div>
          </div>
        </div>
        <div class="acciones">
          <button class="btn btn--primary" type="submit" name="accion" value="guardar">Guardar médico</button>
          <a class="btn btn--outline" href="<?= e($aqui) ?>" data-solo-edicion<?= adminAttr($ed === null, 'hidden') ?>>Cancelar</a>
        </div>
      </form>

      <details class="borrar" data-solo-edicion<?= adminAttr($ed === null, 'hidden') ?>>
        <summary>Borrar este médico</summary>
        <form method="post" action="<?= e($aqui) ?>">
          <input type="hidden" name="id" value="<?= e($ed['id'] ?? '') ?>" />
          <p>¿Borrar a <b data-texto="nombre"><?= e($ed['nombre'] ?? '') ?></b>? Se quita del directorio. Si tiene una cuenta de usuario, la cuenta se mantiene pero queda sin ficha vinculada. No se puede deshacer.</p>
          <button class="btn btn--navy" type="submit" name="accion" value="borrar">Sí, borrar</button>
        </form>
      </details>
    </div>
  </details>

  <section class="panel" aria-labelledby="lista-t">
    <div class="panel__head">
      <h2 id="lista-t"><span data-cuenta-de="#cuerpo"><?= count($todos) ?></span> <?= adminPl(count($todos), 'médico', 'médicos') ?> en el directorio</h2>
      <div class="filtro" role="search">
        <label class="sr-only" for="buscar">Buscar un médico</label>
        <input class="input" id="buscar" type="search" data-filtra="#cuerpo" placeholder="Buscar por nombre o especialidad" autocomplete="off" />
      </div>
    </div>
    <div class="table-wrap">
      <table class="table adm-tabla">
        <thead><tr><th scope="col">Médico</th><th scope="col">Especialidades</th><th scope="col">Consultorio</th><th scope="col">Teléfono</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody id="cuerpo">
<?php foreach ($todos as $med):
    $nombresEsp = array_map(fn(array $x) => $x['nombre'], $med['especialidades']);
?>
          <tr data-id="<?= e($med['id']) ?>" data-ficha="<?= e($datosDe($med)) ?>" data-clave="<?= e(adminFicha($med['nombre'], ...$nombresEsp, ...[$med['consultorio']])) ?>">
            <td data-label="Médico"><span class="quien"><?= $med['foto'] !== '' ? '<img src="' . e($fotoUrl($med)) . '" alt="" width="40" height="40" loading="lazy" decoding="async" />' : '<span class="ini" aria-hidden="true">' . e(iniciales($med['nombre'])) . '</span>' ?><?= e($med['nombre']) ?></span></td>
            <td data-label="Especialidades"><?= e(implode(', ', $nombresEsp)) ?></td>
            <td data-label="Consultorio"><?= $med['consultorio'] !== '' ? e(adminCapital(ubicacion($med['consultorio'])['texto'])) : '<span class="sin">Sin dato</span>' ?></td>
            <td data-label="Teléfono"><?= $med['telefono'] !== '' ? e($med['telefono']) : '<span class="sin">Sin dato</span>' ?></td>
            <td class="acc"><a href="<?= e($aqui . '?editar=' . $med['id'] . '#ficha') ?>" aria-label="<?= e('Editar a ' . $med['nombre']) ?>">Editar</a></td>
          </tr>
<?php endforeach ?>
        </tbody>
      </table>
    </div>
    <p class="adm-vacio" data-vacio-de="#cuerpo" hidden>Ningún médico coincide con esa búsqueda. Prueba con otra palabra.</p>
  </section>
<?php
adminMarco('Médicos', 'medicos', ob_get_clean(), $yo, 'El directorio que ven los pacientes. Registra piso, consultorio, teléfono y foto de cada médico.');
