# Versión PHP + MariaDB (hosting compartido del profesor)

El hosting del profesor (Webuzo, usuario sin root) solo corre **Apache 2.4, PHP 8.5 y MariaDB 11.8**: no hay Node ni terminal.
Esta versión mantiene el sitio de Astro como HTML estático y pasa a PHP todo lo que necesita servidor.

## Cómo encaja

```
public_html/
  index.html, nosotros/, servicios/, especialidades/, directorio/, afiliacion/, 404.html, _astro/ …   ← Astro (npm run build:php), HTML estático
  .htaccess  index.php                                                                              ← php/ (controlador frontal)
  app/                                                                                              ← php/app/ (código, bloqueado por .htaccess)
      boot.php auth.php shell.php lib/*.php api/*.php pages/**.php sql/*.sql shell/*.html
../policlinica-config.php                                                                           ← credenciales de la base (fuera de public_html)
```

* **Páginas públicas** (portada, servicios, especialidades, directorio, nosotros, afiliación): HTML estático compilado con los datos de ejemplo (125 médicos).
  Un script del navegador (`src/components/directorio/vivo.ts`) pide `/api/directorio` y refresca las listas con la base real. La cuenta de la portada y el edificio se refrescan al recompilar.
* **Zonas privadas** (`/acceso/`, `/panel/`, `/medico/`, `/secretaria/`, `/admin/…`): las dibuja PHP. El marco (cabecera, CSS, scripts) sale de Astro:
  `npm run build:php` genera `dist/shell/<zona>/index.html` con marcas `@@TITULO@@ @@ZONA@@ @@USUARIO_NOMBRE@@ @@USUARIO_ROL@@ @@HEAD@@ @@CONTENIDO@@`
  y el empaquetado lo copia a `app/shell/<zona>.html`. `pagina()` (app/shell.php) rellena las marcas.
* **Zonas de marco:** `acceso` (sin barra de usuario), `panel`, `medico`, `secretaria`, `admin`.
* **API:** `/api/sesion`, `/api/espera`, `/api/cola`, `/api/senal`, `/api/directorio`, `/fotos/<id>`.

## Reglas de código

* PHP 8.1+ (se prueba con 8.5), `declare(strict_types=1);`, funciones sueltas en español como las del TypeScript original. Sin Composer ni dependencias. Sin la extensión `intl` (usar `clave()` de boot.php).
* Base de datos: solo con los ayudantes de `boot.php`: `fila()`, `filas()`, `valor()`, `ejecutar()`, `ultimoId()`, `db()` (PDO, parámetros posicionales `?`). Nunca concatenar datos en el SQL. Fechas en UTC como texto `AAAA-MM-DD HH:MM:SS`.
* Salida HTML: siempre `e()` para todo lo que venga de la base o del usuario. `u('/ruta')` se deja por paridad con las plantillas de Astro (la base del sitio es `/`).
* Páginas: cada archivo de `app/pages/` hace `$yo = exigir([...roles]);`, procesa su POST (y termina con `redirigir()`), y al final arma el HTML del `<main>` con `ob_start()` y llama `pagina($zona, $titulo, $rotuloZona, $html, $yo, $head)`.
* Los mensajes de aviso viajan en la URL como en Astro: `?ok=…` y `?error=…` (usar `avisoUrl()`).
* El marcado (clases CSS, atributos `data-…`, `aria-…`, ids) debe ser **idéntico** al de la plantilla de Astro que se porta: los scripts y el CSS del marco dependen de él.
  Los textos, mensajes de error y validaciones también se copian tal cual.
* Los formularios con varias casillas del mismo nombre usan `name="especialidades[]"` (PHP) en lugar de `name="especialidades"`.
* Sin CSRF por token: `index.php` ya rechaza POST de otros orígenes (`exigirMismoOrigen()`) y la cookie es SameSite=Lax.

## Biblioteca (app/lib/*.php), equivalente a src/lib/*.ts

Cada función hace lo mismo que la de TypeScript del mismo nombre (mismos textos de error, mismas reglas). Las «filas» son arrays asociativos con las mismas claves que las interfaces de TypeScript. La base es implícita (`db()`).

**lib/sitio.php** (de src/lib/sitio.ts): `PISOS` (const array `['3' => '3er piso', '2' => '2do piso', '1' => '1er piso', 'pb' => 'Planta baja', 's' => 'Sótano']`), `telHref(string): string`, `waHref(string $mensaje = ''): string`,
`iniciales(string): string`, `estaAbierto(...)`, `fechaCaracas(string|DateTimeImmutable, string $formato…)`, `duracion(?string $desde, ?string $hasta): string`, `esperando(string $creada): string`, `ubicacion(string $consultorio): array` (`['piso' => ?string, 'puertas' => string[], 'texto' => string]`), `miniatura(string $foto): string`.

**lib/medicos.php** (de src/lib/db.ts):
`especialidades(): array` (`id, slug, nombre, total`; orden por clave) ·
`medicos(array $f = []): array` (`$f['q']`, `$f['esp']`; cada médico: `id, nombre, telefono, consultorio, piso, consultorios, foto, especialidades => [['id','slug','nombre'], …]`) ·
`medico(int $id): ?array` · `resumen(): array` (`medicos, especialidades, conMedicos, top`) · `retratosDelDia(int $n = 12, ?DateTimeImmutable $hoy = null): array` ·
`tituloMedico(string): string` · `validarMedico(array $post): array|string` (devuelve el dato limpio o el mensaje de error; lee `especialidades[]`) ·
`guardarMedico(array $m, ?int $id = null): int` · `borrarMedico(int $id): void` · `guardarFoto(int $id, array $archivo): ?string` (`$archivo` = entrada de `$_FILES`) · `quitarFoto(int $id): void` · `foto(int $id): ?array` (`tipo, datos`) ·
`crearEspecialidad(string): ?string` · `editarEspecialidad(int $id, string): ?string` · `borrarEspecialidad(int $id): ?string` (error en texto o null).

