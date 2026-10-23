<?php
// /admin/usuarios/ · todas las cuentas (administradores, médicos y clientes): alta, edición, desactivar y borrar.
// Mismo esquema que /admin/medicos/: POST real en servidor (303 con ?ok=/?error=). Equivale a src/pages/admin/usuarios.astro.
// ?nuevo=cliente|medico|admin abre el formulario vacío con ese rol.
// Si guardar falla no se redirige: el formulario vuelve con lo escrito (menos la contraseña) y marca solo el campo que falló.
declare(strict_types=1);

$yo = exigir(['admin']);
$aqui = u('/admin/usuarios/');

$previo = null;
$fallo = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = adminNum($_POST['id'] ?? '');
    $otra = $id ? "&editar=$id" : '';
    if (($_POST['accion'] ?? '') === 'borrar') {
        $error = borrarUsuario($id, $yo['id']);
        $error ? adminVolver($aqui, 'error', $error, $otra) : adminVolver($aqui, 'ok', 'El usuario se borró.');
    }
    $datos = validarUsuario($_POST, !$id);
    $r = is_string($datos) ? $datos : guardarUsuario($datos, $id ?: null);
    if (!is_string($r)) adminVolver($aqui, 'ok', $id ? 'Cambios guardados.' : "{$datos['nombre']} ya tiene su usuario.");
    $previo = $_POST;
    $fallo = $r;
}

