# Estado · 19-oct-2026, 17:15

## Listo y probado
- Backend (`npm test` pasa): D1 con 125 médicos / 50 especialidades, usuarios con roles, sesión, telemedicina (sala de espera,
  cola del médico, historial), modo demo estático para GitHub Pages (`npm run build:demo`) — ver `docs/BACKEND.md`.
- Repo público https://github.com/Diestorn03/policlinica-maracaibo · GitHub Pages activado (Actions): cada push a `main` publica la demo.
- Base visual v2 con la marca actual (ver `docs/DESIGN.md`): global.css, privado.css, Layout, Privado, Header, Footer,
  Icon, PageHero, MedicoCard, motion.js (motor de ExpertsDDT).

## Pendiente (en este orden)
1. Portada nueva (`src/pages/index.astro` + `src/components/home/*`) según DESIGN.md §Estructura.
2. Re-vestir con la base v2 las páginas que quedaron de v1 (importan componentes borrados): `servicios/index`, `servicios/[slug]`,
   `directorio/index` (+ `components/directorio/*`), `acceso`, `panel`, `medico` (+ `components/tele/*`). Crear: `especialidades`,
   `nosotros`, `afiliacion`, `404`, `admin/*`.
3. Verificar los dos builds (`npm run build`, `npm run build:demo`), capturas escritorio/móvil, y fusionar la rama a `main` → se publica la demo.

Trabajo en curso en la rama `rediseno-marca` (main sigue con la base sin páginas, no publica nada roto).
Servidores locales: `npm run dev` (4330) y `npm run dev:demo` (4331; no corren a la vez: Astro 7 lo impide).
