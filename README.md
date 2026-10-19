# Policlínica Maracaibo · sitio web

Rediseño del sitio de la Policlínica Maracaibo (desde 1952): páginas informativas, directorio médico administrable,
afiliación y telemedicina con sala de espera. Astro 7 + GSAP + Lenis sobre Cloudflare Workers y D1 (plan gratis).

## Qué hay
| Ruta | Qué es |
|---|---|
| `/`, `/servicios/…`, `/especialidades/`, `/afiliacion/`, `/nosotros/` | Páginas públicas (estáticas) |
| `/directorio/` | Directorio médico con buscador y filtro por especialidad (sale de la base de datos) |
| `/acceso/` | Inicio de sesión único: cada rol cae en su panel |
| `/admin/` | Administrador: usuarios con roles, clientes afiliados, médicos del directorio, especialidades, consultas |
| `/medico/` | Panel del médico: sala de espera en vivo, atender por videollamada, historial |
| `/panel/` | Panel del cliente: entrar a la videollamada (sala de espera) e historial de conexiones |

## Desarrollo
```bash
npm install
cp .dev.vars.example .dev.vars     # y cambiar los valores
npm run db:local                   # crea las tablas y carga los 125 médicos del sitio anterior
node tools/usuario.mjs --rol admin --nombre "Tu nombre" --correo tu@correo.com
npm run dev                        # http://localhost:4321
npm test                           # prueba la base de datos, la sesión y la telemedicina
```
En Windows, si la ruta del proyecto es muy larga, el D1 local falla: poner `CF_STATE=C:/pm-state` en `.env`
y añadir `--persist-to C:/pm-state` a los comandos de wrangler.

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

## Datos
- `tools/scrape.mjs` sacó el directorio del WordPress anterior → `src/data/medicos.json` + fotos en `public/medicos/`.
- `tools/seed.mjs` lo convierte en `migrations/0002_seed.sql` (nombres de especialidades corregidos, duplicados unidos).
- Contenido fijo (servicios, horarios, teléfonos): `src/data/site.ts`.
