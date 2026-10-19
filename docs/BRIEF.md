# Brief · Rediseño Policlínica Maracaibo

Proyecto de Diego Cardozo para la materia Programación Web (lo pidió el profesor, que administra la web de la clínica).
Sitio actual: https://www.policlinicamaracaibo.com/ (WordPress + Divi, 2022, genérico). Se abandona WordPress.

## Qué hay que entregar (palabras del profesor)
1. La página nueva, moderna.
2. Las páginas de servicios que existen hoy (contenido copiado tal cual).
3. **Panel de administrador** para agregar, editar y eliminar médicos relacionados con una especialidad (hoy es el "Directorio médico").

## ALCANCE AMPLIADO (mensaje del profesor, 19-oct 3:12 pm) — manda sobre lo anterior
- Páginas: principal · servicios (9) · especialidades (~30) · directorio médico · **afiliación**: un plan que ofrece
  todos los servicios a un único precio e incluye **telemedicina** (precio POR CONFIRMAR: no inventar cifra, mostrar "Consulta el precio" + WhatsApp).
- **Administrador**: usuarios con **roles** (admin, médico, cliente) · agregar médicos · agregar clientes (afiliados) con todos sus datos
  (nombre, cédula, fecha de nacimiento, teléfono, correo, dirección, estado y vencimiento de la afiliación).
- **Panel del cliente** (/panel/): solo ve su historial de conexiones de telemedicina y un botón grande "Entrar a la videollamada".
  Al pulsarlo queda **en sala de espera** (pantalla de espera viva, tranquilizadora, con su posición) hasta que un médico lo atiende;
  entonces aparece/abre el enlace de la videollamada.
- **Panel del médico** (/medico/): ve **en vivo** quiénes están en espera (nombre, edad, tiempo esperando), pulsa "Atender" →
  se genera el enlace de la videollamada (el profe usaba Google Meet), atiende y marca "Finalizar". Ve su historial.
