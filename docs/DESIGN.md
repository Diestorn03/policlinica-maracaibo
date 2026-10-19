# DESIGN.md · Policlínica Maracaibo · v2 «Misma marca, mejor experiencia»

> v1 («Los Anillos», identidad nueva) quedó DESCARTADA por Diego el 19-oct: la idea es la de los rediseños de
> ExpertsDDT y RenewWater → **mantener las bases del sitio actual** (fuentes, paleta, logo, textos, fotos, estructura de
> menú) y entregar una versión mejorada: mejor estructura, dinamismo, animaciones, eficiencia. Minimalista.
> Referencias: `Desktop/Rediseño ExpertsDDT` (tokens, nav de vidrio, menú circular, footer con texto fantasma,
> motor de movimiento por atributos) y `Desktop/Rediseño RenewWater`.

## Marca (sacada de policlinicamaracaibo.com)
- Fuentes: **Montserrat** (títulos 700–800) + **Open Sans** (texto, menú) → `@fontsource-variable/montserrat`, `open-sans`.
- Colores: azul `#014DB7` (botones/acento principal), celeste `#2EA3F2` (menú, líneas; nunca texto sobre blanco),
  marino `#24345F` (secciones oscuras, topbar), azul pizarra `#677BA5`, títulos `#333`, texto `#5c5c5c` (≈ #666),
  fondo lavanda `#EDEFFA` (secciones alternas), dorado `#FFB342` (campaña 70 años: acentos puntuales), WhatsApp `#25D366`.
- Logo: wordmark negro `src/assets/img/logo.png` (en fondos oscuros: `filter: brightness(0) invert(1)`). La cruz «+» del logo
  es el único motivo decorativo (marca de agua en cabeceras, `Icon name="cross"`).
- Estética: mucho blanco, tarjetas blancas con sombra suave y radio 20px, íconos de línea (como los del sitio actual,
  más finos), fotos reales de la clínica en marcos redondeados. Nada de anillos, arcos, temas de colores ni insignias.

## Ya hecho (base, no reescribir)
- `src/styles/global.css` — tokens y clases: `.wrap .section .section--mist .section--navy .eyebrow .h-display .h-xl .h-lg
  .lead .accent .underline-accent .stack .cta-row .grid-2/3/4 .btn(--primary|outline|ghost|white|wa|sm) .card(--grad)
  .pill(--gold) .img-frame .icon-badge .field .input .select .textarea .alert(--ok|error|info) .page-hero .crumbs .marquee`.
- `src/styles/privado.css` — app de paneles: `.app-bar .app-main .panel .tabs .table .badge(--ok|warn|off|live) .form-grid .btn--danger .icon-btn`.
- `src/layouts/Layout.astro` (público: topbar de emergencias, Header, Footer, WhatsApp flotante «¿Necesitas ayuda?», motion.js)
  y `src/layouts/Privado.astro` (`titulo`, `zona`, `usuario` → barra con nombre, rol y «Salir»; franja de demo; api.js).
- `src/components/Header.astro`, `Footer.astro` (id="contacto"), `ui/Icon.astro` (≈45 íconos), `ui/PageHero.astro`
  (`titulo, lead?, eyebrow?, migas?`), `ui/MedicoCard.astro` (`medico, lazy?`; lleva `data-clave` y `data-esp` para filtrar).
- `src/scripts/motion.js` — motor de ExpertsDDT adaptado, por atributos: `data-reveal="up|down|left|right|scale|blur|clip|drop|iris"`
  (+`data-delay`), `data-stagger`, `data-split="lines|words|chars"`, `data-parallax="0.3"`, `data-lit`, `data-count="125"`,
  `data-tilt`, `data-magnetic`, `data-glow`, `.marquee > .marquee__track`, y el héroe `#hero` (`data-pin` = escena fijada en escritorio):
  `.hero__bg img · .hero__dim · .hero__copy · .hero__eyebrow · .hero__title .w · .hero__lead · .hero__cta > * · .hero__media · [data-hero-next]`.
  Exporta `gsap, ScrollTrigger, SplitText, reduced, coarse, getLenis` para escenas propias. Sin JS / movimiento reducido: todo visible.
- Backend, datos y dos modos (servidor Cloudflare / demo GitHub Pages): ver `docs/BACKEND.md` (manda).

## Estructura (la del sitio actual, mejorada)
Menú: Servicios · Especialidades · Directorio médico · Afiliación · Nosotros · Contacto + «Acceder» + «Solicitar cita».
**Portada** (orden del sitio actual + lo nuevo):
1. Héroe `#hero data-pin`: «Celebrando tu bienestar» / desde 1952, foto de la clínica (inst-3) con parallax, CTAs Solicitar cita (WhatsApp) y
   Buscar médico; al bajar (escritorio) pasa a un capítulo con 4 accesos rápidos: Emergencias 24 h, Pedir cita, Directorio, Telemedicina.
2. Cifras con contador: desde 1952 · 125 médicos · 50 especialidades · emergencias 24 h (datos reales).
3. Servicios (los 9 del sitio actual, en su orden) como tarjetas blancas con ícono de línea + foto al pasar; `data-tilt`.
4. Marquesina de especialidades (desde la base) → enlaces al directorio.
5. «Tu cita en un click» (texto actual): horario L–V 8–4, central, emergencias, WhatsApp.
6. Buscador del directorio + algunos médicos con foto (MedicoCard).
7. Afiliación + telemedicina (teaser, precio POR CONFIRMAR → WhatsApp).
8. «Doctores y pacientes: ellos confían en nosotros» (3 testimonios actuales) con `data-lit` o tarjetas.
9. Contacto: teléfono, dirección + mapa, correo, horario (footer id="contacto" ya lo cubre; la portada puede llevar el mapa).
**Internas:** `PageHero` + contenido actual: /servicios/, /servicios/[slug]/, /especialidades/, /directorio/, /nosotros/ (misión, visión,
instalaciones), /afiliacion/, 404. **Privadas:** /acceso/, /panel/, /medico/, /admin/ con `Privado.astro` + privado.css.