$todos = usuarios();
$directorio = medicos();
$editando = null;
$editarId = $previo !== null ? (string) ($previo['id'] ?? '') : (is_string($_GET['editar'] ?? null) ? $_GET['editar'] : '');
foreach ($todos as $x) if ($editarId !== '' && (string) $x['id'] === $editarId) { $editando = $x; break; }
$nuevo = is_string($_GET['nuevo'] ?? null) ? $_GET['nuevo'] : null;
$abierto = $editando !== null || $nuevo !== null || $previo !== null;
$rolInicial = $previo !== null ? (string) ($previo['rol'] ?? '') : ($editando['rol'] ?? ($nuevo !== null && isset(ROLES[$nuevo]) ? $nuevo : 'cliente'));
$campo = $fallo !== null ? campoDelError($fallo) : null;
// lo escrito si el guardado falló; si no, lo que tiene guardado el usuario que se edita
$val = fn(string $k): string => $previo !== null ? (is_scalar($previo[$k] ?? null) ? (string) $previo[$k] : '') : (string) ($editando[$k] ?? '');
$medicoElegido = $val('medico_id');
$activo = $previo !== null ? isset($previo['activo']) : ($editando ? (int) $editando['activo'] === 1 : true);
$hoy = gmdate('Y-m-d');
$nombreMedico = array_column($directorio, 'nombre', 'id');
$datosDe = fn(array $x): string => json_encode([
    'id' => (int) $x['id'], 'rol' => $x['rol'], 'nombre' => $x['nombre'], 'correo' => $x['correo'], 'cedula' => $x['cedula'] ?? '', 'telefono' => $x['telefono'],
    'nacimiento' => $x['nacimiento'] ?? '', 'direccion' => $x['direccion'], 'afiliacion_vence' => $x['afiliacion_vence'] ?? '', 'medico_id' => $x['medico_id'] === null ? '' : (int) $x['medico_id'],
    'activo' => (int) $x['activo'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$ed = $editando;   // abreviatura para la plantilla

ob_start(); ?>
  <details class="panel ficha" id="ficha"<?= adminAttr($abierto, 'open') ?><?= $ed ? ' data-editando="' . e($ed['id']) . '"' : '' ?>>
    <summary>
      <h2 class="titulo">
        <span data-solo-nuevo<?= adminAttr($ed !== null, 'hidden') ?>>Agregar un usuario</span>
        <span data-solo-edicion<?= adminAttr($ed === null, 'hidden') ?>>Editar a <span data-texto="nombre"><?= e($ed['nombre'] ?? '') ?></span></span>
      </h2>
      <i class="mas" aria-hidden="true"></i>
    </summary>
    <div class="ficha__cuerpo">
      <form method="post" action="<?= e($aqui) ?>">
        <input type="hidden" name="id" value="<?= e($ed['id'] ?? '') ?>" />
        <div class="form-grid">
          <label class="campo"><span>Rol</span>
            <select class="select" name="rol" required<?= adminAttr($abierto && $campo === null, 'autofocus') ?><?= marcaCampo($campo, 'rol') ?>>
<?php foreach (ROLES as $v => $nombre): ?>
              <option value="<?= e($v) ?>"<?= adminAttr($v === $rolInicial, 'selected') ?>><?= e($nombre) ?></option>
<?php endforeach ?>
            </select>
          </label>
          <label class="campo"><span>Nombre completo</span><input class="input" name="nombre" required minlength="3" maxlength="120" autocomplete="off" value="<?= e($val('nombre')) ?>"<?= marcaCampo($campo, 'nombre') ?> /></label>
          <label class="campo"><span>Correo electrónico</span><input class="input" name="correo" type="email" required maxlength="120" autocomplete="off" value="<?= e($val('correo')) ?>"<?= marcaCampo($campo, 'correo') ?> /><small>Con el correo o la cédula entra a su panel.</small></label>
          <label class="campo"><span>Cédula</span><input class="input" name="cedula" maxlength="20" autocomplete="off" pattern="<?= e(PATRON_CEDULA) ?>" title="Por ejemplo V-12345678" value="<?= e($val('cedula')) ?>"<?= marcaCampo($campo, 'cedula') ?> /><small>Por ejemplo V-12345678. Obligatoria para los clientes.</small></label>
          <label class="campo"><span>Teléfono</span><input class="input" name="telefono" type="tel" inputmode="tel" maxlength="40" autocomplete="off" pattern="<?= e(PATRON_TELEFONO) ?>" title="Solo números, espacios, guiones y paréntesis" value="<?= e($val('telefono')) ?>"<?= marcaCampo($campo, 'telefono') ?> /></label>
          <label class="campo"><span>Fecha de nacimiento</span><input class="input" name="nacimiento" type="date" max="<?= e($hoy) ?>" value="<?= e($val('nacimiento')) ?>"<?= marcaCampo($campo, 'nacimiento') ?> /></label>
          <label class="campo full"><span>Dirección</span><input class="input" name="direccion" maxlength="200" autocomplete="off" value="<?= e($val('direccion')) ?>" /></label>
          <label class="campo" data-rol="cliente"><span>Afiliación vigente hasta</span><input class="input" name="afiliacion_vence" type="date" value="<?= e($val('afiliacion_vence')) ?>"<?= marcaCampo($campo, 'afiliacion_vence') ?> /><small>Solo clientes. Si la fecha pasó, no puede entrar a la videollamada.</small></label>
          <label class="campo" data-rol="medico"><span>Ficha en el directorio</span>
            <select class="select" name="medico_id">
              <option value="">Sin vincular</option>
<?php foreach ($directorio as $m): ?>
              <option value="<?= e($m['id']) ?>"<?= adminAttr($medicoElegido !== '' && (string) $m['id'] === $medicoElegido, 'selected') ?>><?= e($m['nombre']) ?></option>
<?php endforeach ?>
            </select>
            <small>Solo médicos. Une su cuenta con su ficha del directorio.</small>
          </label>
          <label class="campo"><span>Contraseña</span><input class="input" name="clave" type="password" minlength="8" autocomplete="new-password"<?= adminAttr($ed === null, 'required') ?> data-req-nuevo<?= marcaCampo($campo, 'clave') ?> /><small>Mínimo 8 caracteres. Al editar, déjala en blanco para no cambiarla. Si cambias tu propia contraseña, tendrás que volver a entrar.<?= $fallo !== null && $ed === null ? ' Por seguridad, escríbela de nuevo.' : '' ?></small></label>
          <label class="check" data-solo-edicion<?= adminAttr($ed === null, 'hidden') ?>><input type="checkbox" name="activo" value="1"<?= adminAttr($activo, 'checked') ?> /><span>Usuario activo<small> Si lo desmarcas, no podrá iniciar sesión. Si es tu propia cuenta, saldrás de inmediato.</small></span></label>
        </div>
        <div class="acciones">
          <button class="btn btn--primary" type="submit" name="accion" value="guardar">Guardar usuario</button>
          <a class="btn btn--outline" href="<?= e($aqui) ?>" data-solo-edicion<?= adminAttr($ed === null, 'hidden') ?>>Cancelar</a>
        </div>
      </form>

      <details class="borrar" data-solo-edicion<?= adminAttr($ed === null, 'hidden') ?>>
        <summary>Borrar este usuario</summary>
        <form method="post" action="<?= e($aqui) ?>">
          <input type="hidden" name="id" value="<?= e($ed['id'] ?? '') ?>" />
          <p>¿Borrar a <b data-texto="nombre"><?= e($ed['nombre'] ?? '') ?></b>? Pierde el acceso. Si es un cliente, su historial de consultas también se borra. No se puede deshacer. Para quitarle el acceso sin borrarlo, desmarca «Usuario activo».</p>
          <button class="btn btn--navy" type="submit" name="accion" value="borrar">Sí, borrar</button>
        </form>
      </details>
    </div>
  </details>

  <section class="panel" aria-labelledby="lista-t">
    <div class="panel__head">
      <h2 id="lista-t"><span data-cuenta-de="#cuerpo"><?= count($todos) ?></span> <?= adminPl(count($todos), 'usuario', 'usuarios') ?></h2>
      <div class="filtro" role="search">
        <label class="sr-only" for="buscar">Buscar un usuario</label>
        <input class="input" id="buscar" type="search" data-filtra="#cuerpo" placeholder="Nombre, correo, cédula o rol" autocomplete="off" />
      </div>
    </div>
    <div class="table-wrap">
      <table class="table adm-tabla">
        <thead><tr><th scope="col">Usuario</th><th scope="col">Rol</th><th scope="col">Correo</th><th scope="col">Cédula</th><th scope="col">Estado</th><th scope="col">Ficha del directorio</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody id="cuerpo">
<?php foreach ($todos as $x):
    $sinCedula = $x['cedula'] === null || $x['cedula'] === '';
?>
          <tr data-id="<?= e($x['id']) ?>" data-ficha="<?= e($datosDe($x)) ?>" data-clave="<?= e(adminFicha($x['nombre'], $x['correo'], (string) $x['cedula'], ROLES[$x['rol']])) ?>">
            <td data-label="Usuario"><b class="nombre"><?= e($x['nombre']) ?></b></td>
            <td data-label="Rol"><?= e(ROLES[$x['rol']]) ?></td>
            <td data-label="Correo"><?= e($x['correo']) ?></td>
            <td data-label="Cédula"><?= $sinCedula ? '<span class="sin">Sin cédula</span>' : e($x['cedula']) ?></td>
            <td data-label="Estado"><?= (int) $x['activo'] === 1 ? 'Activo' : '<span class="estado">Inactivo</span>' ?></td>
            <td data-label="Ficha"><?= $x['rol'] !== 'medico' ? '<span class="sin">No aplica</span>' : ($x['medico_id'] !== null ? e($nombreMedico[$x['medico_id']] ?? '') : '<span class="sin">Sin vincular</span>') ?></td>
            <td class="acc"><a href="<?= e($aqui . '?editar=' . $x['id'] . '#ficha') ?>" aria-label="<?= e('Editar a ' . $x['nombre']) ?>">Editar</a></td>
          </tr>
<?php endforeach ?>
        </tbody>
      </table>
    </div>
    <p class="adm-vacio" data-vacio-de="#cuerpo" hidden>Ningún usuario coincide con esa búsqueda.</p>
  </section>
<?php
adminMarco('Usuarios', 'usuarios', ob_get_clean(), $yo, 'Quién puede entrar al sitio y con qué rol: administradores, médicos que atienden la telemedicina y clientes afiliados.', $fallo);
