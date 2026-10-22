# Despliegue en el servidor del profesor (Webuzo)

GitHub Pages solo sirve archivos: no tiene base de datos ni sesiones, por eso el login y la videollamada de la demo son simulados.
En el servidor corre la misma aplicación con `npm run build:node`: login real con roles, base SQLite en un archivo y sala de espera de verdad.
La demo de Pages sigue igual y se compila con `npm run build:demo`.

## Antes de empezar: tres datos del panel

1. **Node.js 22.13 o más nuevo** (mejor 24). Se ve en el panel de Webuzo (Apps → Node.js) o con `node -v` en una terminal. La base usa `node:sqlite`, que viene dentro de Node.
2. **Cómo dejar el proceso encendido.** Dos caminos: el administrador de aplicaciones Node del panel (si lo trae) o `pm2`.
3. **Proxy de Apache.** El sitio escucha en un puerto interno (4321) y Apache lo reenvía. Necesita los módulos `mod_proxy`, `mod_proxy_http`, `mod_rewrite` y `mod_headers`.

## Pasos

1. **Paquete.** Descargar el artefacto `policlinica-servidor` de la pestaña Actions de GitHub (workflow «Paquete del servidor»), o armarlo en el PC:
   ```bash
   SITE_URL=https://proyecto.pmaracaibo.com npm run build:node
   ```
   Se sube `dist/`, `migrations/`, `package.json` y `package-lock.json` a una carpeta fuera de `public_html`, por ejemplo `~/policlinica/`.
   `SITE_URL` queda fijado al compilar: si cambia el dominio hay que compilar otra vez.
2. **Dependencias**, en esa carpeta:
   ```bash
   npm ci --omit=dev
   ```
3. **Configuración.** Copiar `.env.servidor.example` a `.env` y llenarlo (el secreto de sesión, el correo y la clave del primer administrador).
4. **Arrancar.**
   ```bash
   npm start                                    # prueba
   pm2 start npm --name policlinica -- start    # para dejarlo encendido
   pm2 save
   ```
   La base se crea sola en `DATA_DIR` con las migraciones y los 125 médicos. Con `ADMIN_CORREO` y `ADMIN_CLAVE` se crea el primer administrador; después se pueden borrar de `.env`.
5. **Apache.** En la carpeta del dominio (`public_html/.htaccess`):
   ```apache
   RewriteEngine On
   RequestHeader unset X-Forwarded-For
   RequestHeader set X-Forwarded-Proto "https"
   RewriteRule ^(.*)$ http://127.0.0.1:4321/$1 [P,L]
   ```
   Las dos líneas de `RequestHeader` importan: el servidor confía en esas cabeceras solo para el dominio de `SITE_URL`, y el límite de 5 intentos de login por minuto cuenta por la IP real.
6. **Probar.** Entrar a `https://proyecto.pmaracaibo.com/acceso/` con el administrador, crear un médico y un cliente desde el panel y hacer una llamada de prueba entre dos navegadores.

## Actualizar
Subir el paquete nuevo encima (sin tocar `.env` ni `DATA_DIR`), `npm ci --omit=dev` si cambió `package-lock.json` y `pm2 restart policlinica`. Las migraciones nuevas se aplican solas al arrancar.
Copia de seguridad: copiar `data/policlinica.db`.

## Videollamada
La sala es una sala Jitsi con nombre impredecible que crea el servidor al atender al paciente; se muestra dentro del panel del médico y del cliente.
Por defecto usa el Jitsi público (`meet.jit.si`). Ese servicio no está pensado para incrustarlo en sitios propios y puede cortar la llamada a los pocos minutos o pedir inicio de sesión al moderador. Hay que probar una llamada de más de 5 minutos entre dos personas.
Si se corta, la solución es un Jitsi propio y poner su dominio en `JITSI_DOMAIN` (sin `https://`). Necesita un Ubuntu o Debian con acceso root, un subdominio con certificado y los puertos 443 (TCP) y 10000 (UDP) abiertos; en el mismo servidor choca con el Apache del panel, así que lo normal es una IP o un servidor aparte.
No requiere recompilar: se cambia `.env` y se reinicia.

## Problemas comunes
- **El login da error 403 de «Cross-site POST»:** falta `RequestHeader set X-Forwarded-Proto "https"` o el `SITE_URL` del paquete no coincide con el dominio real.
- **Entra y vuelve a la pantalla de acceso:** la cookie es segura y solo viaja por HTTPS; el sitio tiene que abrirse con `https://`.
- **`node:sqlite` no existe:** Node es más viejo que 22.5.
- **Error 500 al arrancar:** revisar que `SESSION_SECRET` esté definido y que `DATA_DIR` sea escribible.
