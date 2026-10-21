# Investigación de requisitos — feedback del profesor

**Fecha de investigación:** 2026-10-21
**Estado:** propuesta de requisitos y diseño; no se modificó código de aplicación, ni se descartó, confirmó, publicó o subió trabajo existente.

## Summary

La siguiente iteración debe mejorar la jerarquía y la interacción de las páginas públicas, conservar el modelo de datos y permisos ya probado, y separar de forma inequívoca la demostración estática de GitHub Pages de la aplicación real en Cloudflare Workers + D1. La página de Pages debe poder enseñar flujos ficticios al profesor, pero nunca debe presentarse como autenticación D1 segura ni como una videollamada clínica real.

**Decisión recomendada.** Mantener GitHub Pages como demostración estática y claramente rotulada; sustituir el concepto de “inicio de sesión” de la demo por un selector explícito de rol de demostración. Para video real, elegir **8x8 JaaS (Jitsi gestionado) mediante la IFrame API y JWT de vida corta emitido exclusivamente por Cloudflare Workers**, después de aprobar/provisionar la cuenta, dominio y privacidad del proveedor. El usuario no verá ni copiará un token ni tendrá un segundo formulario de Jitsi: el panel autenticado lo solicitará en memoria al Worker al entrar en una consulta ya asignada. Mientras esa infraestructura no exista y no se pruebe con dos navegadores, `meet.jit.si` público seguirá siendo solo una capacidad de demostración no clínica y Pages mostrará una limitación honesta, no un falso reproductor de video.

La pila queda bloqueada para esta propuesta: **Astro 7.4.1, TypeScript/CSS/JavaScript nativos, GSAP y Lenis ya instalados, Cloudflare Workers + D1 para el servidor, y Jitsi IFrame API contra JaaS para video real**. No se añadirá una dependencia npm para carruseles, autenticación, JWT o video; el Worker usará Web Crypto existente para firmar o el mecanismo documentado por JaaS.

## Evidence: verified facts versus assumptions

### Verified repository facts

