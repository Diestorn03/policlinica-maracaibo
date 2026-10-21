# Revisión de diseño — feedback del profesor

## Veredicto
**CHANGES_REQUESTED** — hay 1 hallazgo HIGH y 4 MEDIUM. Por la regla mecánica, el diseño no está listo para implementación.

## Hallazgos

1. **HIGH — El contrato de `kid` de JaaS no puede producir de forma definida el identificador que espera el proveedor.**
   - **Dónde:** `design.md`, «JaaS: evidencia, configuración y autorización»: validación de `JAAS_KEY_ID` y header JWT `{ alg, typ, kid }`.
   - **Problema:** el diseño permite para `JAAS_KEY_ID` solo `^[A-Za-z0-9_-]{1,128}$`, pero lo usa como el `kid` del header sin especificar una transformación. La documentación oficial de JaaS describe el `kid` publicado por la clave y muestra el formato `<appId>/<keyId>` (por ejemplo, `vpaas-magic-cookie-…/4f4910`), que contiene `/`. Por tanto, una implementación literal rechazará el `kid` correcto o enviará solo el sufijo, que JaaS no podrá asociar con la clave pública. Esto bloquea toda autenticación de vídeo real.
   - **Corrección concreta:** elegir una semántica única y probarla. La opción más clara es que `JAAS_KEY_ID` contenga solo el sufijo de la clave y construir el header exclusivamente así:
     ```ts
     const kid = `${config.appId}/${config.keyId}`;
     // keyId: /^[A-Za-z0-9_-]{1,128}$/
     // header: { alg: 'RS256', typ: 'JWT', kid }
     ```
     Alternativamente, renombrar la variable a `JAAS_KID`, aceptar y validar exactamente `<appId>/<keyId>`. La prueba debe comparar el header completo con el `kid` mostrado por la clave JaaS cargada, no solo comprobar que existe una propiedad `kid`.

2. **MEDIUM — Los tiempos del JWT no definen la unidad `NumericDate`, por lo que la vida de 120 segundos no es implementable de manera inequívoca.**
   - **Dónde:** `design.md`, bloque de claims de JaaS (`nbf: ahora-5`, `iat: ahora`, `exp: ahora+120`) y criterio de aceptación 14.
   - **Problema:** en JavaScript, `ahora` puede razonablemente ser `Date.now()` en milisegundos o segundos Unix. Los JWT usan `NumericDate` en segundos. Con milisegundos, `nbf` queda miles de años en el futuro y el token no sirve; si se omite o se interpreta de otro modo, la expiración deja de significar 120 segundos. Comprobar solo `exp - iat === 120` no detecta esa falla.
   - **Corrección concreta:** fijar la regla y el reloj inyectable en el diseño:
     ```ts
     const nowSeconds = Math.floor(nowMs / 1000);
     const claims = { nbf: nowSeconds - 5, iat: nowSeconds, exp: nowSeconds + 120 };
     ```
     Las pruebas deben afirmar tanto `exp - iat === 120` como que `iat` está dentro de una tolerancia pequeña de `Math.floor(Date.now() / 1000)`.

3. **MEDIUM — La promesa de rechazo HTTP y el contrato 401/503 contradicen el orden real del middleware.**
   - **Dónde:** `design.md`, requisito no funcional 3, matriz «Local Worker», sección de configuración JaaS y criterios 13 y 15; `src/middleware.ts`.
   - **Problema:** al añadir `/api/video` a `REGLAS`, el middleware seguirá llamando a `getEnv()` y verificando `SESSION_SECRET` antes de que el handler pueda comprobar `request.url.protocol`. Una petición HTTP sin sesión llegará al 401 genérico del middleware, no al 503 `video_solo_https`; además, la afirmación amplia «antes de leer secretos» es falsa para el secreto de sesión. El diseño no decide qué error prevalece ni cómo se prueba el 503 en un Worker HTTP real.
   - **Corrección concreta:** adoptar explícitamente el orden seguro de autenticación primero: (a) sesión ausente o rol incorrecto devuelve 401 en cualquier esquema; (b) solo una solicitud ya autenticada que alcanza el handler recibe 503 por HTTP/origen no permitido, antes de leer **configuración o clave JaaS** e intentar firmar. Cambiar el copy para no afirmar que no se lee ningún secreto, y probar ambos casos: HTTP sin sesión → 401; HTTP con `locals.usuario` autorizado en una prueba de handler/integración → 503 y espía que demuestra que no se llamó al lector/importador JaaS.