**lib/usuarios.php** (de src/lib/usuarios.ts):
`cedula(string): ?string` · `usuarios(array $f = []): array` (`rol`, `q`) · `usuario(int $id): ?array` · `porLogin(string $login): ?array` (`id, rol, clave_hash, version, activo`) ·
`validarUsuario(array $post, bool $nuevo): array|string` · `validarCliente(array $post): array|string` · `guardarUsuario(array $u, ?int $id = null): int|string` (id o mensaje de error) ·
`borrarUsuario(int $id, int $actorId): ?string` (pone `consultas.medico_id` en NULL antes de borrar a un médico: MariaDB no admite ON DELETE SET NULL con la columna generada) ·
`edad(?string $nacimiento, ?DateTimeImmutable $hoy = null): ?int` · `resumenAdmin(): array`.
Al guardar con `clave` se usa `hashClave()` de auth.php. Campos de usuario: `id, rol, nombre, correo, cedula, activo, medico_id, telefono, nacimiento, direccion, afiliacion_vence, creado`.

**lib/tele.php** (de src/lib/tele.ts): `entrar(int $clienteId, string $motivo = ''): ?string` · `estado(int $clienteId): ?array` (`id, estado, sala, creada, atendida, medico, posicion`) · `cancelar(int $clienteId): void` ·
`cola(int $medicoId): array` (`['espera' => [...], 'enCurso' => [...]]`; cada fila `id, motivo, creada, paciente, edad` y en `enCurso` también `sala`) · `salaVideo(): string` (`pm-` + 24 caracteres `[a-z0-9]`) ·
`atender(int $consultaId, int $medicoId, string $sala): bool` · `finalizar(int $consultaId, int $medicoId, string $diagnostico): ?string` · `historial(array $f = []): array` (`clienteId`, `medicoId`) · `aFecha()` está en boot.php.

**lib/senal.php** (señalización de la videollamada por sondeo corto sobre MariaDB; el hosting no admite conexiones largas):
`salaDe(string $sala, int $usuarioId): ?string` (rol `medico`/`cliente` si el usuario participa en una consulta `atendiendo` con esa sala; si no, null) ·
`senalSondear(string $sala, string $rol, string $sesion, int $desde): array` (registra presencia, avisa `presente` a los dos lados cuando uno entra o cambia de sesión, devuelve `[['id','tipo','datos'], …]` con `id > $desde`) ·
`senalEnviar(string $sala, string $rol, string $tipo, mixed $datos): bool`.

**auth.php** (ya escrito): `ROLES`, `inicioDe($rol)`, `hashClave()`, `verificarClave()`, `abrirSesion($u)`, `cerrarSesion()`, `usuarioActual()`, `exigir($roles, $api = false)`, `permitirIntento($ip)`, `ipCliente()`.

## API (app/api/*.php) — mismos contratos que src/server/api/*.ts

* `POST /api/sesion`: `usuario` (correo o cédula) + `clave` [+ `volver`] → abre la sesión y 303 al panel de su rol (`inicioDe`); `volver` solo vale si empieza por ese panel y no contiene `//`.
  Fallos: 303 a `/acceso/?error=datos` o `?error=limite` (5 intentos por minuto e IP, `permitirIntento(ipCliente())`). `accion=salir` → cierra y 303 a `/acceso/?salio=1`.
* `GET /api/espera` (rol cliente): `{"consulta": estado()|null}` y es el latido. `POST` `accion=entrar` [+`motivo`] | `accion=cancelar` → 303 a `/panel/` (o `/panel/?error=…`).
* `GET /api/cola` (rol médico): JSON de `cola()`. `POST` `accion=atender` + `consulta` | `accion=finalizar` + `consulta` + `diagnostico` → 303 a `/medico/?atendiendo=<id>` / `/medico/` o `/medico/?error=…`.
* `GET /api/senal?sala=…&sesion=…&desde=N` (roles médico y cliente) → `{"mensajes": [...]}` o `{"fin": true}` si la consulta ya no está en curso. `POST` JSON `{sala, tipo, datos}` con `tipo` en `oferta|respuesta|ice|salir` → 204.
* `GET /api/directorio` (público, con ETag): `{"especialidades": [{id,slug,nombre,total}], "medicos": [{id,nombre,telefono,consultorio,piso,consultorios,foto,especialidades:[{id,slug,nombre}]}]}`.
* `GET /fotos/<id>`: la foto subida desde el admin, con `Cache-Control: public, max-age=31536000, immutable`.

## Pruebas locales (Docker: MariaDB 11.8 + PHP 8.5)

```bash
node tools/php-env.mjs up                       # una vez: MariaDB en el puerto 3307 y la imagen pm-php
PM_ID=mia node tools/php-env.mjs test libs.php  # corre php/tests/libs.php contra una base limpia (policlinica_mia_test)
PM_ID=mia PM_PORT=8091 node tools/php-env.mjs serve   # sitio en http://localhost:8091 con php/ (usa marcos mínimos si no hay app/shell)
```
`PM_ID` aísla bases, carpetas y contenedores: cada quien usa el suyo. Los archivos de prueba empiezan con `require __DIR__ . '/../app/boot.php';`, migran con `migrar()` y terminan con `echo "ok · …\n"`; cualquier fallo debe terminar con código distinto de 0 (`assert` o `exit(1)`).
Tras `serve` se prueba con `curl`: el primer paso es `curl http://localhost:PUERTO/instalar?token=token-de-prueba` (crea tablas, médicos y el admin `admin@prueba.test` / `Prueba-local-123`).