| Evidencia inspeccionada | Hecho comprobado | Consecuencia para el requisito |
|---|---|---|
| `astro.config.mjs`, `package.json`, `.github/workflows/pages.yml` | `PUBLIC_DEMO=1` fuerza todas las rutas a prerenderizar, usa `src/lib/fuente-demo.ts`, no instala el adaptador Cloudflare y no inyecta `/api/sesion`, `/api/espera`, `/api/cola` ni `/fotos/*`. El workflow de Pages ejecuta `npm test` y `npm run build:demo`, y publica únicamente `dist`. | GitHub Pages no puede verificar cookies, ejecutar middleware, consultar D1 ni emitir secretos/tokens. Un login o video real no puede ser seguro allí. |
| `src/lib/entorno.ts`, `src/layouts/Privado.astro`, `src/scripts/api.js` | La demo usa datos compilados y `localStorage`; las acciones privadas se simulan en el navegador. La franja actual ya dice “Demostración: datos de ejemplo, nada se guarda.” | El estado demo es experiencia visual, no autorización. El artefacto no debe contener información clínica ni prometer persistencia. |
| Estado inicial y `git diff` actual | Hay un borrador sin confirmar en `src/scripts/api.js` y `src/layouts/Privado.astro`: agrega `pm-demo-sesion`, cuentas/roles de demostración, guarda de ruta y `data-demo-rol`. `/acceso/` todavía muestra enlaces directos a paneles y no invoca `entrarDemo()`. Con `localStorage` vacío, la guarda redirige esos enlaces de regreso a `/acceso/`; por tanto el borrador intermedio bloquea los paneles de Pages. | No se debe publicar ni integrar parcialmente ese diff. Esta investigación lo preserva intacto; la futura implementación debe completar el selector demo y la guarda como una unidad, o no activar la guarda. |
| `src/lib/auth.ts`, `src/middleware.ts`, `src/server/api/sesion.ts` | En modo Worker, la sesión real es una cookie HMAC `HttpOnly`, `Secure`, `SameSite=Lax`, de 12 horas; el middleware relee usuario/versión/activo desde D1 y aplica rutas por rol. El inicio real tiene límite por IP y rechaza redirecciones abiertas. | El flujo local/Cloudflare existente es la única autenticación real. La mejora demo no puede cambiar semántica, cookies, roles ni rutas del modo servidor. |
| `src/pages/secretaria/index.astro`, `src/lib/usuarios.ts`, `migrations/0005_secretaria.sql` | Secretaría tiene ruta propia; `validarCliente()` descarta `rol`, `medico_id` y `activo`, fuerza un cliente activo, y la migración conserva usuarios/consultas al agregar ese rol. | La inscripción de afiliados seguirá siendo exclusiva de Secretaría y se reforzará en servidor, no con campos ocultos ni lógica de demo. |
| `src/lib/db.ts`, `src/lib/sitio.ts`, pruebas | Médico conserva `piso` y `consultorios` estructurados; la validación acepta solo los pisos definidos y puertas `1–3` dígitos con sufijo A/B. Las pruebas cubren migraciones, 125 médicos, especialidades, filtros y una referencia histórica sin piso. | La UI debe consumir esos campos como fuente primaria, mantener el único registro histórico sin piso y no volver a convertir la ubicación en texto libre. |
| `src/lib/tele.ts`, `src/server/api/cola.ts`, `migrations/0007_sala_jitsi.sql`, pruebas | El servidor crea una sala opaca con CSPRNG, permite una consulta activa por cliente y una atendida por médico, y obliga diagnóstico de 3–1000 caracteres antes de finalizar. La migración conserva una sala Jitsi heredada y cancela estados incompatibles. | No se cambia el contrato clínico ni se guarda un token de video. La autorización de video se derivará de la consulta activa/propietario/asignación, no de la URL de una sala. |
| `src/scripts/jitsi.ts`, `src/components/tele/*` | Hoy se carga `https://meet.jit.si/external_api.js`, se pasa una sala opaca y nombres genéricos “Médico”/“Paciente”; en demo no se monta el iframe. | La experiencia actual es conveniente, pero el código no demuestra control de acceso por paciente/consulta en un servicio público. |
| `src/pages/index.astro`, `src/pages/servicios/[slug].astro`, `src/pages/especialidades.astro`, `src/pages/directorio/index.astro` | La portada ya tiene servicios separados en estudios/unidades, un edificio por piso/puerta, y el directorio conserva búsqueda `q`, especialidad `esp`, piso `piso` y restablecimiento. Especialidades ya separa datos con y sin médicos, pero su título principal está oculto y la jerarquía de escritorio es débil. “Otros servicios” hoy es una lista de enlaces sin rail. | Las mejoras deben extender patrones existentes y conservar filtros, enlaces con `u()`, contenidos reales, imágenes y comportamiento sin JavaScript. |
| `docs/BACKEND.md` frente a fuente/pruebas actuales | El documento contiene instrucciones antiguas: habla de tres roles, enlaces/Google Meet y demo sin sesión; el código actual incluye Secretaría, `sala` Jitsi y el borrador de sesión demo. | Para esta iteración, código, migraciones y pruebas son la fuente de verdad; `docs/BACKEND.md` debe actualizarse si se tocan sus afirmaciones. |

### Official Jitsi facts verified on 2026-10-21

Se consultaron únicamente las siguientes URLs públicas oficiales mediante solicitudes GET; no se transmitieron código del proyecto, credenciales ni datos de usuarios.

