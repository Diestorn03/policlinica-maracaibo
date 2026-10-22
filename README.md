# Policlínica Maracaibo · sitio web

Rediseño del sitio de la Policlínica Maracaibo (desde 1952): páginas informativas, directorio médico administrable,
afiliación y telemedicina con sala de espera. Astro 7 + GSAP + Lenis sobre Cloudflare Workers y D1 (plan gratis).

## Qué hay
| Ruta | Qué es |
|---|---|
| `/`, `/servicios/…`, `/especialidades/`, `/afiliacion/`, `/nosotros/` | Páginas públicas (estáticas) |
| `/directorio/` | Directorio médico con buscador y filtro por especialidad (sale de la base de datos) |
| `/acceso/` | Inicio de sesión único: administrador, médico, cliente o secretaria caen en su panel |
| `/admin/` | Administrador: usuarios con roles, clientes afiliados, médicos, especialidades y consultas con diagnóstico |
| `/secretaria/` | Secretaria: registra nuevos clientes; no puede ver ni modificar historiales, médicos o administración |
| `/medico/` | Panel del médico: sala de espera, videollamada propia (WebRTC, sin cuentas) y diagnóstico obligatorio al finalizar |
| `/panel/` | Panel del cliente: sala de espera, videollamada automática embebida e historial con médico y diagnóstico |

## Desarrollo
```bash
npm install
cp .dev.vars.example .dev.vars     # y cambiar los valores
npm run db:local                   # crea las tablas y carga los 125 médicos del sitio anterior
node tools/usuario.mjs --rol admin --nombre "Tu nombre" --correo tu@correo.com
npm run dev                        # http://localhost:4330
npm test                           # prueba la base de datos, la sesión y la telemedicina
```
En Windows, si la ruta del proyecto es muy larga, el D1 local falla: poner `CF_STATE=C:/pm-state` en `.env`
y añadir `--persist-to C:/pm-state` a los comandos de wrangler.

## Hosting del profesor (Webuzo: Apache + PHP + MariaDB)
El hosting no tiene Node: el sitio queda como HTML estático de Astro y las zonas con servidor (login con roles, paneles, admin, sala de espera, videollamada) corren en PHP + MariaDB.
`npm run build:php` compila el sitio y `node tools/empaquetar-php.mjs` arma `paquete/policlinica-php.zip`. Guía de instalación: [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md); cómo está armado: [docs/PHP.md](docs/PHP.md).
Pruebas locales con Docker: `node tools/php-env.mjs up` y `node tools/php-env.mjs test libs.php`.
(`npm run build:node` compila la alternativa para un servidor con Node + SQLite.)

## Publicar en Cloudflare (gratis)
```bash
npx wrangler login
npx wrangler d1 create policlinica          # copiar el database_id a wrangler.jsonc
npm run db:remote                           # tablas + médicos en producción
npx wrangler secret put SESSION_SECRET      # 32+ caracteres al azar
node tools/usuario.mjs --rol admin --nombre "…" --correo … --remote
npm run deploy
```
El dominio puede seguir registrado donde está (cPanel): basta con apuntarlo a Cloudflare.

> **Videollamadas:** propias con WebRTC (sin Jitsi ni cuentas): el video va directo entre médico y paciente y el servidor solo pasa los mensajes de conexión. Detalles y límites (TURN, un solo proceso) en [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

## Datos
- `tools/scrape.mjs` sacó el directorio del WordPress anterior → `src/data/medicos.json` + fotos en `public/medicos/`.
- `tools/seed.mjs` lo convierte en `migrations/0002_seed.sql` (nombres de especialidades corregidos, duplicados unidos).
- Contenido fijo (servicios, horarios, teléfonos): `src/data/site.ts`.
