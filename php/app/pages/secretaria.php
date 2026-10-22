<?php
// /secretaria/ · alta acotada de clientes. Equivale a src/pages/secretaria/index.astro.
// La autorización es exigir(['secretaria']) y validarCliente() fuerza rol = cliente (descarta rol, medico_id y activo).
declare(strict_types=1);

$yo = exigir(['secretaria']);
$aqui = u('/secretaria/');
$volver = fn(string $clave, string $texto): never => redirigir($aqui . '?' . $clave . '=' . rawurlencode($texto));

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $datos = validarCliente($_POST);
    if (is_string($datos)) $volver('error', $datos);
    $creado = guardarUsuario($datos);
    if (is_string($creado)) $volver('error', $creado);
    $volver('ok', $datos['nombre'] . ' quedó inscrito como cliente.');
}

[$ok, $error] = avisoUrl();

ob_start();
?>
<section class="registro" aria-labelledby="registro-t">
    <header class="registro__cab">
      <p class="registro__eyebrow">Inscripción de afiliados</p>
      <h1 id="registro-t">Registrar un nuevo cliente</h1>
      <p>Esta cuenta podrá entrar al panel de cliente y a la sala de espera de telemedicina. No tienes acceso a historiales, médicos ni datos de otros clientes.</p>
    </header>

<?php if ($error !== null && $error !== ''): ?>
    <p class="alert alert--error" role="alert"><?= e($error) ?></p>
<?php endif ?>
<?php if ($ok !== null && $ok !== ''): ?>
    <p class="alert alert--ok" role="status"><?= e($ok) ?></p>
<?php endif ?>

    <form class="registro__form" method="post" action="<?= e($aqui) ?>">
      <div class="form-grid">
        <label class="campo"><span>Nombre completo</span><input class="input" name="nombre" required maxlength="120" autocomplete="name" autofocus><small>Como aparecerá en su historial y en la sala de espera.</small></label>
        <label class="campo"><span>Cédula</span><input class="input" name="cedula" required maxlength="20" autocomplete="off" placeholder="V-12345678"><small>Obligatoria para los clientes.</small></label>
        <label class="campo"><span>Correo electrónico</span><input class="input" name="correo" type="email" required maxlength="120" autocomplete="email"></label>
        <label class="campo"><span>Teléfono</span><input class="input" name="telefono" type="tel" inputmode="tel" maxlength="40" autocomplete="tel" placeholder="0414-1234567"></label>
        <label class="campo"><span>Fecha de nacimiento</span><input class="input" name="nacimiento" type="date" autocomplete="bday"></label>
        <label class="campo"><span>Afiliación vigente hasta</span><input class="input" name="afiliacion_vence" type="date"><small>Opcional. Una fecha vencida bloquea la telemedicina.</small></label>
        <label class="campo full"><span>Dirección</span><input class="input" name="direccion" maxlength="200" autocomplete="street-address"></label>
        <label class="campo full"><span>Contraseña inicial</span><input class="input" name="clave" type="password" required minlength="8" autocomplete="new-password"><small>Mínimo 8 caracteres. Entrégala al cliente de forma segura.</small></label>
      </div>
      <div class="registro__acciones">
        <button class="btn btn--primary" type="submit">Inscribir cliente</button>
      </div>
    </form>
  </section>
<?php
pagina('secretaria', 'Inscribir cliente', 'Secretaría', (string) ob_get_clean(), $yo);