| Fuente oficial y fecha HTTP | Hecho verificado | Límite relevante |
|---|---|---|
| [Jitsi IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/) — `Last-Modified: 2026-10-13` | Documenta cargar `https://<dominio>/external_api.js` (incluido `https://meet.jit.si/external_api.js`) y crear `new JitsiMeetExternalAPI(domain, options)`. Sus opciones incluyen `roomName`, `userInfo` y `jwt` opcional. | La API permite pasar un JWT sin que el usuario lo escriba, pero no convierte por sí misma un artefacto estático en un emisor seguro de JWT. |
| [Jitsi Secure Domain](https://jitsi.github.io/handbook/docs/devops-guide/secure-domain/) — `Last-Modified: 2026-10-13` | Marca el método de autenticación anterior como obsoleto y recomienda JWT. Describe que un usuario autenticado puede crear una sala. | La misma guía dice que, después de crearla, otros pueden entrar desde el dominio anónimo. No basta para afirmar acceso clínico exclusivamente autorizado. |
| [Jitsi Token Authentication](https://jitsi.github.io/handbook/docs/devops-guide/token-authentication/) — `Last-Modified: 2026-10-13` | Documenta token válido para crear salas y configuración de token en una instalación Jitsi propia. | También declara que, tras crear la sala, otros pueden entrar desde el dominio anónimo. Una instalación propia requeriría una política adicional de invitados/identidad y operación de infraestructura; no es la opción elegida. |
| [8x8 JaaS — JWT](https://developer.8x8.com/jaas/docs/api-keys-jwt/) — `Last-Modified: 2026-10-21` | Documenta JWT de Jitsi/JaaS con AppID, `room`, expiración (`exp`) y contexto/rol de usuario. La documentación diferencia coincidencia literal o regex de sala. | La cuenta, configuración de acceso, contrato, precio, residencia y aptitud para datos de salud no están presentes en el repositorio ni fueron validados. Deben aprobarse antes de uso real. |

### Assumptions and decisions awaiting confirmation

1. Se asume que GitHub Pages es la muestra para profesor y solo puede contener datos de ejemplo. Si el profesor exige video real en Pages, el requisito debe cambiar: se necesitaría un backend externo aprobado, y aun así Pages no puede custodiar su secreto.
2. No hay evidencia de una cuenta JaaS, un dominio Jitsi privado, claves de proveedor, D1 remoto real ni `SESSION_SECRET` de producción configurados; `wrangler.jsonc` mantiene un `database_id` de marcador. La propuesta de video real queda bloqueada hasta provisionamiento explícito.
3. “Reparar” el encabezado de servicios se interpreta como preservar literalmente **“Estudios, cirugía y cuidados intensivos en un mismo edificio”** y corregir su presentación desktop; no se recibió una captura que identifique una causa CSS más específica.
4. Se asume que los nombres/datos de `fuente-demo.ts` son material ficticio autorizado para una demo. Si alguno fuera real, debe sustituirse por datos claramente sintéticos antes de publicar Pages.
5. La aprobación legal, clínica, contractual y de privacidad del proveedor de videollamada no se puede inferir de documentación técnica; no se afirmará cumplimiento médico, HIPAA, residencia ni cifrado contractual sin evidencia externa aprobada.

## Recommendation and implementation boundary

### Chosen environment model

| Entorno | Autenticación y datos | Video | Mensaje obligatorio |
|---|---|---|---|
| GitHub Pages / `build:demo` | HTML/JS estático, datos de ejemplo compilados y, como máximo, selector de rol en `localStorage`. No D1, cookies verificadas, middleware ni API. | No iniciar iframe Jitsi ni emitir/aceptar token. Simular solo estados de cola con datos ficticios. | “Demostración estática: no es una cuenta real, no guarda datos y no realiza videollamadas.” |
| Local Worker (`npm run dev`/`preview` con D1 y `.dev.vars`) | Misma sesión firmada, middleware y roles que Cloudflare, solo si se configuraron D1 local y `SESSION_SECRET`. | Puede probar integración JaaS únicamente con secretos de prueba; sin ellos, devolver estado de configuración ausente. | Explicar error recuperable sin degradar a Jitsi público. |
| Cloudflare Workers + D1 | Fuente de verdad para sesión, afiliación, cola, asignación, diagnóstico y emisión de token corto. | JaaS mediante IFrame API, JWT por consulta y participante, emitido en memoria tras validar sesión/asignación. | No pedir usuario/contraseña/token de Jitsi; solo permisos nativos de cámara/micrófono. |

### Safe treatment of the existing uncommitted demo-login draft

El diff actual se conservará sin alteración durante esta fase. Antes de cualquier commit o publicación, se implementará **completo** el siguiente modelo, no una mezcla transitoria:

- En demo, `/acceso/` se titulará “Explora la demostración” y tendrá botones **“Abrir demo como administrador/médico/cliente/secretaría”**, no un formulario que sugiera credenciales protegidas. Cada acción podrá guardar solo un rol permitido en `localStorage` y navegar a su panel de ejemplo.
- La franja visible y persistente de `Privado.astro`, el título de acceso, los avisos de formularios y el estado de video repetirán que es demo, con datos ficticios y sin persistencia. No se denominará “autenticación”, “cuenta protegida” ni “D1” al flujo de Pages.
- `protegerDemo()` podrá orientar la experiencia: sin rol, vuelve a `/acceso/`; con rol distinto, va a su panel demo. Esa guarda será explícitamente UX, no control de acceso. Los paneles y datos compilados siguen inspeccionables por cualquiera que descargue el sitio.
- El selector demo validará únicamente la lista local de cuatro roles; valores inválidos/ausentes se eliminan y vuelven a acceso. Cerrar demo borra esa selección. No se guardarán contraseña, token, diagnóstico ni datos ingresados por el usuario en la demo.
- Todo código de selección/guarda permanecerá detrás de `DEMO`. El formulario real de `/acceso/`, `auth.ts`, `middleware.ts`, `api/sesion.ts`, cookies y límites de login permanecerán sin cambio funcional en local/Cloudflare.
- No se publicará el estado actual, porque su guarda activa sin UI correspondiente hace inaccesibles los paneles demo. No se descartará el trabajo: se completará en una sola revisión o se mantendrá sin publicar hasta que exista esa revisión.

### Selected production video design

Se elige JaaS gestionado sobre una instalación Jitsi propia porque evita operar servidores de conferencia y permite que el Worker integre la autorización de consulta que ya existe. La alternativa self-hosted/JWT se descarta para esta fase por su carga de infraestructura y porque la documentación oficial de token/secure domain por sí sola aún permite invitados anónimos después de crear la sala.

1. Al médico asignado o cliente propietario con una consulta `atendiendo`, `Videollamada.astro` solicitará una configuración efímera a una nueva ruta de Worker, por ejemplo `GET /api/video?consulta=<id>`. El cliente no elegirá dominio, sala, rol ni token.
2. Middleware permitirá esa ruta solo a `medico` y `cliente`; la ruta volverá a comprobar en D1 que la consulta existe, está `atendiendo`, pertenece al cliente o está asignada al médico solicitante, y tiene una sala válida. La base y `lib/tele.ts` conservan la propiedad de esas invariantes; el navegador nunca las decide.
3. El Worker emitirá un JWT de vida corta, limitado a la sala opaca exacta y a un identificador pseudónimo por participante. No incluirá nombre, correo, diagnóstico, motivo, cédula, teléfono ni dirección. El secreto JaaS se almacenará solo como secreto de Worker/.dev.vars, nunca en `PUBLIC_*`, `dist`, HTML, URL, `localStorage`, D1 o logs.
4. `src/scripts/jitsi.ts` recibirá `domain`, `roomName` y `jwt` en memoria y los pasará a `JitsiMeetExternalAPI`. El usuario verá la solicitud normal de cámara/micrófono, pero ningún inicio de sesión Jitsi ni campo de token. El código seguirá usando nombres genéricos de presentación.
5. Si JaaS no está configurado, el Worker devolverá un estado explícito y la interfaz mostrará que la videollamada real aún no está disponible. No habrá fallback automático a `meet.jit.si`: hacerlo convertiría una falla controlada en una posible exposición de consulta.
6. Pages no llamará a esa ruta, no cargará `external_api.js`, no mostrará una sala funcional y no alegará que el video “se abrirá automáticamente” allí. Su estado será una limitación exacta de demo estática.

### Planned implementation surface

| Archivo o área | Cambio delimitado |
|---|---|
| `src/pages/index.astro` | Reparar la presentación del encabezado, establecer el ritmo de servicios y convertir la selección piso/consultorio en estado explícito, accesible y reiniciable usando `m.piso`/`m.consultorios` antes que el texto legado. |
| `src/pages/servicios/[slug].astro` | Sustituir la lista plana “Otros servicios” por un rail semántico de tarjetas flotantes, con scroll nativo y controles progresivos sin dependencia. |
| `src/pages/especialidades.astro` | Hacer visible la jerarquía de “con especialistas” y “sin médicos”, sin perder búsqueda, checkbox, contador, vacío ni lectura móvil. |
| `src/pages/directorio/index.astro`, `src/components/directorio/filtro.ts` | Conservar el contrato `q`/`esp`/`piso`, el reset y la URL compartible; enlazar desde el edificio al directorio mediante esos parámetros donde corresponda. |
| `src/pages/acceso.astro`, `src/layouts/Privado.astro`, `src/scripts/api.js` | Completar de manera condicional el selector y guarda **solo demo**, con etiquetas honestas y sin afectar el formulario seguro del servidor. |
| `src/components/tele/Videollamada.astro`, `src/components/tele/EnCurso.astro`, `src/scripts/jitsi.ts` | Cambiar de sala pública implícita a configuración efímera autorizada; exponer estado, reintento y fallo de permisos accesibles. |
| `src/lib/tele.ts`, nueva ruta `src/server/api/video.ts`, `src/middleware.ts`, `astro.config.mjs` | Añadir autorización/obtención de configuración de video de servidor y registrar la ruta solo en modo Worker. No guardar JWT y no crear migración para él. |
| `.dev.vars.example`, README y documentación de backend | Documentar secretos de prueba, diferencia demo/servidor, límite de JaaS y procedimiento de evidencia real; corregir contratos antiguos. |
| `tests/` | Añadir pruebas unitarias de autorización/expiración de token y regresiones UI o DOM disponibles; conservar todas las pruebas actuales de migraciones, roles, consulta única y diagnóstico. |

No se modificará el significado de `migrations/0005_secretaria.sql`, `migrations/0007_sala_jitsi.sql`, `validarCliente()`, `atender()`, `finalizar()`, `salaVideo()` ni las validaciones actuales de médico. Si una implementación descubre un cambio de esquema indispensable, deberá proponer una migración nueva, reversible hacia adelante y acompañada por una prueba de actualización; no podrá editar migraciones ya aplicadas.

## Functional Requirements

### FR-1 — Separación de demo, local y producción

1. `build:demo` producirá un sitio estático funcional bajo la base de GitHub Pages y mostrará únicamente datos de ejemplo. No deberá contener rutas API emitidas, secreto de sesión, secreto JaaS ni un token de video válido.
2. La demo expondrá un selector de rol de demostración claramente rotulado, no credenciales que aparenten validar una identidad. La selección se restringirá a `admin`, `medico`, `cliente` y `secretaria`; no persistirá información ingresada en formularios ni datos clínicos.
3. La guarda de ruta demo solo orientará navegación. Todas las pantallas privadas llevarán aviso visible de demo y los formularios no telemedicina indicarán que no se guardan.
4. En modo no demo, `/acceso/` conservará el formulario de correo/cédula y contraseña, la cookie firmada y el middleware actuales. Ningún valor de `localStorage` podrá iniciar una sesión real, decidir un rol real o habilitar una API de Worker.

### FR-2 — Roles, inscripción, datos y flujo clínico preservados

1. Solo el middleware y D1 autorizarán `/admin`, `/medico`, `/panel`, `/secretaria` y sus APIs en servidor. Un usuario con rol incorrecto seguirá recibiendo 401 para API o redirección a su propio panel para páginas.
2. La inscripción de un afiliado seguirá ocurriendo únicamente mediante Secretaría. La validación de servidor seguirá forzando `rol=cliente`, `activo=1` y `medico_id=null`, aunque se manipulen campos HTTP.
3. Se preservarán las especialidades, migraciones aplicadas, 125 médicos/datos importados, pisos/consultorios estructurados, la única consulta activa por cliente, la única consulta atendida por médico y el diagnóstico obligatorio antes de finalizar.
4. El motivo seguirá siendo opcional y limitado a 200 caracteres; el diagnóstico seguirá normalizado, limitado a 1000 caracteres y rechazado con menos de 3 caracteres. Ninguna mejora visual podrá eludir esas reglas de servidor.

### FR-3 — Portada: encabezado y ritmo de servicios

1. La sección de servicios de `src/pages/index.astro` tendrá un único `h2` legible cuyo texto DOM exacto sea: **“Estudios, cirugía y cuidados intensivos en un mismo edificio”**. En escritorio no podrá quedar cortado, superpuesto, invisible por animación ni alterado por división decorativa de líneas.
2. Estudios y diagnóstico conservará el patrón de filas con nombre, nota e imagen; cirugía y unidades conservará tarjetas con contenido real e imágenes existentes. La diferencia de patrón será intencional: filas densas para estudios comparables y tarjetas con aire para unidades.
3. El espaciado entre encabezado, subtítulo, grupo de filas, grupo de unidades y enlace de especialidades usará una escala coherente responsive, no márgenes aislados. Cada enlace conservará área de interacción de al menos 44 px y los `alt`, horarios y rutas existentes.
4. En 393 px las filas no perderán nombre/nota, las imágenes no invadirán el texto y las unidades pasarán a una columna; en escritorio conservarán la lectura de dos grupos sin un vacío accidental ni compresión desigual.

### FR-4 — Rail “Otros servicios”

1. Cada página de servicio mostrará todos los demás elementos de `indiceServicios`, incluida Especialidades cuando aplique, como enlaces semánticos dentro de un `nav` y una lista. Ningún destino se perderá por el rail ni dependerá de JavaScript para ser navegable.
2. El rail será horizontal, visualmente de tarjetas elevadas discretas y coherentes con la marca existente; usará CSS flex/grid, `overflow-x:auto` y scroll snap. En móvil cada tarjeta tendrá ancho legible y se insinuará continuidad; el documento no adquirirá overflow horizontal accidental fuera del rail.
3. Los enlaces serán tabulables y conservarán foco visible. Dos botones progresivos “Ver servicios anteriores/siguientes” desplazarán el rail una longitud de tarjeta; solo se mostrarán con JavaScript, tendrán nombres accesibles, estado `disabled` correcto en extremos y respetarán `prefers-reduced-motion`.
4. No se añadirá biblioteca de carrusel, slider, iconos ni animación. Sin JavaScript, el rail seguirá pudiendo desplazarse y todos los enlaces seguirán siendo utilizables con teclado/puntero.

### FR-5 — Especialidades: jerarquía sin regresión de filtro

1. En escritorio, la página tendrá una sección principal visible para especialidades con médicos en el directorio, con su recuento y enlaces a resultados, seguida de una sección secundaria visualmente sobria para las que aún no tienen médicos. Las segundas no se presentarán como enlaces a resultados inexistentes.
2. Buscar sin acentos, el checkbox “solo las que tienen médicos”, el contador `aria-live`, el estado vacío y el enlace hacia el directorio seguirán funcionando sobre ambos grupos. Una búsqueda que solo coincida con el grupo sin médicos explicará el caso y permitirá desmarcar el filtro.
3. En móvil se conservará una lista de una columna sin columnas CSS, recortes ni barra pegajosa que consuma una fracción excesiva de la pantalla. Sin JavaScript, ambas secciones seguirán siendo legibles.

### FR-6 — Piso, consultorio y médico: selección clara y accesible

1. La portada mantendrá el orden de `PISOS` y construirá cada piso/puerta desde `Medico.piso` y `Medico.consultorios`; solo el registro histórico sin piso usará la representación/fallback existente. No se perderán consultorios A/B ni referencias históricas.
2. Seleccionar un piso será una acción de botón con estado programático (`aria-pressed` o equivalente apropiado) y un texto de estado que diga qué piso y cuántos médicos se muestran. Seleccionar un consultorio activará ese piso y mostrará solo los médicos de esa puerta; seleccionar de nuevo la misma puerta la desactiva.
3. Elegir otro piso limpiará el consultorio anterior. Tras cualquier selección aparecerá un control inequívoco “Mostrar todos los médicos” que limpia piso y consultorio, restituye la vista completa y mueve el foco de forma predecible al encabezado/estado de resultados.
4. La filtración no se comunicará solo con opacidad: las filas que no coinciden quedarán fuera de la lista expuesta a lectores de pantalla o tendrán semántica equivalente. El estado indicará cuando una puerta no tenga médicos; no habrá selección silenciosa.
5. En escritorio, el piso activo por scroll seguirá siendo una mejora visual solo mientras no exista filtro explícito; no sobrescribirá una selección manual. En móvil, pulsar piso abrirá su `details`, cerrará los no pertinentes cuando haya filtro y conservará teclado, `Enter` y `Space` nativos.
6. El nombre de cada médico podrá llevar al directorio existente con una búsqueda escapada y `u()`; el formulario de directorio, sus filtros `q`/`esp`/`piso`, la URL compartible y “Quitar los filtros” se preservarán.

### FR-7 — Video sin fricción falsa y con autorización real

1. El panel de cliente solo podrá pedir configuración de video para su propia consulta `atendiendo`; el panel de médico, solo para una consulta `atendiendo` asignada a ese médico. El Worker comprobará estas invariantes contra D1 para cada solicitud, incluso si el navegador altera `consulta`, `sala` o rol.
2. La ruta de video aceptará únicamente un `consulta` entero positivo. Devolverá 404 genérico para una consulta inexistente/no perteneciente, 409 JSON para consulta no lista, 503 JSON para proveedor no configurado y 500 JSON para fallo interno de firma. Sesión ausente o rol no permitido seguirá el contrato de middleware (401 para API); ninguna respuesta incluirá sala ajena, diagnóstico, token, secreto ni datos personales.
3. La respuesta exitosa contendrá solo dominio JaaS aprobado, nombre de sala opaco y JWT efímero. El JWT será de un solo participante/sala, tendrá expiración corta configurada, no se persistirá y se entregará únicamente sobre la sesión HTTPS vigente.
4. El iframe se iniciará automáticamente una vez recibida la respuesta exitosa; no habrá formulario Jitsi, copia/pega de enlace ni campo de token. Los únicos permisos solicitados al usuario serán los del navegador para cámara/micrófono.
5. Si carga de `external_api.js`, emisión de token, ingreso a sala o permiso de dispositivo falla, el bloque comunicará un mensaje en español mediante `role=status`/alerta apropiada y un botón “Reintentar videollamada”. La falla es recuperable salvo sesión/consulta inválida; no se hará fallback a `meet.jit.si` ni se marcará la consulta como finalizada.
6. Errores 400/404/409 de uso normal no requerirán log de error. Fallos 500/503 se registrarán en Worker con operación, timestamp y un identificador de correlación sin JWT, sala, motivo, diagnóstico ni PII; la interfaz recibe un mensaje genérico y el identificador si soporte lo necesita.
7. En Pages, el mismo componente mostrará una limitación estática y no cargará Jitsi. Si no hay cuenta JaaS aprobada, el alcance publicado seguirá siendo “demo sin video real”, aunque el flujo de cola se pueda simular.

## Non-Functional Requirements

1. **Seguridad y privacidad.** No se añadirán secretos, JWT, credenciales reales, endpoints de Worker ni PII al build demo. Los tokens no aparecerán en query string, HTML, atributos DOM, almacenamiento web, D1, capturas, telemetría ni logs. Antes de activar JaaS se debe aprobar su acuerdo de datos/privacidad y configuración de invitados; no se hará una afirmación clínica que no tenga evidencia contractual.
2. **Accesibilidad.** Todo control nuevo será HTML nativo cuando sea posible, alcanzable por teclado, con foco visible, texto de estado para cambios dinámicos y contraste consistente. La interacción de rail, filtro y edificio funcionará con lector de pantalla, mouse, touch y teclado; el movimiento respetará reducción de movimiento.
3. **Responsive y calidad visual.** Los puntos obligatorios de evaluación serán escritorio 1440×900 y móvil 393×852. No habrá overflow horizontal del documento, solapamiento de encabezados, texto truncado crítico ni controles menores de 44 px; el overflow solo será deliberado dentro del rail.
4. **Rendimiento y dependencias.** Se reutilizarán Astro, CSS y JavaScript existentes. No se instalará dependencia nueva ni se cargará Jitsi en páginas públicas/demo; el script de Jitsi se cargará una vez, solo al entrar a una videollamada real.
5. **Integridad y compatibilidad.** Se conservarán migraciones aplicadas y contratos de `db.ts`, `usuarios.ts`, `tele.ts`, directorio, rutas con `u()` y base de GitHub Pages. Todo cambio de datos debe pasar pruebas de actualización y no invalidar el único consultorio histórico sin piso.
6. **Observabilidad honesta.** La evidencia de video distinguirá “iframe cargó”, “usuario concedió permisos” y “dos participantes se unieron”. La ausencia de cuenta/configuración/proveedor se reportará como limitación exacta, no como éxito parcial ni promesa futura.

## Acceptance Criteria

1. `npm test` termina correctamente e incluye las regresiones existentes de migraciones, roles, alta exclusiva de Secretaría, pisos/consultorios, filtros, consulta única por médico/cliente y diagnóstico obligatorio; las nuevas funciones puras de autorización/expiración de video tienen pruebas unitarias positivas y negativas.
2. `npm run build` termina correctamente para el modo Worker y `npm run build:demo` termina correctamente para Pages, sin instalar una dependencia nueva ni modificar migraciones ya aplicadas.
3. La inspección del artefacto `dist` de demo confirma que no contiene una carpeta/ruta API ejecutable, `SESSION_SECRET`, secretos JaaS, JWT firmado ni video real; `/acceso/` y cada panel muestran el rótulo demo correcto y las solicitudes de red de Pages no cargan `external_api.js`.
4. En un navegador que sirva el artefacto Pages, con `localStorage` limpio, ir directo a cada panel privado termina en acceso demo; elegir cada rol permitido abre solo su panel demo; un valor de rol alterado vuelve a acceso; salir elimina la selección. La UI nunca afirma que esa protección sea una cuenta D1/Cloudflare real.
5. En local Worker configurado, una sesión real se crea solo mediante `/api/sesion`; el valor demo de `localStorage` no altera su rol. Sin cookie y con rol equivocado se verifican las redirecciones/401 actuales. Una Secretaría puede crear solo cliente aunque se manipulen campos HTTP; no ve ni modifica historial, médicos o administración.
6. En una comprobación de navegador y captura a **1440×900**, el `h2` de servicios tiene exactamente el texto requerido, se ve completo y no se superpone; estudios/unidades conservan ritmo intencional, áreas clicables y contenido real. Se inspecciona DOM además de la captura, no solo una imagen.
7. En una comprobación de navegador y captura a **393×852**, no hay overflow horizontal del documento; el encabezado, filas de estudios, tarjetas de unidades y enlaces siguen legibles/alcanzables. La excepción permitida es el contenedor interno del rail, cuyo scroll horizontal se verifica de forma explícita.
8. En escritorio y 393 px, el rail “Otros servicios” contiene todos los destinos esperados, conserva enlaces correctos con la base de Pages, permite tabular por cada tarjeta y sus controles anterior/siguiente desplazan el rail y se deshabilitan correctamente en extremos. Con JavaScript deshabilitado, todos los enlaces siguen utilizables.
9. En escritorio, Especialidades muestra títulos y recuentos distinguibles para ambos grupos; una búsqueda sin acentos, el checkbox, el contador y el vacío producen el resultado correcto. En 393 px las listas permanecen en una columna sin recorte; sin JavaScript siguen apareciendo ambos grupos.
10. En escritorio y móvil, piso, puerta y reset se prueban con mouse/touch y teclado: el estado anuncia resultado, filtra de manera semántica, al elegir otro piso limpia puerta, volver a elegir puerta la desactiva y “Mostrar todos los médicos” restaura el conjunto. La activación visual por scroll no sobrescribe una selección manual.
11. Se verifica que la ruta al directorio desde el edificio y desde Especialidades conserva `u()`, filtros existentes y el botón “Quitar los filtros”; los datos de piso/consultorio A/B y el registro histórico sin piso continúan pasando las comprobaciones de pruebas.
12. Con cuenta JaaS, dominio y secretos de prueba aprobados, dos contextos de navegador independientes (médico y cliente de prueba) completan una consulta `atendiendo`: ambos reciben video en la misma sala, se observa el evento de unión o audio/video equivalente, y ninguno introduce usuario, contraseña o token de Jitsi. Se conserva evidencia de navegador/captura sin PII ni JWT.
13. Si no están provisionados JaaS, secretos, dominio o aprobación de privacidad, el criterio 12 no puede marcarse como aprobado. El informe de prueba debe decir exactamente cuál falta, mostrar el estado de UI de “video real no disponible”, verificar que no hubo fallback a `meet.jit.si`, y limitar la publicación a demo estática/no clínica.
14. Se prueban entradas y fallas de `/api/video`: identificador inválido (400), consulta ajena/inexistente (404), no atendiendo (409), sesión/rol no autorizado (401), configuración ausente (503), fallo de iframe/red y permiso de cámara denegado. Todas dan mensajes recuperables apropiados, no filtran datos ni finalizan la consulta; las inspecciones de DOM, storage, URL, `dist` y logs sanitizados confirman que el token no se expone.
15. Antes de proponer publicación, se revisan `git status`, `git diff --check` y el artefacto final para demostrar que no se perdió el borrador preexistente por `reset`, `clean` o descarte, y que no se añadieron cambios ajenos a los archivos aprobados.

## Out of Scope

- Confirmar, descartar, confirmar en git, hacer commit, push, desplegar o publicar cualquier cambio durante esta fase de investigación.
- Convertir GitHub Pages en un backend, exponer D1, emitir JWT desde cliente o tratar `localStorage` como un control de acceso real.
- Certificar cumplimiento médico/legal, negociar DPA, precio, residencia de datos, SLA o adecuación regulatoria de JaaS/Jitsi; eso requiere decisión y evidencia de la institución.
- Operar una infraestructura Jitsi propia, cambiar a Google Meet u otro proveedor, o añadir una caída automática a un servicio público de video.
- Reescribir migraciones históricas, alterar diagnósticos/consultas existentes, cambiar las reglas de afiliación, o sustituir el directorio/importación de médicos por datos no aprobados.
- Un rediseño total de marca, nuevos servicios médicos, cambios de copy clínico no solicitados, o almacenamiento de formularios de la demostración.