- Inicio de sesión único para los tres roles en /acceso/, cada rol cae en su panel.
- DESIGN.md debe cubrir también: /afiliacion/, /acceso/, /panel/ (cliente + sala de espera), /medico/ (cola en vivo) y el admin ampliado
  (usuarios, clientes, médicos del directorio, especialidades, consultas). En el reparto de archivos, añadir (E) telemedicina:
  src/pages/panel/*, src/pages/medico/*, src/pages/acceso.astro, src/components/tele/*; y /afiliacion/ va a (C).

## La clínica (datos reales, no inventar otros)
- Policlínica Maracaibo, **desde 1952** (74 años en 2026; su campaña de 2022 fue "70 años celebrando tu bienestar").
- Av. 8 Santa Rita, entre calles 70 y 71, Maracaibo, Venezuela · Mapa: https://goo.gl/maps/7dhbhw7Po3vPXWyW6
- Central (0261) 700-5100 · Emergencias +58 (0261) 700-5141 · Citas por WhatsApp +58 412-4248304
  (https://api.whatsapp.com/send/?phone=584124248304&text=Solicitud+de+cita)
- polimarweb@gmail.com · Instagram @policlinica_maracaibo · Emergencias abiertas 24 horas · Citas L–V 8 am–4 pm
- Misión: "Optimizar el funcionamiento de la institución, mediante un proyecto de mejora continua, respondiendo a las expectativas de la comunidad en general en la prestación de servicios de salud, preventivos y curativos con criterio de excelencia."
- Visión: "Lograr el mejoramiento continuo para afrontar oportunidades en el nuevo milenio, en la prestación de servicio, en atención holística con excelencia, contando con los recursos humanos capacitados, programas y pautas para el logro de sus objetivos y metas dirigidos a promocionar, restaurar y rehabilitar la salud."
- Testimonios: «Tienen a los mejores especialistas de la región, los recomiendo.» · «Excelente atención, conforme con el servicio prestado.» · «Orgullosa de pertenecer a esta gran familia.»

## Servicios (9, texto actual)
| slug | nombre | contenido actual | foto |
|---|---|---|---|
| tomografia | Tomografía | 7 am–5 pm. Algunos estudios requieren cita previa. | img/tomografia.jpg 2060×1374 |
| video-endoscopia | Video endoscopia | 8 am–2 pm, lunes a viernes. | img/video-endoscopia.jpg 720×1280 (vertical) |
| laboratorio | Laboratorio | 7 am–5 pm. Emergencias 24 horas. | img/laboratorio.jpg 1280×720 |
| especialidades | Especialidades | Lista de especialidades (sale de la base de datos) | — |
| cirugia | Cirugía | "Nuestro objetivo es ofrecer al paciente una asistencia integral que comprenda el diagnóstico y tratamiento de enfermedades que se resuelven por procedimientos quirúrgicos o potencialmente quirúrgicos tanto electivos como de urgencia y que asegure los más altos niveles de calidad." | img/cirugia.jpg 2074×1383 |
| uci | UCI | Infraestructura de alta tecnología · Personal altamente capacitado en medicina crítica · Banco de sangre, laboratorio y radiología completa en el área física, disponibles 24 h. | img/uci.jpg 576×581 |
| cirugia-bariatrica | Unidad de Cirugía Bariátrica | "Integrada por especialistas en cirugía bariátrica, medicina interna, endocrinología, psiquiatría, gastroenterología, además de psicólogos y nutricionistas, quienes de manera coordinada te brindarán apoyo y acompañamiento para mejorar tus hábitos nutricionales y optimizar tu salud." | img/bariatrica.jpg 2074×1383 |
| rayos-x | Rayos X | 7 am–5 pm. Algunos estudios requieren cita previa. | img/rayos-x.jpg 2074×1383 |
| obstetrica-neonatal | Unidad Obstétrica Neonatal | "Su misión es la atención integral a las mujeres en el proceso del embarazo, parto y puerperio fisiológicos, estados patológicos relacionados con el embarazo." | img/obstetrica.jpg 720×700 |

## Directorio médico
125 médicos, 50 especialidades (`src/data/medicos.json`): nombre, especialidades (1 o más), teléfono, consultorio (p. ej. "2do Piso C Nro 28"), foto cuadrada 480×480 en `public/medicos/` (3 sin foto → necesitan un placeholder digno).

## Recursos visuales (`public/img/`)
- `logo.png` 413×114: wordmark negro "+Policlínica / MARACAIBO" (la cruz está integrada en la P), fondo transparente. `isotipo.png` 512×512.
- Fotos de la clínica (instalaciones, 2022, calidad media, tomadas con teléfono): `inst-1..7.jpg` (1280×720 aprox.), `home-1.jpg` y `home-2.jpg` 600×600, `home-3.jpg` 900×1600 vertical, más las de servicios.
- Color actual de marca: azul #014DB7. Campaña 70 años: azul marino + degradado cian/turquesa en forma de cruz + dorado. No hay manual de marca; la paleta nueva se puede proponer siempre que respete el logo.

## Stack (obligatorio, el mismo de las otras páginas de Diego)
Astro 7.4 · GSAP 3.15 (ScrollTrigger, SplitText) · Lenis 1.3.27 (solo escritorio) · fuentes self-hosted con `@fontsource-variable/*` · CSS propio con custom properties (sin Tailwind ni frameworks de UI) · Cloudflare Workers con `@astrojs/cloudflare` + D1 (SQLite) para el directorio y el admin.
Motor de movimiento a reutilizar: el registro de escenas de `C:/Users/diegoa.cardozo/Desktop/proservi-web/src/scripts/motion.js` (gsap.matchMedia con casos desktop / mobile / reduced, Lenis en escritorio, estado final visible sin JS).

## Originalidad (pedido explícito de Diego)
Diseño **completamente original**, no una plantilla. Se pueden reciclar detallitos y dinamismo de sus otras páginas
(`Desktop/proservi-web`, `Desktop/ssds-proyectos`, `Desktop/Rediseño VisualDents`, `Desktop/Rediseño ExpertsDDT`, `Desktop/Pagina GemPro/GEMPRO-web`),
pero **nada** de sus paletas, tipografías, escenas ni composiciones. Fuentes ya usadas en esas páginas (prohibidas aquí):
Big Shoulders, Instrument Sans, Instrument Serif, Martian Mono, Inter, Oswald, Sora, JetBrains Mono, Geist, Architects Daughter.

## Público y tono
Pacientes de Maracaibo de todas las edades (muchos mayores), familiares, médicos. Prioridades: confianza, claridad,
encontrar rápido a un médico o un servicio, llamar o escribir por WhatsApp en un toque. Moderno y vivo, nunca frío ni "startup".
Todo el texto en español de Venezuela.

## Requisitos no negociables
- Móvil primero (la mayoría entra desde el teléfono), escritorio espectacular.
- `prefers-reduced-motion` respetado; todo legible y usable sin JS.
- WCAG AA (contraste, foco visible, teclado, alt). Botones de llamada/WhatsApp grandes.
- Rendimiento: LCP < 2.5 s en 4G, imágenes optimizadas (astro:assets), JS solo donde hace falta.
