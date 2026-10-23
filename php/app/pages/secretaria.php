<?php
// /secretaria/ · alta acotada de clientes. Equivale a src/pages/secretaria/index.astro.
// La autorización es exigir(['secretaria']) y validarCliente() fuerza rol = cliente (descarta rol, medico_id y activo).
// Con un error no se redirige: la página vuelve con lo escrito (menos la contraseña) y marca solo el campo que falló.
declare(strict_types=1);

$yo = exigir(['secretaria']);
$aqui = u('/secretaria/');
$volver = fn(string $clave, string $texto): never => redirigir($aqui . '?' . $clave . '=' . rawurlencode($texto));

$previo = null;
$fallo = null;
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $datos = validarCliente($_POST);
    $creado = is_string($datos) ? $datos : guardarUsuario($datos);
    if (!is_string($creado)) $volver('ok', $datos['nombre'] . ' quedó inscrito como cliente.');
    $previo = $_POST;
    $fallo = $creado;
    http_response_code(422);
}

[$ok, $error] = avisoUrl();
if ($fallo !== null) $error = mb_substr($fallo, 0, 240);
$campo = $fallo !== null ? campoDelError($fallo) : null;
$val = fn(string $k): string => is_scalar($previo[$k] ?? null) ? (string) $previo[$k] : '';
$hoy = gmdate('Y-m-d');

ob_start();
?>
<section class="registro" aria-labelledby="registro-t">
    <header class="registro__cab">
      <p class="registro__eyebrow">Inscripción de afiliados</p>
      <h1 id="registro-t">Registrar un nuevo cliente</h1>
      <p>Esta cuenta podrá entrar al panel de cliente y a la sala de espera de telemedicina. No tienes acceso a historiales, médicos ni datos de otros clientes.</p>
    </header>

<?php if ($error !== null && $error !== ''): ?>
    <p class="alert alert--error" id="aviso-error" role="alert"><?= e($error) ?></p>
<?php endif ?>
<?php if ($ok !== null && $ok !== ''): ?>
    <p class="alert alert--ok" role="status"><?= e($ok) ?></p>
<?php endif ?>

    <form class="registro__form" method="post" action="<?= e($aqui) ?>">
      <div class="form-grid">
        <label class="campo"><span>Nombre completo</span><input class="input" name="nombre" required minlength="3" maxlength="120" autocomplete="name"<?= $campo === null ? ' autofocus' : '' ?> value="<?= e($val('nombre')) ?>"<?= marcaCampo($campo, 'nombre') ?>><small>Como aparecerá en su historial y en la sala de espera.</small></label>
        <label class="campo"><span>Cédula</span><input class="input" name="cedula" required maxlength="20" autocomplete="off" placeholder="V-12345678" pattern="<?= e(PATRON_CEDULA) ?>" title="Por ejemplo V-12345678" value="<?= e($val('cedula')) ?>"<?= marcaCampo($campo, 'cedula') ?>><small>Obligatoria para los clientes.</small></label>
        <label class="campo"><span>Correo electrónico</span><input class="input" name="correo" type="email" required maxlength="120" autocomplete="email" value="<?= e($val('correo')) ?>"<?= marcaCampo($campo, 'correo') ?>></label>
        <label class="campo"><span>Teléfono</span><input class="input" name="telefono" type="tel" inputmode="tel" maxlength="40" autocomplete="tel" placeholder="0414-1234567" pattern="<?= e(PATRON_TELEFONO) ?>" title="Solo números, espacios, guiones y paréntesis" value="<?= e($val('telefono')) ?>"<?= marcaCampo($campo, 'telefono') ?>></label>
        <label class="campo"><span>Fecha de nacimiento</span><input class="input" name="nacimiento" type="date" autocomplete="bday" max="<?= e($hoy) ?>" value="<?= e($val('nacimiento')) ?>"<?= marcaCampo($campo, 'nacimiento') ?>></label>
        <label class="campo"><span>Afiliación vigente hasta</span><input class="input" name="afiliacion_vence" type="date" value="<?= e($val('afiliacion_vence')) ?>"<?= marcaCampo($campo, 'afiliacion_vence') ?>><small>Opcional. Una fecha vencida bloquea la telemedicina.</small></label>
        <label class="campo full"><span>Dirección</span><input class="input" name="direccion" maxlength="200" autocomplete="street-address" value="<?= e($val('direccion')) ?>"></label>
        <label class="campo full"><span>Contraseña inicial</span><input class="input" name="clave" type="password" required minlength="8" autocomplete="new-password"<?= marcaCampo($campo, 'clave') ?>><small>Mínimo 8 caracteres. Entrégala al cliente de forma segura.<?= $fallo !== null ? ' Por seguridad, escríbela de nuevo.' : '' ?></small></label>
      </div>
      <div class="registro__acciones">
        <button class="btn btn--primary" type="submit">Inscribir cliente</button>
      </div>
    </form>
  </section>
<?php
pagina('secretaria', 'Inscribir cliente', 'Secretaría', (string) ob_get_clean(), $yo);
