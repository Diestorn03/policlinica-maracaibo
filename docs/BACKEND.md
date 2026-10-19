# Backend (ya hecho y probado con `npm test`) — contrato para las páginas

No reescribir `src/lib/*`, `src/middleware.ts`, `src/server/*`, `src/scripts/api.js`, `astro.config.mjs` ni `migrations/*`.
Si algo falta, se añade una función pequeña al módulo que corresponde y su caso en `tests/db.check.mjs`.

## DOS MODOS con el mismo código (manda sobre todo lo demás)
| | Servidor (Cloudflare Workers + D1) | Demo (`PUBLIC_DEMO=1`, GitHub Pages) — **lo que verá el profesor primero** |
|---|---|---|
| Build | `npm run build` | `PUBLIC_DEMO=1 npm run build` → `dist/` 100 % estático en `https://diestorn03.github.io/policlinica-maracaibo/` |
| Base de datos | D1 | SQLite en memoria al compilar: 125 médicos reales + usuarios y consultas de EJEMPLO (`src/lib/fuente-demo.ts`) |
| Páginas `prerender = false` | bajo demanda | se prerenderizan igual (astro.config lo fuerza): `Astro.url.searchParams` viene vacío, no hay POST ni cookies |
| `/api/*`, `/fotos/*` | existen (`src/server/`) | **no existen** |
| Sesión | middleware + `locals.usuario` | no hay: `usuarioDe(Astro.locals, rol)` da el usuario de ejemplo |
| Formularios privados | POST real | `src/scripts/api.js` los intercepta: tele se simula, el resto muestra "es una demo" |

Reglas para que una página funcione en los dos:
1. **Base de datos:** `import { getDB, u, DEMO, usuarioDe } from '../lib/entorno';` → `const db = await getDB();`. Nunca importar `cloudflare:workers` en páginas ni componentes.
2. **Enlaces y rutas internas SIEMPRE con `u()`:** `href={u('/directorio/')}`, `src={u(medico.foto)}`, `action={u('/api/cola')}`. Sin `u()` la demo de GitHub Pages rompe (vive bajo `/policlinica-maracaibo/`). Las imágenes de `astro:assets` ya llevan la base solas.
3. **`<html>` del layout lleva** `data-demo={DEMO ? '1' : undefined}` y `data-base={import.meta.env.BASE_URL}` (los lee `api.js`). El layout privado muestra, si `DEMO`, una franja fija: "Demostración: datos de ejemplo; nada se guarda." y carga `import '../scripts/api.js'`.
4. **Usuario en páginas privadas:** `const yo = usuarioDe(Astro.locals, 'admin' | 'medico' | 'cliente');` (en servidor, el de la sesión).
5. **Leer filtros/estado de la URL en el NAVEGADOR también** (`?q=&esp=` del directorio, `?error=`, `?ok=`, `?atendiendo=`): en la demo la página es estática, así que un `<script>` debe leer `location.search` y aplicar el filtro / mostrar el aviso. En servidor el HTML ya llega filtrado; el script es mejora (filtrado instantáneo).
6. **Manejar POST en el frontmatter solo si `Astro.request.method === 'POST'`** (en la demo nunca ocurre). Nada de rutas dinámicas en `/admin` (`[id]`): usar `?editar=<id>` (en la demo, el formulario de edición se rellena con JS desde `data-*` de la fila).
7. **Telemedicina en el navegador:** sondear con `espera()` / `cola()` y escuchar `alCambiar(fn)` de `src/scripts/api.js` (no hacer `fetch` a mano). En la demo, abrir `/panel/` y `/medico/` en dos pestañas se ven en vivo.
8. **`/acceso/` en la demo:** en lugar del formulario funcional, tres botones "Entrar como administrador / médico / cliente" (enlaces a sus paneles) y una nota de que es una demo; el formulario real se muestra en modo servidor.

## Reglas
- Páginas con datos de la base: `export const prerender = false;` + `getDB()` de `src/lib/entorno.ts` (ver arriba). Todo lo demás es estático.
- Contenido fijo: `src/data/site.ts` (clinica, anos(), servicios[] con `imagen` de astro:assets, testimonios, instalaciones, fotosInicio, afiliacion, nav).
  Imágenes de la clínica en `src/assets/img/` → usar `<Image>`/`<Picture>` de `astro:assets` (se optimizan al compilar).
  Fotos de médicos: `medico.foto` es una URL (`/medicos/x.jpg` estática 480×480 o `/fotos/<id>?v=…`) o `''` (sin foto → placeholder).
- Sesión: el middleware ya protege por rol `/admin/*` (admin), `/medico/*` (médico), `/panel/*` (cliente), `/api/cola` (médico), `/api/espera` (cliente).
  En esas páginas `Astro.locals.usuario` = `{ id, rol, nombre }` siempre existe. En `/acceso/` existe si ya hay sesión (→ redirigir a `inicioDe(rol)`).
- Formularios: POST normal (funciona sin JS). Astro bloquea POST de otro origen (CSRF). Después de un POST, redirigir (303) a la misma página
  con `?ok=…` o `?error=…` para que recargar no reenvíe el formulario. Escapar siempre (Astro lo hace con `{}`; nunca `set:html` con datos de usuario).
- Fechas de SQLite: UTC sin zona → `aFecha(s)` de `src/lib/tele.ts`, y mostrar con `Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', … })`.