4. **MEDIUM — La función central de autorización de vídeo se nombra sin una firma ni un contrato de retorno que asegure la consulta solicitada.**
   - **Dónde:** `design.md`, «JaaS: evidencia, configuración y autorización»: `autorizarVideo(db, actor)`.
   - **Problema:** la ruta valida `consulta`, pero la función propuesta recibe solo `db` y `actor`. No queda definido cómo recibe el ID, qué resultado tipado devuelve ni qué condición produce 404 frente a 409. Hay implementaciones plausibles que consultan la llamada activa del actor en vez de la ID solicitada, o que devuelven una sala antes de ocultar el caso ajeno/inexistente. Esa ambigüedad afecta el límite de autorización que protege el JWT.
   - **Corrección concreta:** fijar la API y hacer que solo entregue una sala interna en el caso exitoso, por ejemplo:
     ```ts
     type VideoActor = { id: number; rol: 'cliente' | 'medico' };
     type VideoAuthorization =
       | { kind: 'ok'; room: `pm-${string}` }
       | { kind: 'not-found' | 'not-ready' | 'legacy-room' };

     export function autorizarVideo(
       db: DB, consultaId: number, actor: VideoActor,
     ): Promise<VideoAuthorization>;
     ```
     Debe devolver `not-found` para inexistente o ajena, `not-ready` solo para una consulta propia no atendiendo, `legacy-room` solo para una propia atendiendo con sala no canónica, y nunca incluir `room` fuera de `ok`. El endpoint mapea esa unión a 404/409 sin volver a consultar ni exponer datos.

5. **MEDIUM — El estado demo persistido declara un esquema, pero no define la validación ni la recuperación de `pm-demo-tele` controlado por el navegador.**
   - **Dónde:** `design.md`, «Disposición segura del borrador demo-login» y criterios 4–5.
   - **Problema:** el plan limita `pm-demo-tele` a 4 KB y enumera campos permitidos, pero solo especifica borrar un rol inválido. No dice qué ocurre ante JSON malformado, más de 4 KB, versión desconocida, IDs de fixture inexistentes, estados inválidos o campos de motivo/diagnóstico inyectados. El código actual acepta cualquier objeto con `consultas`, por lo que un implementador podría conservar esa fragilidad y romper los paneles o contradecir el compromiso de persistir exclusivamente estado fixture.
   - **Corrección concreta:** definir `leerTeleDemo()` como un parser estricto: comprobar longitud antes de `JSON.parse`, versión exacta, claves permitidas, IDs finitos conocidos, estados de la unión cerrada y límites de arreglo; ante cualquier fallo, borrar la clave y regresar una copia del estado fixture inicial sin navegar ni reflejar campos arbitrarios. Añadir pruebas para JSON inválido, >4 KB, versión/ID/estado desconocido y presencia de `motivo`, `diagnostico`, correo o texto de formulario; todas deben restaurar un estado seguro y no persistir el valor recibido.

## Verified Assumptions

- `PUBLIC_DEMO=1` selecciona `fuente-demo.ts`, omite el adaptador Cloudflare y las rutas de servidor; GitHub Pages ejecuta `npm run build:demo` y publica solo `dist`. Por tanto, Pages no puede verificar la cookie, consultar D1 ni emitir JWT de forma segura.
- La sesión Worker actual sí es una cookie HMAC de 12 horas `HttpOnly`, `Secure`, `SameSite=Lax`; el middleware relee usuario, versión, activo y rol desde D1. `localStorage` no participa en `/api/sesion` ni en esa autorización.
- La demo actual no es todavía sintética: `d1Local()` aplica `0002_seed.sql`, `fuente-demo.ts` inserta datos de aspecto personal y consultas de ejemplo, y la migración semilla contiene 125 médicos/fotos importados. El reemplazo propuesto por fixtures y auditoría de artefacto responde a un riesgo real. Omitir solo `0002_seed.sql` es técnicamente viable: las migraciones posteriores toleran tablas inicialmente vacías y los fixtures pueden insertarse después.
- La implementación actual expone `sala` en `estado()`, `cola()`, HTML y `data-sala`, y carga `https://meet.jit.si/external_api.js`. La propuesta de pasar solo la ID de consulta al navegador y autorizar por D1 corrige una exposición real.
- `0007_sala_jitsi.sql` puede conservar una sala heredada en una consulta `atendiendo`; la política propuesta de preflight y 409 de transición es consistente con esa migración y con su prueba de actualización.
- La documentación oficial de JaaS confirma `https://8x8.vc/<AppID>/external_api.js`, `roomName` con formato `<AppID>/<room>`, JWT RS256, `sub` igual al AppID y coincidencia literal de `room`. También confirma el formato compuesto de `kid` señalado en el hallazgo 1.

## Unverified/Wrong Assumptions

- No hay cuenta JaaS, clave pública cargada, clave privada correspondiente, AppID, `kid` válido, política que fuerce JWT para cada participante ni evidencia de dos participantes en el repositorio. La habilitación real debe permanecer bloqueada hasta cumplir esas puertas operativas.
- No hay evidencia de aprobación institucional de privacidad/proveedor, contrato de datos, residencia o configuración de invitados. El diseño correctamente no debe alegar cumplimiento clínico/regulatorio antes de esa aprobación.
- `wrangler.jsonc` mantiene un `database_id` marcador y no demuestra un Worker Cloudflare HTTPS de prueba. La igualdad de origen, las cabeceras CSP/Permissions-Policy y la carga real de JaaS siguen sin verificar hasta una integración autorizada.
- La semántica actual de `JAAS_KEY_ID` es incorrecta o, como mínimo, insuficientemente definida para el header JaaS; debe corregirse según el hallazgo 1 antes de considerar configurada una clave.
