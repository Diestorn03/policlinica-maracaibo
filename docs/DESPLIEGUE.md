# Despliegue en el servidor del profesor (Webuzo: Apache + PHP + MariaDB)

GitHub Pages solo sirve archivos: no tiene base de datos ni sesiones, por eso el login y la videollamada de la demo son simulados.
El hosting del profesor es compartido (usuario sin root, sin Node ni terminal), así que la parte con servidor corre en **PHP + MariaDB** y el sitio queda como HTML estático de Astro.
Cómo está armado: [docs/PHP.md](PHP.md). La demo de Pages sigue igual y se compila con `npm run build:demo`.

## Qué se sube
`paquete/policlinica-php.zip` (se arma con `node tools/empaquetar-php.mjs`, o lo descarga de la pestaña Actions de GitHub, workflow «Paquete del servidor»):
```
public_html/                     → la carpeta del dominio (en Webuzo: /home/<usuario>/public_html)
policlinica-config.ejemplo.php   → se copia como policlinica-config.php UN NIVEL MÁS ARRIBA, fuera de public_html
```
El dominio queda fijado al compilar (`SITE_URL`, por defecto `https://proyecto.pmaracaibo.com`). Si cambia el dominio hay que volver a empaquetar.

## Pasos
1. **Base de datos.** Webuzo → Database → Database Wizard (o Add Database + Add Database User + Add User To Database): crear una base y un usuario con todos los permisos. Anotar nombre, usuario y contraseña.
2. **Archivos.** Webuzo → Server Utilities → File Manager. Subir el ZIP a `/home/<usuario>/`, extraerlo, y mover el contenido de `public_html/` del ZIP a la carpeta `public_html` del dominio (reemplaza la página de Webuzo).
3. **Configuración.** Copiar `policlinica-config.ejemplo.php` a `/home/<usuario>/policlinica-config.php` y llenar `db_name`, `db_user`, `db_pass`, un `instalar_token` largo al azar y los datos del primer administrador (`admin_correo`, `admin_clave`). Este archivo nunca va dentro de `public_html`.
4. **Instalar.** Abrir `https://<dominio>/instalar?token=<instalar_token>`. Crea las tablas, carga los 125 médicos y el administrador. Debe responder «Listo».
5. **Cerrar la instalación.** Editar `policlinica-config.php` y borrar `instalar_token`, `admin_correo` y `admin_clave`.
6. **Probar.** `https://<dominio>/acceso/` con el administrador: crear un médico y un cliente desde el panel y hacer una llamada de prueba entre dos navegadores.

## Actualizar
Subir el ZIP nuevo y reemplazar `public_html/` (sin tocar `policlinica-config.php`). Si trae migraciones nuevas, volver a abrir `/instalar?token=…` con el token puesto un momento; solo aplica lo que falte. Copia de seguridad: exportar la base desde phpMyAdmin.

## Qué es dinámico y qué es estático
- **PHP (siempre al día):** `/acceso/`, `/panel/`, `/medico/`, `/secretaria/`, `/admin/…`, las APIs y las fotos subidas desde el admin.
- **Estático con refresco:** el directorio, las especialidades y las cifras de la portada se compilan con los 125 médicos originales y el navegador los refresca con `/api/directorio`, así que un médico nuevo aparece sin recompilar.
- **Estático sin refresco hasta recompilar:** el edificio y los retratos de la portada, y los médicos que cada página de servicio sugiere (hasta 8).

## Videollamada
Es propia, sin Jitsi ni cuentas: el médico atiende y los dos navegadores se conectan solos, sin login ni contraseña (WebRTC).
El video y el audio van directo entre médico y paciente; el servidor solo pasa unos 25 mensajes cortos de conexión (`/api/senal`, sondeo corto sobre MariaDB).

Límites que conviene conocer:
- **Redes que bloquean la conexión directa.** Con STUN público (por defecto) conecta en wifi y fibra y en la mayoría de los móviles. Algunas redes móviles necesitan un servidor TURN que retransmita el video (1 a 2 Mbps por llamada); ese consumo no debe correr en este hosting. Se usa un TURN gestionado o coturn en otro servidor y se pone en `ice_servers` de la configuración, en JSON: `[{"urls":"turn:turn.ejemplo.com:3478","username":"usuario","credential":"clave"}]`.
- **Carga.** Cada participante hace una consulta corta cada 1 s mientras se conecta y cada 4 s después; con 50 llamadas simultáneas son unas 25 consultas por segundo a MariaDB, que el hosting aguanta. Más allá de unas cientos de llamadas hay que pensar en otro servidor.
- **HTTPS obligatorio.** Los navegadores solo dan acceso a cámara y micrófono en sitios con https (el dominio temporal ya lo tiene).

## Problemas comunes
- **Página en blanco o error 500 al instalar:** revisar los datos de la base en `policlinica-config.php`; el error exacto sale en la respuesta de `/instalar` y en Webuzo → Server Utilities → Error Log.
- **Las rutas `/acceso/`, `/admin/`… dan 404 de Apache:** falta el `.htaccess` de `public_html` (los archivos que empiezan con punto a veces no se copian) o `mod_rewrite` está apagado en el hosting.
- **Entra y vuelve a la pantalla de acceso:** la cookie solo viaja por HTTPS; abrir el sitio con `https://`.
- **La llamada queda en «Esperando…» en un lado:** el otro no abrió la página o no permitió cámara y micrófono.
- **Conectan en wifi pero no desde un móvil con datos:** falta un TURN (`ice_servers`).

## Alternativa con Node
Si más adelante hay un servidor con Node 22+, el mismo proyecto corre allí con `npm run build:node` y SQLite (código en `src/lib/fuente-node.ts`, `src/server/`). No se usa en este hosting.