## src/lib/db.ts — directorio médico
- `especialidades(db)` → `{ id, slug, nombre, total }[]` (total = nº de médicos), orden alfabético.
- `medicos(db, { q?, esp? })` → `{ id, nombre, telefono, consultorio, foto, especialidades: {id, slug, nombre}[] }[]`
  (`q` busca sin acentos en nombre del médico y de la especialidad; `esp` = slug exacto). 125 médicos.
- `medico(db, id)`, `validarMedico(formData)` → `MedicoInput | string(error)`; campos: `nombre`, `telefono`, `consultorio`, `especialidades` (varios valores = ids).
- `guardarMedico(db, input, id?)` → id · `borrarMedico(db, id)`
- `guardarFoto(db, id, file)` → `string(error) | null` (WebP/JPG/PNG ≤ 1 MB; en el admin reducir antes en el navegador a 480×480 WebP con canvas) · `quitarFoto(db, id)`
- `crearEspecialidad(db, nombre)` / `borrarEspecialidad(db, id)` → `string(error) | null` (no borra si tiene médicos)

## src/lib/usuarios.ts — usuarios con rol
- `ROLES` = `{ admin: 'Administrador', medico: 'Médico', cliente: 'Cliente afiliado' }`
- `usuarios(db, { rol?, q? })` → `Usuario[]` (`id, rol, nombre, correo, cedula, activo, medico_id, telefono, nacimiento, direccion, afiliacion_vence, creado`)
- `usuario(db, id)`
- `validarUsuario(formData, nuevo)` → `UsuarioInput | string`. Campos del form: `rol, nombre, correo, cedula, telefono, nacimiento (date), direccion,
  afiliacion_vence (date, clientes), medico_id (select de médicos del directorio, rol médico), clave (obligatoria al crear; vacía al editar = no cambia),
  activo (checkbox; solo al editar)`. Cédula obligatoria para clientes. Mostrar campos según el rol (con JS) pero que el server valide todo.
- `guardarUsuario(db, input, id?)` → `id | string(error)` (correo/cédula duplicados, último admin)
- `borrarUsuario(db, id, actorId)` → `string(error) | null` · `edad(nacimiento)` → años | null

## src/lib/tele.ts — telemedicina
- `estado(db, clienteId)` → `null | { id, estado: 'espera'|'atendiendo', posicion, enlace, medico, creada, atendida }`
- `cola(db, medicoId)` → `{ espera: [{ id, paciente, edad, motivo, creada }], enCurso: [{ …, enlace }] }`
- `historial(db, { clienteId? , medicoId? })` (ninguno = toda la clínica, para el admin) → `[{ id, estado, motivo, creada, atendida, finalizada, paciente, medico }]`
- `aFecha(s)` → Date

## Endpoints ya hechos (solo modo servidor: viven en `src/server/` y astro.config los inyecta)
| Ruta | Rol | Uso |
|---|---|---|
| `POST /api/sesion` | — | form `usuario` (correo o cédula), `clave`, `volver` (oculto, de `?volver=`) → 303 a su panel. `accion=salir` cierra sesión. Errores vuelven a `/acceso/?error=datos\|limite`; `?salio=1` tras salir |
| `GET /api/espera` | cliente | JSON `{ consulta }` (= `estado()`); además es el **latido**: llamarlo cada 4 s mientras está en la sala o lo sacan a los 5 min |
| `POST /api/espera` | cliente | `accion=entrar` + `motivo` (opcional) · `accion=cancelar` → 303 `/panel/` (o `/panel/?error=…`, p. ej. afiliación vencida) |
| `GET /api/cola` | médico | JSON = `cola()`; sondear cada 4 s |
| `POST /api/cola` | médico | `accion=atender` + `consulta` + `enlace` (vacío = Jitsi automático; o pegar uno de Google Meet) → 303 `/medico/?atendiendo=<id>` · `accion=finalizar` + `consulta` → `/medico/`; errores `/medico/?error=…` |
| `GET /fotos/<id>` | — | foto subida desde el admin |

## Flujo de telemedicina (lo que deben mostrar los paneles)
1. Cliente en `/panel/`: sin consulta activa → botón grande "Entrar a la videollamada" (+ motivo opcional) + historial.
2. En espera → pantalla de sala de espera: posición en la cola, tiempo esperando, "no cierres esta página", botón "Salir de la sala";
   JS sondea `/api/espera` cada 4 s; sin JS, `<meta http-equiv="refresh" content="10">` dentro de `<noscript>`.
3. Cuando `estado === 'atendiendo'` → aviso claro (título + vibración/sonido suave opcional) con botón "Entrar a la videollamada con <médico>" (`enlace`, target _blank, rel noopener).
4. Médico en `/medico/`: lista en vivo de la cola (paciente, edad, motivo, minutos esperando) con botón "Atender" (y campo opcional "Pegar enlace de Google Meet");
   sus consultas en curso con "Abrir videollamada" y "Finalizar"; su historial. Si `?atendiendo=<id>` → abrir/ofrecer el enlace de esa consulta.

## Local
Servidor de desarrollo: `npm run dev` (ya corriendo en http://localhost:4330; tarda ~1 min en arrancar). D1 local en `C:/pm-state` (ver `.env`).
Usuarios demo: admin@policlinica.test, medico@policlinica.test, cliente@policlinica.test — la contraseña es `DEMO_PASSWORD` en `.dev.vars`.
