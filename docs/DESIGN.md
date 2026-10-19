# DESIGN.md · Policlínica Maracaibo · «Los Anillos»

Versión 1.0 · 19-oct-2026 · Fuente única de verdad del diseño. `docs/BRIEF.md` manda en alcance y datos; este documento manda en diseño, tokens, componentes, movimiento y reparto de archivos. Si algo aquí contradice un concepto previo, gana este documento.

Convenciones: **A, B, C, D, E** son los desarrolladores (sección 10). «D0–D5» son las capas de profundidad (D0 fondo, D1 forma grande lenta, D2 ornamento medio, D3 sujeto/foto, D4 texto, D5 partículas). «Escritorio» = modo `data-fx="desktop"` (≥ 900 px, puntero fino, sin movimiento reducido, no lite). Todo texto de interfaz va en español de Venezuela, tratamiento de **tú** (nunca «usted», nunca voseo), igual que la propia clínica en su campaña «70 años celebrando tu bienestar».

Reglas de oro, en orden:
1. Sin JS todo se lee, se llama y se escribe por WhatsApp. El HTML trae el estado final; JS solo esconde-para-revelar dentro de una escena, nunca antes.
2. Ningún dato inventado. Lo que no consta se muestra como «Consulta el precio» / «Consulta por WhatsApp» o queda como hueco previsto (sección 11).
3. Llamar, WhatsApp y Emergencias a un toque en cualquier pantalla pública.
4. Un solo hilo visual: los anillos. Nada de collage (ver 1.5).

---

## 1. Concepto

### 1.1 Nombre e idea

**Los Anillos.** Un árbol suma un anillo por año; la Policlínica Maracaibo lleva 74 desde 1952. El sitio es una revista viva con un solo hilo, el anillo: la cruz del logo es la médula, cada foto se ve a través de una apertura (círculo o arco «puerta»), y los números grandes en Fraunces **maduran** con el scroll, de trazo fino y afilado (1952) a redondo y pesado (hoy). La paleta sale del edificio real: el amarillo del bordillo de la entrada (visible en `inst-3.jpg` e `inst-6.jpg`), el verde lago de palmas y muros, la cal de pared al sol. Todo es plano y geométrico, con aire de modernismo venezolano de los 50 puesto en presente; sin sepia, sin nostalgia, sin azul clínico.

### 1.2 Por qué encaja con ESTA clínica

- El motivo **lleva información verdadera**: 74 anillos = 74 años. No es decoración; es el dato más fuerte de la marca.
- Es **cálido y humano**: las aperturas convierten fotos de teléfono (cables, cartel de tapabocas de 2022) en decisión de diseño y esconden su baja resolución.
- Es **legible para mayores**: cuerpo de 19 px, Atkinson Hyperlegible (diseñada para baja visión), botones de 56–72 px, contraste ≥ 5.8:1 en todo texto, cero lectura que dependa de hover.
- Es **seguro de implementar**: solo dos escenas largas (CSS `sticky` + `ScrollTrigger` scrub, **sin pin de GSAP**); el resto son disparos únicos. En móvil, cero pins y un solo scrub (palabras encendidas).
- Es **distinto de los otros sitios de Diego** (ver 1.5) y no se parece a la clínica-plantilla azul/cian de WordPress.

### 1.3 Puntajes (1–10)

| Criterio | Los Anillos (legado) | Cruz Cardinal | Corte Axial (diagnóstico) |
|---|---|---|---|
| Originalidad (no plantilla, no Diego) | 9 | 8 | 7 |
| Ajuste a clínica de 74 años y mayores (confianza, claridad) | 9 | 7 | 6 |
| Dinamismo / wow en escritorio | 8 | 9 | 8 |
| Calidad móvil | 8 | 7 | 7 |
| Accesibilidad | 8 | 7 | 7 |
| Rendimiento / viabilidad Astro 7 + GSAP 3.15 + Lenis | 7 | 6 | 6 |
| **Total /60** | **49** | **44** | **41** |

Por qué cada uno quedó donde quedó:
- **Los Anillos (49).** Único cuyo motivo central es un dato real de la clínica; paleta derivada del edificio; fotos de baja calidad rescatadas por aperturas; la escena más pesada (campo de anillos) es un solo elemento con `clip-path`. Debilidades: Fraunces completa pesa 121 KB y el campo de anillos puede causar moiré/estrés visual; ambas se controlan con reglas duras (sección 3).
- **Cruz Cardinal (44).** La mejor arquitectura de información (cuatro puertas: Emergencia, Cita, Médico, Llegar) y la mejor disciplina de accesibilidad (aro de foco en el padre del `clip-path`, marquesina con pausa). Pero la cruz es el tópico médico más repetido, hay riesgo de emblema protegido (cruz roja/verde), el recorte animado de `--w` corre en el hilo principal, y el alcance (273 nodos, duotono, cursor «+», plano SVG) es excesivo para un proyecto de curso.
- **Corte Axial (41).** Idea inteligente (placa → negatoscopio) pero es el más frío y tecnológico («nunca frío ni startup» en el brief), el héroe oscuro se acerca al héroe oscuro de SSDS, depende de **una sola foto** que además muestra datos de un paciente, y el carrusel horizontal con pin atrapa al teclado.

### 1.4 Qué se injerta (solo lo que refuerza el hilo de los anillos)

| De | Qué | Cómo se adapta a Los Anillos |
|---|---|---|
| Cruz | **Cuatro puertas** «¿Qué necesita hoy?» (IA de acciones) | Cuatro **arcos-puerta** (el arco 4:5 ya es motivo propio): Emergencias · Pedir cita · Buscar un médico · Telemedicina y afiliación. «Cómo llegar» queda como fila aparte. Sección H4. |
| Cruz | Cifras **derivadas de la base en cada petición** (125, 50) y «74» calculado con el año actual | Home y páginas que leen D1 en SSR; `resumen(db)` (se añade a `src/lib/db.ts` con su caso en `tests/db.check.mjs`) y `anos()` de `src/data/site.ts`. |
| Cruz | Aro de foco en el `<a>` padre, nunca en el elemento con `clip-path`; marquesina con pausa visible; cero botones magnéticos | Reglas de accesibilidad 9.1; botón «Pausar» junto a la cinta de retratos. |
| Cruz | Control de tamaño de letra de **tres pasos** | `A / A+ / A++` = 100 / 112.5 / 125 % (el concepto original tenía dos). |
| Cruz | Chips con las 8 especialidades con más médicos, derivadas del dato | En H7 y en `/directorio/`. |
| Cruz | Gate `lite` por hardware | `data-lite` en `<html>`; en lite el escritorio recibe el tratamiento móvil (sin escenas de scroll). |
| Diagnóstico | **Estado de las 8 especialidades sin médicos** («Consulta disponibilidad por WhatsApp» en vez de callejón sin salida) | `/especialidades/` y `/directorio/?esp=` vacío. |
| Diagnóstico | Normalizar teléfonos a `tel:+58…` (quitar el 0 inicial) | `telHref()` en `src/lib/sitio.ts`. |
| Diagnóstico | **Desenfocar el nombre de paciente en el monitor** de `rayos-x.jpg` y `tomografia.jpg` antes de publicar (verificado: ambas lo muestran, con fecha de 2022) | Tarea de assets (sección 4.0) con coordenadas exactas. |
| Diagnóstico | `object-position: 50% 22%` para retratos (las cabezas están arriba en las fotos de 480 px); `content-visibility:auto` bajo el pliegue; `prefers-contrast: more`; View Transitions solo dentro de `prefers-reduced-motion: no-preference` | Sección 9. |
| Diagnóstico | Chip «Abierto ahora» solo donde los días constan en los datos (Citas, Video endoscopia, Emergencias) | Reloj de 24 h (H5). |

### 1.5 Descartado a propósito (no se mezcla)

- Héroe oscuro, DICOM, etiquetas mono, láminas horizontales, barrido de escáner, carrusel horizontal con pin (Diagnóstico). Se parecen a lo ya hecho en SSDS y enfrían la marca.
- Pictogramas «cruz» para los 9 servicios, plano esquemático «Entre dos cruces», cursor «+», linterna a color, duotono, riel «El Eje», transición por rumbos cardinales, `clip-path` animado con `@property --w` (Cruz). Competirían con los anillos y el cursor/linterna dañan la puntería de mayores.
- Cabezal «Año LXXIV» (decorativo, muchos mayores no leen romanos). Se queda el folio `01 / 09`.
- Avatares con `home-1/2/3.jpg` en testimonios: son un retrato tipo carnet y selfis (uno con polo de otra institución). Poner caras junto a una cita sugiere que esa persona la dijo. **No se usan en ningún sitio.** Los testimonios llevan una comilla gigante en `--sol`, sin cara y sin nombre.
- De Diego (prohibido repetir): azul marino + naranja, héroes oscuros con pin, loader hexagonal, `El Arco` (círculo de view-transition desde el clic), `La Línea`, odómetro de dígitos, pareja cal + tan de VisualDents, y las fuentes Big Shoulders, Instrument Sans/Serif, Martian Mono, Inter, Oswald, Sora, JetBrains Mono, Geist, Architects Daughter, Archivo.

### 1.6 Correcciones al concepto ganador (decisiones del director creativo)

1. **H1 corregido**: «**74** años cuidando a Maracaibo.» (el concepto decía «Un 74 años», agramatical).
2. **Foto del héroe: `inst-3.jpg`** (entrada, bancas, palma y el bordillo amarillo dominante; el cartel de tapabocas es diminuto y queda parcialmente tapado por la columna), no `inst-6.jpg` (cartel grande y legible). `inst-6.jpg` pasa a la galería de `/nosotros/`.
3. **Render alineado con `docs/BACKEND.md`**: `prerender = false` solo donde la página lee D1: `/` (cifras 125/50, retratos, especialidades top), `/servicios/[slug]/` (médicos relacionados), `/especialidades/` y `/directorio/`. Estáticas: `/servicios/` (índice), `/afiliacion/`, `/nosotros/`, `/404`. **Las páginas estáticas no muestran cifras de la base** (ni 125 ni 50); solo `anos()` de `src/data/site.ts`, que se recalcula en cada build (hay que redesplegar cada 1 de enero; anotarlo en el README). Así ninguna cifra se queda vieja tras un alta o baja de médico.
4. **Sin «Deshacer» al eliminar** (haría falta borrado lógico y una migración): se elimina con diálogo de confirmación que repite el nombre. Hoy el esquema hace borrado duro.
5. **Palabras encendidas**: opacidad inicial **0.5** (no 0.18). Medido: crema al 40 % sobre lago da 2.74:1 (falla 3:1 de texto grande); al 50 % da 3.45:1 (pasa).
6. **Móvil de la escena de anillos**: disparo único (no scrub). Un campo grande con `clip-path` por scroll es demasiado en teléfonos modestos.
7. **Móvil del héroe**: sin iris en la carga (la foto es candidata a LCP). Solo `74` (cilindro + maduración de ejes) en primera visita.
8. **Fraunces**: se carga `full.css` (ejes `opsz`, `wght`, `SOFT`, `WONK`); `WONK` **no se anima** (afecta n/m/h, no dígitos). Se animan `wght` y `SOFT` (y `opsz` automático por tamaño).

---

## 2. Tokens

Todo vive en `src/styles/global.css` (A). Nadie define colores, radios ni duraciones fuera de estos tokens. Los componentes usan **tokens semánticos** (`--fondo`, `--texto`…) que cambia `[data-tema]`; así el mismo componente funciona sobre cal, brisa, lago o sol.

### 2.1 Color

```css
:root {
  /* Paleta (nombres de la clínica real: cal de pared, brisa del lago, sol del bordillo) */
  --cal:       #FFF7E8; /* fondo principal */
  --papel:     #FFFDF8; /* superficies elevadas: tarjetas, inputs, tablas */
  --brisa:     #DCEBE4; /* sección alterna fresca; fondo de filas y chips */
  --sol:       #FFC233; /* acento. SOLO relleno. Texto encima: --tinta. Nunca texto sobre claro */
  --sol-claro: #FFE29A; /* tinte: disco tras retratos, hover de filas, chips seleccionados */
  --lago:      #0B4F4A; /* marca oscura: botón Llamar, secciones invertidas */
  --lago-2:    #083B37; /* pressed de lago, footer, sidebar del admin */
  --tinta:     #17110D; /* texto, logo, bordes de 2 px */
  --tinta-2:   #4A4037; /* texto secundario, borde de inputs */
  --ph:        #6B6056; /* placeholder */
  --rojo:      #B3281A; /* SOLO Emergencias 24 h, errores, eliminar. Nunca decoración */
  --blanco:    #FFFFFF;
  --anillo:     rgba(23, 17, 13, .14);   /* líneas del campo de anillos sobre claro (decorativo) */
  --anillo-inv: rgba(255, 247, 232, .16); /* ídem sobre lago */
}

/* Temas de sección: <section data-tema="lago"> */
:root, [data-tema="cal"]  { --fondo: var(--cal);    --texto: var(--tinta); --texto-2: var(--tinta-2); --superficie: var(--papel);  --linea: var(--anillo);     --foco: var(--tinta); }
[data-tema="brisa"]       { --fondo: var(--brisa);  --texto: var(--tinta); --texto-2: var(--tinta-2); --superficie: var(--papel);  --linea: var(--anillo);     --foco: var(--tinta); }
[data-tema="lago"]        { --fondo: var(--lago);   --texto: var(--cal);   --texto-2: var(--brisa);   --superficie: var(--lago-2); --linea: var(--anillo-inv); --foco: var(--sol);   }
[data-tema="lago-2"]      { --fondo: var(--lago-2); --texto: var(--cal);   --texto-2: var(--brisa);   --superficie: var(--lago);   --linea: var(--anillo-inv); --foco: var(--sol);   }
[data-tema="sol"]         { --fondo: var(--sol);    --texto: var(--tinta); --texto-2: var(--tinta-2); --superficie: var(--papel);  --linea: var(--anillo);     --foco: var(--tinta); }
```

**Pares de contraste verificados** (luminancia relativa WCAG 2.x, calculados con script el 19-oct-2026; «AA txt» = 4.5:1, «AA grande/UI» = 3:1):

| Texto / elemento | Sobre | Ratio | Uso permitido |
|---|---|---|---|
| tinta | cal | 17.57 | todo texto |
| tinta | papel | 18.40 | tarjetas, inputs |
| tinta | brisa | 15.19 | secciones frescas, chips |
| tinta-2 | cal / papel / brisa | 9.48 / 9.93 / 8.20 | texto secundario, borde de inputs |
| tinta-2 | sol / sol-claro | 6.26 / 7.98 | texto secundario sobre acento |
| tinta | sol / sol-claro | 11.60 / 14.79 | botón sol, chips seleccionados |
| cal | lago / lago-2 | 8.84 / 11.66 | texto sobre secciones invertidas |
| blanco | lago | 9.41 | botón Llamar |
| brisa | lago / lago-2 | 7.64 / 10.08 | texto secundario invertido |
| sol | lago / lago-2 | 5.83 / 7.70 | subrayados y números sobre lago (≥ 19 px) |
| sol-claro | lago | 7.44 | acentos sobre lago |
| blanco | rojo | 6.49 | botón Emergencias |
| cal | rojo | 6.10 | tira de emergencias |
| rojo | cal / papel / brisa / sol-claro | 6.10 / 6.39 / 5.27 / 5.13 | texto de error y «Vencida» |
| lago | cal / papel / brisa / sol-claro | 8.84 / 9.26 / 7.64 / 7.44 | títulos y enlaces en lago |
| lago | sol | 5.83 | texto en lago sobre botón sol (no se usa; el texto sobre sol es tinta) |
| ph | papel | 6.02 | placeholder |

**Prohibidos (miden mal):** sol sobre cal **1.52** (jamás como texto ni borde informativo; todo botón sol lleva borde de 2 px `--tinta`); tinta sobre lago **1.99** (el foco sobre lago es `--sol`); tinta sobre rojo **2.88**; blanco sobre sol 1.61; palabras con opacidad < 0.5 sobre lago (2.74). `--anillo` sobre cal mide 1.34: **solo decorativo**, nunca porta información ni texto.

Foco (todas las superficies): `outline: 3px solid var(--foco); outline-offset: 3px;`. Sobre claro es tinta (≥ 15:1), sobre lago es sol (5.83:1). Si el elemento tiene `clip-path` o `overflow:hidden`, el aro va en el `<a>`/`<button>` padre sin recorte.

### 2.2 Tipografía

| Rol | Paquete npm (exacto) | Archivo CSS a importar | Familia CSS | Pesos/ejes |
|---|---|---|---|---|
| Display, titulares, números | `@fontsource-variable/fraunces@5.3.0` | **Públicas:** `@fontsource-variable/fraunces/full.css` (latin ≈ 121 KB; ejes `opsz` 9–144, `wght` 100–900, `SOFT` 0–100, `WONK` 0–1) y `@fontsource-variable/fraunces/wght-italic.css` (≈ 46 KB; lo importa **solo** `Testimonios.astro`, no el layout). **Privadas (admin, panel, médico, acceso):** `@fontsource-variable/fraunces/wght.css` (≈ 37 KB) | `'Fraunces Variable'` | Títulos 600–700; numerales maduran 300 → 800 |
| Texto, UI, formularios | `@fontsource-variable/atkinson-hyperlegible-next@5.3.0` | `@fontsource-variable/atkinson-hyperlegible-next/index.css` (latin ≈ 34 KB) | `'Atkinson Hyperlegible Next Variable'` | Cuerpo 450, énfasis 600, botones 700 |

Instalar con versión exacta (`npm i -E`), igual que el resto del `package.json`. No se instala ninguna otra fuente. No hay fuente mono.

```css
:root {
  --f-display: 'Fraunces Variable', 'Fraunces Fallback', Georgia, 'Times New Roman', serif;
  --f-texto:   'Atkinson Hyperlegible Next Variable', 'Atkinson Fallback', system-ui, 'Segoe UI', Arial, sans-serif;

  /* Escala. 1rem = 16 px. Cuerpo = 19 px. El control A/A+/A++ cambia la raíz (100/112.5/125 %). */
  --t-xs:   .9375rem;                                          /* 15: pies de foto, folios */
  --t-sm:   1rem;                                              /* 16: tablas del admin */
  --t-base: 1.1875rem;                                         /* 19: cuerpo público */
  --t-lg:   clamp(1.25rem, 1.15rem + .5vw, 1.5rem);            /* 20–24: lede */
  --t-xl:   clamp(1.5rem, 1.25rem + 1.1vw, 2.5rem);            /* 24–40: misión, citas, h4 */
  --t-2xl:  clamp(1.875rem, 1.5rem + 1.9vw, 2.75rem);          /* 30–44: h3 */
  --t-3xl:  clamp(2.25rem, 1.6rem + 3.2vw, 4rem);              /* 36–64: h2 */
  --t-4xl:  clamp(2.75rem, 1.8rem + 4.8vw, 5.5rem);            /* 44–88: h1 de páginas internas */
  --t-hero: clamp(2.75rem, 1.6rem + 4.4vw, 6.25rem);           /* 44–100: H1 de la portada */
  --t-num-m: clamp(7.5rem, 34vw, 11rem);                       /* «74» móvil */
  --t-num-d: min(22vw, 20rem);                                 /* «74» escritorio y numeral 1952→2026 */

  --lh-texto: 1.6; --lh-titulo: 1.08; --lh-num: .95;
  --medida: 62ch;                                              /* ancho máximo de párrafo */
}
body { font: 450 var(--t-base)/var(--lh-texto) var(--f-texto); color: var(--texto); background: var(--fondo); font-synthesis: none; text-wrap: pretty; }
h1,h2,h3 { font-family: var(--f-display); font-optical-sizing: auto; font-variation-settings: 'SOFT' 50, 'WONK' 0; line-height: var(--lh-titulo); text-wrap: balance; letter-spacing: -.01em; }
h1 { font-size: var(--t-4xl); font-weight: 700; } h2 { font-size: var(--t-3xl); font-weight: 650; } h3 { font-size: var(--t-2xl); font-weight: 600; }
h4 { font: 700 var(--t-xl)/1.2 var(--f-texto); }
html[data-tam="1"] { font-size: 112.5%; } html[data-tam="2"] { font-size: 125%; }

/* Numerales que maduran: máx. 2 nodos por página. Valores por defecto = estado final (sin JS) */
.numeral { font-family: var(--f-display); font-weight: var(--wght, 800); font-variation-settings: 'SOFT' var(--soft, 100), 'WONK' 0;
  line-height: var(--lh-num); font-variant-numeric: tabular-nums lining-nums; contain: layout paint; min-width: 4ch; }
```

Fallbacks: definir `@font-face 'Fraunces Fallback'` (`src: local('Georgia')`) y `'Atkinson Fallback'` (`src: local('Arial')`) con `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` calculados con `@capsizecss/metrics` (A los mide). Criterio de aceptación: CLS atribuible a fuentes ≤ 0.02. `font-display: swap` (ya lo trae fontsource). Precargar solo los dos `latin` normales con `?url` (`import f from '@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2?url'`) en `Layout.astro`.

Peso del texto: nunca `font-weight` < 450 en texto corrido. Los numerales de peso 300 (estado «1952») son decorativos y `aria-hidden`; el texto real siempre ≥ 600.

### 2.3 Espaciado, layout, radios, sombras, capas

```css
:root {
  --s-1:.25rem; --s-2:.5rem; --s-3:.75rem; --s-4:1rem; --s-5:1.5rem; --s-6:2rem; --s-7:3rem; --s-8:4rem; --s-9:6rem; --s-10:8rem;
  --gutter: clamp(1rem, .5rem + 2.5vw, 2.5rem);            /* mín. 16 px */
  --max: 78rem;                                            /* 1248 px */
  --sec: clamp(4rem, 3rem + 6vw, 9rem);                    /* padding vertical de sección */
  --tap: 3rem; --tap-lg: 3.5rem; --tap-xl: 4.5rem;         /* 48 / 56 / 72 px */
  --tira-h: 2.75rem; --header-h: 4rem; --barra-h: 4rem;    /* 44 / 64 / 64 px; header 4.5rem desde 900 px */

  --r-1: .5rem; --r-2: .875rem; --r-3: 1.5rem; --r-pill: 999px;   /* r-1 = admin (8 px) */
  --arco: 999px 999px 0 0;                                          /* borde-radius del arco «puerta» */

  --sombra-1: 0 1px 2px rgba(23,17,13,.12), 0 10px 24px -14px rgba(23,17,13,.35);  /* header, barra móvil, diálogos */
  --sombra-2: 0 24px 48px -24px rgba(23,17,13,.45);                                   /* solo menú y diálogos */

  --z-header: 50; --z-barra: 60; --z-menu: 80; --z-dialogo: 100; --z-skip: 200;
}
```

El diseño es plano: las sombras son excepción (superficies que flotan sobre contenido), no sistema.

### 2.4 Movimiento (tokens)

```css
:root {
  --d-micro: .3s; --d-ui: .6s; --d-reveal: 1.2s; --d-intro: 2.4s; --latido: 6s;   /* unidad: el latido de 0.6 s */
  --ease-out:     cubic-bezier(.16, 1, .3, 1);     /* expo.out: todo lo que «sale» (sol, iris, aperturas) */
  --ease-inout:   cubic-bezier(.45, 0, .55, 1);    /* power2.inOut: anillos y clip-path */
  --ease-texto:   cubic-bezier(.33, 1, .68, 1);    /* power3.out */
  --ease-cortina: cubic-bezier(.25, 1, .5, 1);     /* power4.out: líneas enmascaradas */
  --ease-pop:     cubic-bezier(.34, 1.56, .64, 1); /* back.out(1.4): solo '+', insignias, etiquetas pequeñas */
}
```

Equivalentes GSAP (usar estos nombres): `expo.out`, `power2.inOut`, `power3.out`, `power4.out`, `back.out(1.2–1.6)`. **Prohibido** `elastic`, `bounce`, `back` sobre texto corrido, `scramble`.

### 2.5 Puntos de corte

| Nombre | Valor | Efecto |
|---|---|---|
| **Móvil** | `< 900px` (`@media (max-width: 899.98px)`) | Layout de una columna, sin escenas de scroll, barra de acción inferior, menú a pantalla completa |
| Tablet/2 col | `≥ 600px` | Rejillas de 2 columnas |
| **Escritorio** | `≥ 900px` | Header con navegación, escenas (si `data-fx="desktop"`) |
| Ancho | `≥ 1200px` | Elementos laterales (rail de letras, previa fija) |

Las condiciones de **movimiento** no son solo ancho: `desktop` = `(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)` y no `lite`. Un portátil táctil o una tablet reciben el tratamiento móvil. Los custom properties no sirven en `@media`: usar los literales.

### 2.6 Preferencias del usuario (persisten en `localStorage`, siempre dentro de `try/catch`; la página funciona sin ellas)

| Clave | Valores | Efecto |
|---|---|---|
| `pm-tam` | `0` (A, 100 %) · `1` (A+, 112.5 %) · `2` (A++, 125 %) | `html[data-tam]` |
| `pm-mov` | `completo` · `reducido` | `reducido` fuerza `data-fx="reduced"` |
| `pm-intro` (sessionStorage) | `1` | la intro del héroe ya corrió en esta sesión |
| `pm-meet` | URL de Meet | enlace propio del médico (panel del médico) |
| `pm-aviso` | `1` | sonido de aviso activado (panel del médico) |

Script inline de `<head>` (A; ≈ 600 B, es lo único que corre antes del primer pintado):

```html
<script is:inline>
(function (d, w) {
  var h = d.documentElement, m = w.matchMedia, n = navigator, c = n.connection;
  var s = function (k, ss) { try { return (ss ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } };
  h.classList.add('js');
  var red = m('(prefers-reduced-motion: reduce)').matches || s('pm-mov') === 'reducido';
  var lite = (n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 4 || !!(c && c.saveData);
  var desk = !red && !lite && m('(min-width: 900px) and (pointer: fine)').matches;
  h.dataset.fx = red ? 'reduced' : desk ? 'desktop' : 'mobile';
  if (lite) h.dataset.lite = '1';
  var t = s('pm-tam'); if (t === '1' || t === '2') h.dataset.tam = t;
  // intro del héroe: solo escritorio, primera visita de la sesión; red de seguridad de 3 s por si el JS falla
  if (desk && !s('pm-intro', 1) && d.querySelector) { h.classList.add('intro'); setTimeout(function () { h.classList.remove('intro'); }, 3000); }
})(document, window);
</script>
```

CSS que depende de esto: los escenarios altos (`240–300vh`) solo existen bajo `html[data-fx="desktop"]`; los estados «escondidos para revelar» solo bajo `html.js`; `html.intro .hero [data-intro] { visibility: hidden }` (nunca los botones). En reduced: `html[data-fx="reduced"] *, @media (prefers-reduced-motion: reduce) { animation-duration:.001ms!important; animation-iteration-count:1!important; transition-duration:.001ms!important; scroll-behavior:auto!important }`.

---

## 3. Motivo firma: LOS ANILLOS y sus reglas

El anillo es la unidad. 74 años = 74 anillos. La cruz del logo es la médula.

### 3.1 Las siete apariciones del motivo

| # | Aparición | Clase / componente | Regla |
|---|---|---|---|
| 1 | **Campo de anillos** (héroe, escena 1952→2026, 404, login) | `.anillos` / `ui/Anillos.astro` | Un solo elemento con `repeating-radial-gradient`. Paso `--paso` ≥ **6 px** (9 px por defecto), línea de 1 px, alfa ≤ **.14** (`--linea`). Máscara radial que lo apaga hacia el texto. **Nunca detrás de texto corrido.** Nunca dos campos a la vez en pantalla ni uno animado contra otro (moiré). Estático en reduced/lite. Tamaño ≤ 1300 px. Sobre lago usa `--anillo-inv` (ya lo da `--linea`). |
| 2 | **Apertura circular** (fotos de instalaciones, retratos) | `.apertura--circulo` / `ui/Apertura.astro` | Marco doble: 10 px `--cal` + 2 px `--tinta` (en temas oscuros: 10 px `--lago` + 2 px `--cal`). El `clip-path` animado va en el hijo `.apertura__img`; el marco es un hermano (`::after`) para que el recorte no lo corte. |
| 3 | **Arco «puerta»** (servicios, puertas de acción) | `.apertura--arco` | 4:5, `border-radius: var(--arco)`. Misma regla de marco. |
| 4 | **Latido** (punto vivo: héroe, «Abierto ahora», aviso «Guardado» del admin, sala de espera) | `.latido` | Pseudo-anillo `scale 1→2.6`, `opacity .55→0`, 3.2 s cada 6 s. Solo `transform`/`opacity`. Pausa fuera de viewport (IO) y en reduced/lite. Máximo **un** latido por pantalla. |
| 5 | **Reloj de 24 h** (un anillo por servicio, arco = horario) | `ui/Dial.astro` | Medianoche arriba. Ver H5. `aria-hidden`; la lista HTML es el contenido accesible. |
| 6 | **Semicírculo de amanecer** (divisores y cierre, en vez de olas) | `.amanecer` | Medio círculo `--sol` o `--sol-claro`; estático salvo el desplazamiento de H10. |
| 7 | **El «+»** (viñeta, marca de foco, partícula, médula) | `.mas` | Dos barras con grosor **24 %** del lado (el «+» del logo mide 22–25 %). Color: `--tinta`, `--lago`, `--cal`, `--sol`. **Nunca rojo ni verde sobre blanco** (emblema de Cruz Roja / farmacia). Nunca dentro del botón de Emergencias. |

```css
.mas { --g: 24%; display: inline-block; inline-size: 1em; block-size: 1em; flex: none;
  background: linear-gradient(currentColor,currentColor) center / var(--g) 100% no-repeat,
              linear-gradient(currentColor,currentColor) center / 100% var(--g) no-repeat; }
.anillos { --paso: 9px; aspect-ratio: 1; border-radius: 50%; pointer-events: none;
  background: repeating-radial-gradient(circle at 50% 50%, transparent 0 calc(var(--paso) - 1px), var(--linea) calc(var(--paso) - 1px) var(--paso));
  -webkit-mask: radial-gradient(circle, #000 52%, transparent 74%); mask: radial-gradient(circle, #000 52%, transparent 74%); }
.apertura { position: relative; isolation: isolate; }
.apertura__img { inline-size: 100%; block-size: 100%; object-fit: cover; }          /* recibe el clip-path animado */
.apertura--circulo { aspect-ratio: 1; border-radius: 50%; } .apertura--arco { aspect-ratio: 4/5; border-radius: var(--arco); }
.apertura::after { content:''; position:absolute; inset:0; border-radius: inherit; pointer-events:none;
  box-shadow: 0 0 0 10px var(--cal), 0 0 0 12px var(--tinta); }                     /* marco doble; en [data-tema=lago]: --lago y --cal */
```

### 3.2 Numerales que maduran (la firma tipográfica)

Estado «1952»: `--wght:300; --soft:0` (fino, afilado; `opsz` automático alto). Estado «hoy»: `--wght:800; --soft:100` (pesado, redondo). Solo **dos nodos** por página (el «74» del héroe y el numeral 1952→2026), con `contain: layout paint` y `min-width: 4ch` para no provocar reflujo. En el numeral 1952→2026 cada dígito tiene un desfase de `.08` en el scrub, así que maduran de izquierda a derecha. El HTML trae siempre el estado final (800/100).

### 3.3 Fotografía: el tratamiento común

Fotos de teléfono de calidad dispar se unifican así (clase `.foto-tratada`): `filter: contrast(1.04) saturate(1.05)` + velo de `--sol` al 22 % con `mix-blend-mode: soft-light` (en `data-lite` se sustituye por `background: rgb(255 194 51 / .10)` sin blend) + el mismo grano estático. Aperturas recortan los cables. **Ampliación máxima 1.25× la fuente** (el héroe a pantalla completa solo vive bajo velo lago; la capa de imagen tiene `max-inline-size: 1600px` centrada, y a los lados continúa el lago). `cirugia.jpg` es casi negra: `brightness(1.25)` + velo lago.

---

## 4. Componentes compartidos (los entrega A; B, C, D y E los consumen)

### 4.0 Datos, helpers y assets que A entrega primero

Estado actual del repo (ya hecho por backend, **no reescribir**: `src/lib/{auth,db,tele,usuarios}.ts`, `src/middleware.ts`, `src/pages/api/*`, `src/pages/fotos/*`, `migrations/*`; ver `docs/BACKEND.md`). Imágenes ya movidas a `src/assets/img/` (usar `<Image>`/`<Picture>` de `astro:assets`). Contenido fijo en `src/data/site.ts`: `clinica`, `anos()`, `servicios` (8, con `imagen`, `detalle[]`, `horario?`, `especialidad?`), `testimonios`, `instalaciones`, `fotosInicio`, `afiliacion`, `nav`.

**A extiende `src/data/site.ts` (solo añadir/corregir; no romper los nombres existentes):**

| Cambio | Detalle |
|---|---|
| Corregir `resumen` de Tomografía y Rayos X | Hoy dicen «de lunes a viernes»; **el dato no consta** (fuente: «7 am–5 pm. Algunos estudios requieren cita previa»). Usar «Estudios tomográficos con cita previa en algunos casos.» y «Estudios radiológicos con cita previa en algunos casos.» |
| `clinica.emergencias.texto` | `'+58 (0261) 700-5141'` (con prefijo, como en el brief) |
| Campos nuevos por servicio | `num` (1–9, orden del sitio actual con Especialidades en 4.º), `dato` (línea corta real: ver H6), `tema` (`'brisa'` \| `'sol'` \| `'lago'`), `alt` (alt de la foto), `pos` (`object-position`) |
| `indiceServicios` | Los 9 en orden: Tomografía, Video endoscopia, Laboratorio, **Especialidades** (`href: '/especialidades/'`, sin foto), Cirugía, UCI, Unidad de Cirugía Bariátrica, Rayos X, Unidad Obstétrica Neonatal. Cada ítem: `{ slug, nombre, href, dato, num, tema, imagen?, alt?, pos? }`. `/servicios/especialidades/` **no existe**: `[slug].astro` redirige 301 a `/especialidades/`. |
| `horarios: Horario[]` | Estructurado para el Reloj y «Abierto ahora» (ver abajo) |
| `hitos` | `[{ anio: 1952, texto: 'Comenzamos' }, { anio: 2022, texto: '70 años celebrando tu bienestar' }]`; el año actual se agrega en código (`{ anio: clinica.desde + anos(), texto: 'y seguimos' }`). **No inventar más**: la clínica añadirá los suyos aquí. |
| `instalaciones[].alt` y `.pie` | Reemplazar el alt genérico por los de la tabla 4.0.3 |
| No importar `fotosInicio` | `home-1/2/3.jpg` no se usan (ver 1.5). |

```ts
// src/data/site.ts (añadido)
export interface Horario { id: string; nombre: string; desde: number; hasta: number; dias?: number[]; h24?: boolean; nota?: string; servicio?: string }
// dias: 0 = domingo … 6 = sábado. Sin `dias` = el dato no trae días: se muestra el horario y NO se calcula «Abierto ahora».
export const horarios: Horario[] = [
  { id: 'emergencias',      nombre: 'Emergencias',      desde: 0, hasta: 24, dias: [0,1,2,3,4,5,6], h24: true, nota: 'Abiertas las 24 horas' },
  { id: 'citas',            nombre: 'Citas',            desde: 8, hasta: 16, dias: [1,2,3,4,5], nota: 'Lunes a viernes' },
  { id: 'tomografia',       nombre: 'Tomografía',       desde: 7, hasta: 17, servicio: 'tomografia', nota: 'Algunos estudios requieren cita previa' },
  { id: 'rayos-x',          nombre: 'Rayos X',          desde: 7, hasta: 17, servicio: 'rayos-x',    nota: 'Algunos estudios requieren cita previa' },
  { id: 'laboratorio',      nombre: 'Laboratorio',      desde: 7, hasta: 17, servicio: 'laboratorio', nota: 'Emergencias 24 horas' },
  { id: 'video-endoscopia', nombre: 'Video endoscopia', desde: 8, hasta: 14, dias: [1,2,3,4,5], servicio: 'video-endoscopia', nota: 'Lunes a viernes' },
];
```

**A crea `src/lib/sitio.ts`** (funciones puras, sin D1; con `tests/sitio.check.mjs` y `npm test` encadenado: `node tests/db.check.mjs && node tests/sitio.check.mjs`):

| Función | Contrato |
|---|---|
| `telHref(n: string)` | `'0414-1640799'` → `'tel:+584141640799'`; `'(0261) 700-5100'` → `'tel:+582617005100'`; si ya trae `+`, conserva los dígitos; vacío → `''` |
| `waHref(texto = 'Solicitud de cita')` | `https://api.whatsapp.com/send/?phone=584124248304&text=` + `URLSearchParams` (espacios como `+`, igual que el enlace oficial) |
| `iniciales(nombre: string)` | Quita «Dr./Dra.»; con ≥ 3 palabras = 1.ª letra de la 1.ª palabra + 1.ª letra de la **penúltima** (primer apellido); con 2 = primera + última. `Dra. Rossy Vera` → `RV`; `Dra. Neyla Carolina Soto León` → `NS` |
| `estaAbierto(h: Horario, ahora = new Date())` | `true`/`false` si `h.dias` existe; `null` si no (no se calcula). Hora de Maracaibo = UTC−4 fija (sin horario de verano): `new Date(ahora.getTime() - 4*3600e3)` y leer con `getUTC*`. `hasta` es exclusivo. |
| `fechaCaracas(s: string, opts?)` | `aFecha(s)` (de `tele.ts`) formateado con `Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', … })`. Variantes: `'19 de octubre de 2026'`, `'3:20 p. m.'` |
| `duracion(desde: string, hasta: string \| null)` | Minutos enteros o `null` |
| `esperando(creada: string, ahora?: Date)` | `'07:32'` (mm:ss) o `'1 h 05 min'` |

**A añade a `src/lib/db.ts`** (con casos en `tests/db.check.mjs`): `resumen(db) → { medicos, especialidades, top: {slug, nombre, total}[] /* las 8 con más médicos */ }` y `retratosDelDia(db, n = 12) → Medico[]` (solo médicos con foto, orden por `clave`, empezando en `(díaDelAño × 5) mod N`, circular: rota cada día y reparte la vitrina entre todos).

#### 4.0.1 Tareas de imágenes (A; antes de que nadie las use)

| Archivo (`src/assets/img/`) | Tarea |
|---|---|
| `rayos-x.jpg` (2074×1383) | **Privacidad.** El monitor muestra nombre de paciente y fecha (verificado). Desenfocar gaussiano σ ≥ 12 el rectángulo **x 1015–1460, y 515–600** (franja superior de datos del monitor). Sobrescribir el archivo (no conservar el original en el repo). |
| `tomografia.jpg` (2060×1374) | Ídem (verificado): rectángulo **x 520–885, y 650–720**. |
| `inst-3.jpg` (1280×720) | Retocar (clonar piedra) el cartel de tapabocas parcialmente visible: **x 630–648, y 88–132**. Es la foto del héroe. |
| `inst-6.jpg` (1280×720) | Ídem, cartel grande: **x 552–608, y 156–204**. |
| `inst-4.jpg` | Horizonte inclinado (~6–8°): nivelar si se usa en arco; en círculo se tolera. |
| `public/robots.txt` | `Disallow: /admin /panel /medico /acceso /api /fotos` |
| `src/assets/grano.svg` | Grano estático `feTurbulence`, ≤ 2 KB, como `background-image` al 6–8 % de opacidad |
| `src/assets/img/isotipo.svg` (opcional) | Vectorizar `isotipo.png` (potrace/Inkscape) para usarlo grande (404, acceso). Sin él, usar el PNG. Los «+» pequeños son CSS (`.mas`), no el isotipo (el isotipo real es una cruz con el bucle de la «P» a la derecha, no un «+» simétrico). |
| OG | `og.jpg` 1200×630 recortado de `inst-3.jpg` (generado en build o a mano en `public/`) |

#### 4.0.2 Qué foto va dónde (recortes y alt)

| Foto | Uso | `object-position` / recorte | Alt |
|---|---|---|---|
| `inst-3` | Héroe→casa (H1), OG, `/afiliacion/` | Entrada + palma + bordillo en el centro del disco: ≈ 47 % × 45 % de la fuente | Entrada de la Policlínica con bancas de concreto, una palma y el bordillo amarillo |
| `laboratorio` (1280×720) | Servicio laboratorio, previa H6 | `60% 40%` (la mejor foto con persona; cálida) | Profesional del laboratorio observando una muestra al microscopio |
| `tomografia` (blur hecho) | Servicio | `72% 55%` (tomógrafo) | Sala de tomografía: el equipo al fondo y la estación de lectura al frente |
| `rayos-x` (blur hecho) | Servicio | `30% 45%` (médico y monitor) | Médico revisando una imagen en el monitor de la sala de radiología |
| `video-endoscopia` (720×1280 vertical) | Servicio | Arco 4:5 `50% 30%`, máx. 420 px de alto | Sala de video endoscopia con camilla y torre de equipos |
| `cirugia` (casi negra) | Servicio, tema `lago` | `brightness(1.25)` + velo lago; texto solo sobre panel sólido | Equipo quirúrgico durante una intervención, bajo la lámpara del quirófano |
| `uci` (576×581) | Servicio | **Nunca > 360 px de ancho**, con grano | Cama de la unidad de cuidados intensivos con monitor y ventilador |
| `bariatrica` | Servicio | `50% 58%` (las dos personas; el logotipo UCOM es de la unidad, puede asomar, nunca se recolorea) | Recepción de la Unidad de Cirugía Bariátrica con dos integrantes del equipo |
| `obstetrica` (720×700) | Servicio | **Nunca > 360 px de ancho** | Sala de atención obstétrica con cama de parto y lámpara |
| Especialidades | Fila 4 del índice | Sin foto: disco `--sol` + isotipo + 3 anillos | — (decorativo) |

#### 4.0.3 Galería de instalaciones (`instalaciones[]` → `/nosotros/`)

| Foto | Pie | Alt |
|---|---|---|
| `inst-1` | Fachada de piedra y jardín | Esquina de la Policlínica con muro de piedra y césped |
| `inst-2` | Vista desde la calle | La Policlínica vista desde la esquina, con sus dos plantas y jardineras |
| `inst-3` | La entrada | Entrada de la Policlínica con bancas de concreto, una palma y el bordillo amarillo |
| `inst-4` | El frente | Fachada de la Policlínica con reja, jardineras y cielo azul |
| `inst-5` | Acceso a Emergencia | Fachada desde la esquina, con el letrero de Emergencia a la izquierda |
| `inst-6` | Entrada y estacionamiento | Entrada con una banca de concreto, palmas y estacionamiento |
| `inst-7` | Calle y jardineras | Frente de la clínica con reja blanca y plantas trepadoras |

Las fotos de instalaciones traen cables sobre el cielo: siempre en apertura (círculo/arco) o bajo velo; nunca a sangre sin velo.

### 4.1 `src/layouts/Layout.astro` (público) y `src/layouts/Privado.astro`

```ts
// Layout.astro
interface Props {
  titulo: string;               // se emite «{titulo} · Policlínica Maracaibo» (la portada: «Policlínica Maracaibo · Desde 1952»)
  descripcion?: string;         // meta description (≤ 160 car.)
  tema?: 'cal' | 'brisa' | 'lago' | 'lago-2' | 'sol'; // tema del <body> (por defecto cal)
  tira?: boolean;               // tira roja de emergencias (por defecto true)
  barra?: boolean;              // barra de acción móvil (por defecto true)
  og?: ImageMetadata;           // imagen social (por defecto og.jpg)
  schema?: object;              // JSON-LD extra; el layout ya emite MedicalClinic con dirección y teléfonos reales
  noindex?: boolean;
  cache?: boolean;              // páginas SSR públicas: Cache-Control: public, max-age=60 (por defecto true)
}
```
Estructura: `<html lang="es-VE">` → script inline (2.6) → fuentes (`full.css`, `index.css`; precarga de los dos `latin` normales) → `global.css` → `<a class="skip" href="#contenido">Saltar al contenido</a>` → `Tira` → `Header` → `<main id="contenido" tabindex="-1">` (slot) → `Footer` → `BarraAccion`. Carga `src/scripts/motion.js` y `src/scripts/chrome.js` como módulos. `@view-transition { navigation: auto }` solo dentro de `@media (prefers-reduced-motion: no-preference)`; `header` y `barra` llevan `view-transition-name` propio (no se barren); animación de página: fundido de 300 ms con 12 px de ascenso.

`Privado.astro`: `{ titulo, descripcion?, rol?: 'admin' | 'medico' | 'cliente' | 'acceso' }`. Siempre `noindex`. **No carga** `motion.js`, GSAP ni Lenis; carga `wght.css` de Fraunces, Atkinson, `global.css` (tokens) y `privado.css` (formularios, tablas, avisos), y el script inline de preferencias (tamaño de letra y movimiento). Sin tira, sin barra de acción, sin footer público: cada zona pone su propio chrome (D: `AdminShell`, E: `TeleShell`). Slot único.

### 4.2 Tira de emergencias, Header y menú móvil

**Tira** (`ui/Tira.astro`, no pegajosa, 44 px móvil / 40 px escritorio): enlace completo `tel:+582617005141`, fondo `--rojo`, texto `--blanco` 700 17 px: «Emergencias 24 horas · +58 (0261) 700-5141». Contraste 6.49:1.

**Header** (`Header.astro`): altura 64 px (móvil) / 72 px (escritorio), fondo = tema de la sección que queda debajo (cal por defecto), filete inferior de 1 px `--linea`. Contenido:

| Zona | Móvil | Escritorio |
|---|---|---|
| Izquierda | `Logo` (ancho mín. 140 px) | `Logo` + **insignia 74** (`<span data-insignia-74>`: anillo de 48 px con «74» en Fraunces 700 y «años» debajo, `aria-label="74 años"`; se enciende `.is-on` cuando el «74» del héroe llega) |
| Centro | — | `nav` de `site.ts` (`Servicios · Especialidades · Directorio médico · Afiliación · Nosotros`), 17 px 600, subrayado de anillo en `aria-current="page"` |
| Derecha | Botón **«Menú»** con texto (48×56 px mín.) | `Acceder` (`.btn--borde`, 48 px, → `/acceso/`) + `Pedir cita` (`.btn--sol`, 48 px, WhatsApp) |

Comportamiento: **escritorio siempre visible**; **móvil se esconde al bajar** (> 80 px) y reaparece al subir. El tema del header cambia (logo negro ↔ blanco con `filter: invert(1)`) con `IntersectionObserver` sobre `[data-tema]` y `rootMargin: '0px 0px -95% 0px'`; una sección puede forzarlo con `data-header-tema`. El `Logo` nunca se recolorea salvo a blanco; espacio mínimo = alto de la cruz.

**Menú móvil**: `<dialog id="menu" class="menu" data-lenis-prevent>` abierto con `showModal()`; botón «Menú» con `aria-expanded`/`aria-controls`; botón «Cerrar» con texto + Esc. Contenido: enlaces del `nav` en Fraunces 32 px, filas de 64 px; luego tres botones grandes apilados de 72 px (Llamar a la central, Pedir cita por WhatsApp, Emergencias); `Acceder`; controles de preferencias (4.4). Al abrir: `lenis?.stop()`; al cerrar: `start()` y foco al botón «Menú». **Sin JS**: no hay `<dialog>`; el `nav` queda como fila envuelta bajo el logo y el botón «Menú» no se muestra (`html:not(.js) #abrir-menu { display:none }`).

### 4.3 Barra de acción móvil (`ui/BarraAccion.astro`)

Solo móvil (< 900 px). Fija abajo, 64 px + `env(safe-area-inset-bottom)`, fondo `--papel`, filete superior, 3 columnas iguales: **Llamar** (`.btn--lago`, `tel:` central), **WhatsApp** (`.btn--sol`), **Emergencias** (`.btn--rojo`, `tel:` emergencias). Icono + una palabra de 16 px 700. CSS puro (enlaces reales); sin pulso. `body` recibe `padding-bottom: calc(var(--barra-h) + env(safe-area-inset-bottom))` en móvil. Se oculta mientras un elemento `[data-fab-hide]` está en pantalla (IO en `chrome.js`): `transform: translateY(110%)` y `visibility: hidden` al terminar la transición (no queda enfocable). No aparece en `/acceso/`, `/panel/`, `/medico/`, `/admin/`.

### 4.4 Footer (`Footer.astro`)

Fondo `--lago-2`, texto `--cal`. Logo blanco; tres columnas: **Servicios** (los 9 enlaces del `indiceServicios`), **La clínica** (Nosotros, Especialidades, Directorio médico, Afiliación, Acceder), **Contacto** (Central, Emergencias, WhatsApp, correo, Instagram, dirección con «Cómo llegar», horarios: «Emergencias abiertas las 24 horas» y «Citas de lunes a viernes, de 8:00 a. m. a 4:00 p. m.»). Fila de preferencias: **Tamaño de letra** `A  A+  A++` (3 botones de 48 px, `aria-pressed`) y **Movimiento: Activado/Reducido** (botón de 48 px, `aria-pressed`). Abajo: «© {año} Policlínica Maracaibo · Desde 1952» y el gigante «desde 1952» en Fraunces ~18vw, `aria-hidden`, recortado por el borde inferior (translateY 30 %; parallax `y -12%` con `scrub:true` en escritorio; estático en el resto), con 3 «+» decorativos. Enlace discreto «Acceso» a `/acceso/`.

### 4.5 Botones (`.btn`)

Base: `min-height: var(--tap-lg)` (56 px), padding `0 1.75rem`, `border-radius: var(--r-pill)`, 700 `1.0625rem` Atkinson, `border: 2px solid transparent`, icono opcional a la izquierda (24 px). Transición de `background`/`transform` 0.3 s; hover `translateY(-1px)`; **nada magnético**.

| Clase | Fondo / texto / borde | Uso |
|---|---|---|
| `.btn--lago` | `--lago` / `--blanco` (9.41) | Llamar, acción primaria. Hover `--lago-2` |
| `.btn--sol` | `--sol` / `--tinta` (11.60) / borde 2 px `--tinta` | WhatsApp, Pedir cita, Buscar. Hover `--sol-claro` |
| `.btn--rojo` | `--rojo` / `--blanco` (6.49) | Solo Emergencias y Eliminar |
| `.btn--cal` | `--cal` / `--tinta` | Sobre lago |
| `.btn--borde` | transparente / `--texto` / borde 2 px `--texto` | Secundaria («Buscar un médico», «Acceder») |
| `.btn--grande` | `min-height: 72px`, 1.25 rem | Cierre, sala de espera, panel |
| `.btn--bloque` | `inline-size: 100%` | Móvil |
| `.btn--enlace` | sin fondo, subrayado grueso `--sol` (solo sobre lago/tinta) o `--lago` | Enlaces de acción con flecha |

Estado `[aria-disabled="true"]`: opacidad 1, fondo `--brisa`, texto `--tinta-2`, sin hover (no usar `opacity` para atenuar: baja el contraste). Cargando: `aria-busy="true"` + texto «Entrando…».

### 4.6 Iconos (`ui/Icono.astro`)

`<Icono nombre="llamar" tam={24} titulo?="…" />`. SVG inline 24×24, trazo 2.5, `stroke-linecap: round`, `currentColor`; `aria-hidden="true"` salvo que lleve `titulo`. Nombres: `llamar, whatsapp, emergencia, ubicacion, correo, instagram, flecha, buscar, menu, cerrar, mas, check, alerta, reloj, video, usuario, salir, ojo, ojo-tachado, copiar`. `emergencia` es una **cúpula con base** (sirena), nunca una cruz. `whatsapp` e `instagram` usan los glifos de marca de uso permitido (enlaces).

### 4.7 Chips (`ui/Chip.astro` / `.chip`)

`{ texto, href?, activo?, tono?: 'brisa' | 'sol' | 'lago' | 'rojo', icono? }`. Altura 40 px (decorativo) o **48 px (interactivo)**; padding `0 1rem`; 600 `1rem`; fondo `--brisa`, texto `--tinta` (15.19). Seleccionado: fondo `--sol-claro` + borde 2 px `--tinta` + icono `check` (**nunca solo color**). Estados de afiliación (admin y panel): `Vigente` (brisa + check), `Por vencer` (sol-claro + reloj), `Vencida` (sol-claro + texto `--rojo` + alerta), `Suspendida` (papel + borde `--tinta-2`).

### 4.8 Tarjeta de servicio (`ui/ServicioCard.astro`)

`{ item: IndiceServicio, variante: 'arco' | 'fila' }`. Toda la tarjeta es **un único `<a>`** (el aro de foco va en el `<a>`; el recorte está en el hijo). `arco`: foto en `.apertura--arco` 4:3 en móvil / 4:5 en escritorio con tratamiento `.foto-tratada`, folio `01` (Atkinson 700 15 px, `--texto-2`), nombre en Fraunces 600 `--t-2xl`, `dato` de una línea, flecha. `fila` (móvil del índice y `/servicios/`): 72 px, folio + nombre + flecha. La imagen lleva `view-transition-name` **solo en `pageswap`** del elemento pulsado (ver 8.6). Servicio sin foto (Especialidades): disco `--sol` + isotipo + 3 anillos.

### 4.9 Tarjeta de médico (`ui/MedicoCard.astro`) y monograma

`{ medico: Medico /* de lib/db.ts */, variante?: 'tarjeta' | 'retrato' | 'fila', prioridad?: boolean }`.

- **`tarjeta`** (directorio, servicios relacionados): fondo `--papel`, borde 1 px `--linea`, `--r-2`. Retrato circular 96 px (móvil: a la izquierda; ≥ 600 px: arriba centrado a 120 px) sobre disco `--sol-claro` con `mix-blend-mode: multiply` (iguala el fondo gris/blanco de las fotos; en `data-lite` sin blend) y `object-position: 50% 22%`; nombre en Fraunces 600 22 px («Dra. Nuris Añez»); hasta 3 chips de especialidad + «+N»; consultorio con icono `ubicacion`: «2do Piso C Nro 28»; botón **«Llamar»** 48 px con `tel:` = `telHref(medico.telefono)` y `aria-label="Llamar a {nombre}"` (visible: icono + «Llamar» + número en 16 px). Sin teléfono: botón «Consultar por WhatsApp» con texto «Cita con {nombre}».
- **`retrato`** (cinta de H7): solo disco 120/160 px + nombre + 1.ª especialidad; enlaza a `/directorio/?q={nombre}`.
- **`fila`**: una línea de 64 px para listas densas.
- **Sin foto** (`foto === ''`; hoy 3: Dra. Rossy Vera, Dra. Mariela Fox, Dra. Neyla Carolina Soto León): `ui/Monograma.astro` = iniciales (`iniciales()`) en Fraunces 700 sobre disco `--sol` con dos anillos finos de 1 px (`--linea`), mismas dimensiones que el retrato. **Nunca** «foto pendiente» ni silueta genérica.
- Imagen siempre con `width`/`height` declarados (cero CLS); `loading="lazy" decoding="async"`, salvo `prioridad`.

### 4.10 Buscador (`ui/Buscador.astro`)

`{ action = '/directorio/', q = '', esp = '', especialidades: {slug, nombre, total}[], variante?: 'hero' | 'pagina' }`. `<form method="get">` (funciona sin JS) con: campo `type="search" name="q"` de 64 px con `<label>` **visible** «Nombre del médico o especialidad», `autocomplete="off"`, `enterkeyhint="search"`; `<select name="esp">` nativo de 56 px («Todas las especialidades» + las 50, con su cuenta: «Cardiología (8)»); botón `Buscar` `.btn--sol` 56 px. Sobre lago, etiqueta en `--cal`. Debajo, opcional: chips de las 8 especialidades con más médicos (`/directorio/?esp=slug`) con su cuenta real.

### 4.11 CTA de contacto (`ui/ContactoCTA.astro`)

`{ variante: 'cierre' | 'compacto', titulo?: string, servicio?: string }`. Tres botones: **Llamar a la central** `(0261) 700-5100` (`.btn--lago`), **Pedir cita por WhatsApp** `+58 412-4248304` (`.btn--sol`, texto «Solicitud de cita - {servicio}» si hay servicio), **Emergencias** `+58 (0261) 700-5141` (`.btn--rojo`), más «Cómo llegar», «Citas: lunes a viernes, 8 am–4 pm», correo e Instagram. `compacto` = apilado de 64 px para páginas internas; `cierre` = H10.

### 4.12 Primitivas del motivo (A)

| Componente | Props | Notas |
|---|---|---|
| `ui/Anillos.astro` | `{ paso?: number = 9, tam?: string = 'min(1300px, 120vw)', mascara?: boolean = true, clase? }` | Un `<div class="anillos" aria-hidden="true">`. Ver 3.1 |
| `ui/Apertura.astro` | `{ src: ImageMetadata, alt: string, forma: 'circulo' \| 'arco', pos?: string, tam?: string, widths?: number[], prioridad?: boolean, pie?: string }` | Estructura `.apertura > .apertura__img + ::after`; con `pie` envuelve en `<figure>`/`<figcaption>`. Emite `<Picture>` AVIF/WebP |
| `ui/Dial.astro` | `{ items: Horario[], tam?: number = 300, activo?: string, mini?: boolean }` | Dial de 24 h. Ver H5. Con `mini` pinta un solo arco (plantilla de servicio) |
| `ui/Cifra.astro` | `{ valor: number, etiqueta: string, tono?: 'lago' \| 'rojo', sufijo?: string }` | Insignia circular con anillo SVG `pathLength=1`; texto real en el HTML |
| `ui/Monograma.astro` | `{ nombre: string, tam: number }` | Ver 4.9 |
| `ui/Migas.astro` | `{ items: {texto, href?}[] }` | `<nav aria-label="Migas de pan">`, 48 px, separador `.mas` |
| `ui/Seccion.astro` | `{ id?, tema?, folio?, titulo?, nivel?: 2 \| 3, clase? }` | `<section aria-labelledby>`; `data-tema`; folio `01 / 09` decorativo |

### 4.13 Helpers declarativos de movimiento (los implementa A en `motion.js`)

Para que C, D y E animen sin escribir escenas:

| Atributo | Efecto (una vez, `top 85%`, `once`) |
|---|---|
| `data-revelar="linea"` | `SplitText type:'lines'`, máscara de línea, `yPercent 110→0`, 0.9 s `power4.out`, `stagger .09` (títulos) |
| `data-revelar="arriba"` | `y 24→0` + `opacity 0→1`, 0.6 s `power3.out` (bloques de texto; **nunca** botones de llamada/WhatsApp/Emergencias) |
| `data-revelar="iris"` | `clip-path circle(0% → 75%)`, 0.9 s `expo.out`, imagen interior `scale 1.12→1` (fotos) |
| `data-delay="0.2"` | Retardo en segundos |
| `data-contar="125"` (+ `data-sufijo`) | Cuenta de 0 al valor, 1.6 s `power3.out`, `snap 1`, formato `toLocaleString('es-VE')`; el HTML ya trae el número final |

En `reduced` y sin JS: nada se oculta ni se mueve (los contadores muestran el valor final). Máximo 12 elementos animados a la vez.

### 4.14 Clases utilitarias que B–E pueden usar (todas en `global.css`)

Layout: `.contenedor` (máx. `--max`, padding `--gutter`), `.contenedor--angosto` (50rem), `.seccion` (padding-block `--sec`), `.seccion--compacta`, `.pila` (separación vertical `--pila`, 1rem), `.rejilla` (grid auto-fit con `--min`), `.solo-lectores` (visualmente oculto), `.js-solo` / `.sin-js-solo`. Texto: `.eyebrow` (Atkinson 700 15 px, mayúsculas, tracking .14em, `--texto-2`), `.lede` (`--t-lg`, medida `--medida`), `.folio`, `.numeral` (+ `.numeral--hero`), `mark.subrayador` (subrayador `--sol` por `background-size`; el texto sigue en `--texto`), `.medida` (`max-inline-size: var(--medida)`). Superficies: `.tarjeta` (papel, borde, `--r-2`). Motivo: `.mas`, `.anillos`, `.apertura`, `.amanecer`, `.latido`, `.foto-tratada`. Formularios y tablas (en `privado.css`, también cargado en el sitio público): `.campo`, `.campo__etiqueta`, `.campo__ayuda`, `.campo__error`, `.entrada`, `.seleccion`, `.area`, `.fieldset`, `.casillas`, `.aviso` (+ `--ok|--error|--info`), `.tabla` (en móvil cada fila se apila usando `data-etiqueta` en cada `<td>`). Atributos: `[data-tema]`, `[data-fab-hide]`, `[data-escena]`, `[data-lenis-prevent]`.

### 4.15 Marquesina (cinta)

Hay **una sola marquesina** en todo el sitio: la cinta de retratos de H7 (`CintaMedicos.astro`, B). Reglas: se pausa con `:hover`, `:focus-within`, fuera de viewport y con un botón visible «Pausar movimiento» (WCAG 2.2.2); en móvil es una tira con `scroll-snap` sin movimiento automático; en `reduced`/sin JS es una cuadrícula estática de 6 retratos. No hay franja de texto en bucle (la de «24 h» del concepto Cruz se descartó).

---

## 5. Home sección por sección (B)

`src/pages/index.astro` es **SSR** (`export const prerender = false`; `import { env } from 'cloudflare:workers'`). Obtiene `resumen(env.DB)`, `retratosDelDia(env.DB, 12)` y `especialidades(env.DB)` y los pasa a los componentes como props. Orden, temas y anclas:

| # | Componente (`src/components/home/`) | Ancla | Tema | Escena de scroll (escritorio) |
|---|---|---|---|---|
| H1 | `Hero.astro` (héroe + casa/misión, una sola escena) | `#inicio` | cal → lago | **Escena larga 1** (300vh, scrub 1) |
| H2 | `Anillos.astro` (1952 → hoy) | `#historia` | lago | **Escena larga 2** (260vh, scrub 1.2) |
| H3 | `Hoy.astro` | — | cal | disparo único |
| H4 | `Puertas.astro` | `#puertas` | cal | disparo único |
| H5 | `Reloj.astro` | `#horarios` | brisa | barrido único |
| H6 | `Servicios.astro` | `#servicios` | cal | `ScrollTrigger.create` por fila |
| H7 | `Medicos.astro` (+ `CintaMedicos.astro`) | `#medicos` | lago | cinta reactiva |
| H8 | `Afiliacion.astro` | `#afiliacion` | cal | disparo único |
| H9 | `Testimonios.astro` | `#familia` | brisa | CSS `view()` + respaldo IO |
| H10 | `Cierre.astro` | `#contacto` | sol | scrub corto del amanecer |

Cada componente trae en su cabecera un comentario con la escena, sus puertas (escritorio / móvil / reducido) y los datos reales que usa. Todos registran su escena con `scene(fn)` (sección 8). **Estado final en el HTML**: ningún contenido empieza oculto sin JS; los altos de escena solo existen bajo `html[data-fx="desktop"]`.

Parallax (solo en la escena 1): D0 0.10×, D1 0.25×, D2 0.50×, D3 0.80×, D4 1.00×, D5 1.20×. Fórmula: cada capa con factor `f` hace `y: () => -innerHeight * .35 * f` a lo largo de la escena (más cerca = más rápido).

### H1 · Héroe «El anillo 74» + La casa (`Hero.astro`)

**Contenido real**
- Tira roja (global, A) + header.
- Eyebrow: «Desde 1952 · Av. 8 Santa Rita, Maracaibo».
- **H1:** `<h1><span class="h1__a"><span class="numeral h1__74">{anos()}</span> años</span> <span class="h1__b">cuidando a Maracaibo.</span></h1>`
- Lede: «{medicos} médicos en {especialidades} especialidades y emergencias abiertas las 24 horas.» (de `resumen`).
- CTAs (visibles desde el primer pintado; **nunca** se animan en opacidad): `Llamar a la central (0261) 700-5100` (`.btn--lago .btn--grande`), `Pedir cita por WhatsApp` (`.btn--sol .btn--grande`), `Buscar un médico` (`.btn--borde`, → `/directorio/`).
- Casa (misma escena): foto del edificio, pie «Av. 8 Santa Rita, entre calles 70 y 71», eyebrow «Nuestra misión» y la misión textual (`clinica.mision`) en Fraunces 600 `--t-xl`; `<mark class="subrayador">` en «mejora continua» y «excelencia».

**Capas (escritorio).** D0 `--cal` + `grano.svg` estático. D1 **sol**: disco `--sol` de 46vw arriba a la derecha (eco del bordillo amarillo), respira `scale 1→1.03` en 12 s (CSS, pausa fuera de viewport). D2 **campo de anillos** (`Anillos`, paso 9, centrado en el disco de la foto, máscara que lo apaga hacia el texto). D3 **foto**: `inst-3.jpg` a pantalla completa (`max-inline-size: 1600px`, centrada) bajo una máscara circular de **38vw de diámetro centrada en (68 %, 52 %)**, marco doble (`.apertura::after`, hermano), imagen desplazada `x +23vw` para que la entrada caiga dentro del disco. D4 texto en columnas 1–6 de 12 (máx. 36rem), el «74» a `--t-num-d` invadiendo ~2vw el borde izquierdo del disco (afinar con capturas; si no cabe, disco de 36vw). D5 tres `.mas` de 2–4vw que flotan (CSS 7/9/11 s, retardos negativos).

**Carga (solo escritorio, primera visita de la sesión, ≈ 2.4 s).** Compuerta: `!sessionStorage['pm-intro'] && performance.now() < 1500`; al iniciar se guarda `pm-intro` y se quita `html.intro` (el CSS esconde con `visibility` solo los elementos marcados `data-intro`: eyebrow, H1, lede, sol, anillos, foto y «74»; **nunca** los botones). `pointerdown`/`keydown`/Escape → `tl.progress(1)`; tope de seguridad 2.8 s.

| t (s) | Qué | Parámetros |
|---|---|---|
| 0.00 | `.h1__b`, «años» y lede: SplitText `lines` con `mask:'lines'` | `yPercent 110→0`, 0.9 s `power4.out`, `stagger .1` (el texto es candidato a LCP: debe verse antes de 1.0 s) |
| 0.00 | Sol | `scale .6→1`, 1.0 s `expo.out` |
| 0.10 | Campo de anillos | `clip-path circle(0 → R)`, 2.2 s `power2.inOut` (cada anillo aparece al pasar la ola: «un anillo por año») |
| 0.20 | Apertura de la foto | `clip-path circle(0% → 19vw)`, 1.1 s `expo.out`; imagen `scale 1.18→1` |
| 0.35 | «74»: **cilindro** | SplitText `chars`, `rotateX -90→0`, `transformOrigin:'50% 50% -0.35em'`, `stagger .12`, `back.out(1.3)`, 0.9 s; contador `00→74` (`snap 1`, 1.2 s `power2.out`); a la vez `--wght 300→800` y `--soft 0→100`, 1.6 s `power2.out` |
| 0.60 | CTAs | `y 16→0`, 0.6 s `power3.out` (sin opacidad) |
| 2.40 | Arranca `.latido` | solo `transform`/`opacity`, 3.2 s cada 6 s, en viewport |

Ambiente (escritorio): `gsap.quickTo` desplaza el campo de anillos ±12 px con el puntero (`duration .6`).

**Scroll (escritorio).** `.escena--inicio` de `300vh`; `.escena__stage` con `position: sticky; top: 0; height: 100svh; overflow: clip` (**CSS sticky, sin pin de GSAP**). Un `ScrollTrigger { trigger: escena, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true }` con un timeline de duración 1:

| Tramo | Efecto |
|---|---|
| 0.00–0.22 | **Split converge invertido**: `.h1__a` `xPercent 0→-60`, `.h1__b` `0→+60`, ambos `opacity →0` (`power2.in`); lede y CTAs `y 0→-30`, `opacity →0` (0.00–0.15). Al pasar `progress > .3` se pone `inert` y `aria-hidden` al bloque de texto (no queda nada enfocable e invisible). |
| 0.00–1.00 | Parallax D1/D2/D5 con la fórmula de arriba |
| 0.10–0.50 | Campo de anillos `scale 1→1.5` y `opacity →0` |
| 0.12–0.55 | **Iris**: `clip-path circle(R0px → Rmaxpx at 68% 52%)` (en **px**, calculados por función, `invalidateOnRefresh`), `ease: 'power1.inOut'`; la imagen hace `x +23vw → 0`; el marco doble `scale 1→1.25` y `opacity →0` en 0.12–0.30 |
| 0.15–0.45 | El «74» **viaja** (`x`, `y`, `scale` calculados con `getBoundingClientRect` de `[data-insignia-74]` en el header, `power2.inOut`); a 0.45 el numeral del héroe baja `opacity` y la insignia del header recibe `.is-on` (relevo de coordenadas, no vuelo entre DOM) |
| 0.35–0.60 | Velo `--lago` (degradado de abajo hacia arriba) `opacity 0→1`, hasta ser sólido tras el texto; trama de anillos al 10 % sobre el velo |
| 0.58–0.62 | Entran eyebrow y pie de foto |
| 0.60–1.00 | **Palabras encendidas**: `SplitText type:'words'` de la misión, `gsap.fromTo(words, { opacity: .5 }, { opacity: 1, ease: 'none', stagger: .1 })` dentro del mismo timeline. **Mínimo .5** (3.45:1 sobre lago). El HTML trae todo a 1; la atenuación solo la pone JS. |
| aparte | Subrayador: `ScrollTrigger` por `mark` (`start 'top 60%'`, `once`), `clip-path inset(0 100% 0 0) → inset(0)`, 0.6 s `power3.out` |

**Móvil (390×844).** Sin sticky, sin scrub (salvo palabras), sin parallax, sin iris. Orden: tira (44) → header (64) → disco de foto de **62vw** (`inst-3`, `object-position: 47% 45%`, 640 px, `fetchpriority="high"`, ≈ 40 KB) con el sol detrás y anillos asomando por los bordes → eyebrow → H1 con «74» a `--t-num-m` → lede → dos botones apilados de 60 px → `Buscar un médico` 56 px. Primera visita: solo el «74» (cilindro + maduración de ejes, 1.2 s); los `+` quedan fijos. La casa: foto ancha (`inst-3`, 70svh, velo lago) y debajo la misión sobre `--lago`; palabras encendidas con `ScrollTrigger { trigger: párrafo, start: 'top 80%', end: 'bottom 55%', scrub: true }`; texto de 24–26 px.

**Reduced / sin JS.** `.escena--inicio` de alto automático; héroe estático (disco circular fijo, el sol no respira, sin latido); la casa es un bloque normal; palabras a opacidad 1; subrayadores ya dibujados; «74» en 800/100; cero `.intro`.

### H2 · Un anillo por año · 1952 → hoy (`Anillos.astro`)

**Contenido real.** Escenario `--lago`. Centro: campo de **74 anillos** (uno por año) con un `.mas` como médula; numeral gigante `1952 → {año actual}`; tres etiquetas que aparecen cuando la ola pasa por su año, leídas del array `hitos` de `site.ts`: **1952 · Comenzamos**, **2022 · 70 años celebrando tu bienestar**, **{año actual} · {anos()} años, y seguimos**. El anillo 74 se resalta en `--sol` y empieza el latido. Texto: «Como un árbol grande en medio de Maracaibo, la Policlínica suma un anillo cada año. Seguimos creciendo con la misma idea: cuidarte a ti y a tu familia.» **No se inventan hitos**: la posición de cada etiqueta es `(anio - 1952) / anos()`, y el array crece solo cuando la clínica aporte más.

**Capas.** D0 `--lago`; D1 glow `--sol` (radial-gradient, `opacity .35`) tras la médula; D2 campo de anillos (**un solo elemento**; `--paso` = `clamp(6px, alto * .45 / 74, 9px)`; si el viewport es bajo, el campo desborda y se recorta arriba y abajo, y el anillo 74 queda visible a los lados; color `--anillo-inv`); D4 numeral y etiquetas (cada etiqueta sobre chip sólido `--lago-2` con filete `--cal`, **nunca texto sobre las líneas**); D5 `+` flotantes.

**Escritorio.** `.escena--anillos` de `260vh`, stage `sticky` de 100svh, `ScrollTrigger { start:'top top', end:'bottom bottom', scrub: 1.2 }`, sin pin. Timeline de duración 1:
- Campo: `clip-path circle(0 → R)` con `ease:'none'` sobre el mismo elemento (sin SVG de 74 nodos).
- Numeral: cuatro `<span>` de ancho fijo (`1ch`, `tabular-nums`) cuyo `textContent` actualiza `gsap.utils.snap(1)` desde un objeto `{ y: 1952 → año actual }`. Ejes: **Variable Font Wave** con desfase de `.08` por dígito: `--wght 300→800`, `--soft 0→100`, `power1.inOut`, solo sobre ese nodo (`contain: layout paint`, `min-width: 4ch`). El numeral lleva `aria-hidden="true"`; el texto accesible es un `<p class="solo-lectores">`: «De 1952 a {año}: {anos()} años».
- Etiquetas: `y 24→0`, `skewY 4→0`, `back.out(1.4)`, disparadas en la posición `n/74` del scrub (nada elástico).
- Cierre: anillo 74 con `stroke: --sol` y arranque de `.latido`; al llegar a `progress > .98` el escenario queda quieto y el texto largo entra con `data-revelar="arriba"`.

**Móvil.** **Sin sticky, sin scrub.** El escenario es un bloque de 100svh; al entrar (`once`, `top 60%`) corre **un único timeline de 2.6 s**: ola de anillos (`clip-path`, 2.2 s `power2.inOut`), el numeral cuenta 1952→hoy con `snap` y los ejes maduran en un tween único de 1.2 s; las etiquetas se apilan bajo el círculo y entran con `y 24→0`. Campo de 100vw, paso 6 px.

**Reduced / sin JS.** Numeral del año actual en 800/100, campo completo y estático, las tres etiquetas como lista, sin latido.

### H3 · Hoy · lo que sigue vivo (`Hoy.astro`)

Tres insignias circulares (`ui/Cifra`) con filete de anillo sobre `--cal`: **{medicos} médicos** y **{especialidades} especialidades** (anillo `--lago`) y **24 h de emergencias** (anillo `--rojo`); el relleno llega al 100 %. Un dato en texto: «9 servicios». Solo cifras derivadas. Debajo: `Ver el directorio médico` (`.btn--lago .btn--grande`).
Técnica (escritorio y móvil, una vez): `ScrollTrigger { start:'top 75%', once:true }`; D1 disco `--sol-claro` tras cada cifra; D2 SVG `circle` con `pathLength=1`, `strokeDashoffset 1→0` (1.4 s `power2.inOut`, `stagger .15`); D4 contador `data-contar` (1.6 s `power3.out`). **Móvil:** tres insignias apiladas de 64vw, cifra a 56 px, cada una anima al entrar. **Reduced/sin JS:** valores finales y anillos completos.

### H4 · Cuatro puertas · «¿Qué necesita hoy?» (`Puertas.astro`, injerto de Cruz)

**Contenido.** Cuatro **arcos-puerta** en fila (escritorio: 4 columnas, cada puerta 4:5; móvil: cápsulas apiladas de 96–112 px con icono en anillo a la izquierda). Cada una es **un solo `<a>`** de toda el área:
1. **Emergencias** (fondo `--rojo`, texto `--blanco`): «Abiertas las 24 horas · +58 (0261) 700-5141» → `tel:`.
2. **Pedir cita** (`--sol`, texto `--tinta`, borde 2 px `--tinta`): «Por WhatsApp · lunes a viernes, 8 am–4 pm» → WhatsApp.
3. **Buscar un médico** (`--lago`, texto `--cal`): «{medicos} médicos · {especialidades} especialidades» → `/directorio/`.
4. **Telemedicina** (`--brisa`, texto `--tinta`, borde 2 px `--tinta`): «Consulta por videollamada · para afiliados» → `/afiliacion/`.

Debajo, una fila: «¿Vienes en persona? Av. 8 Santa Rita, entre calles 70 y 71» + `Cómo llegar` (`clinica.mapa`).
**Capas.** D1 arco de color; D2 filete interior de anillo (1 px, `--linea`, a 10 px del borde); D4 texto. El **aro de foco va en el `<a>` exterior**; el `clip-path` solo en `.puerta__cuerpo`.
**Escritorio.** Hover/foco (CSS): el arco interior sube 8 px (`translateY`, 0.3 s `--ease-out`) y la flecha avanza 8 px. Entrada una vez: `ScrollTrigger { start:'top 80%', once:true }`, `.puerta__cuerpo` `clip-path inset(100% 0 0 0) → inset(0)`, 0.7 s `power3.out`, `stagger .08` (las puertas «se abren»). **Móvil/reduced/sin JS:** visibles, sin animación.

### H5 · Reloj de 24 h · «¿A qué hora te esperamos?» (`Reloj.astro`)

**Contenido real.** Dial concéntrico (medianoche arriba) con un anillo por servicio de `horarios`: Emergencias 24 h (anillo completo, `--rojo`), Citas lunes a viernes 8 am–4 pm, Tomografía 7 am–5 pm, Rayos X 7 am–5 pm, Laboratorio 7 am–5 pm (+ «Emergencias 24 horas»), Video endoscopia lunes a viernes 8 am–2 pm. Una aguja marca la hora actual de Maracaibo (UTC−4). El chip **«Abierto ahora»** (con `.latido`) aparece **solo** para Emergencias, Citas y Video endoscopia (`estaAbierto` ≠ `null`); Tomografía, Rayos X y Laboratorio muestran su horario sin calcular estado (los días no constan). Bajo el dial, una **lista real `<dl>`** (el contenido accesible) con cada servicio, su horario y enlace «Llamar».
**Capas.** D0 `--brisa`; D2 dial SVG (`<circle>` con `pathLength="24"`, `stroke-dasharray="{duración} {24-duración}"`, `stroke-dashoffset="-{desde}"`, `transform="rotate(-90)"`; anillo seleccionado relleno `--sol` con borde `--tinta`); D3 aguja; D4 lista. El dial es `aria-hidden`.
**Técnica.** Barrido: `@property --sweep` (`<angle>`, 0→360deg) sobre un `conic-gradient` en `mask` revela los arcos como el barrido de un reloj (1.6 s, `power2.inOut`; animación CSS disparada al añadir `.is-in` con `IntersectionObserver`, una vez). Aguja: `gsap.to` `rotation` hasta la hora actual (1.4 s `power3.out`), y se actualiza cada minuto (`setInterval` solo con la sección en viewport). Sin soporte de `@property`: dial estático ya completo.
**Móvil.** Dial de 88vw centrado y lista debajo con filas de 56 px a modo de botón: tocar una fila resalta su anillo (evento `dial:activar`) y muestra «Llamar». Sin tooltips. **Reduced/sin JS:** dial estático con arcos dibujados; lista completa; sin aguja ni «Abierto ahora».

### H6 · Nueve servicios, una misma casa (`Servicios.astro`)

**Contenido real.** Índice numerado 01–09 de `indiceServicios` con su `dato` real; fila = `<a>` de 72 px, nombre en Fraunces `--t-2xl` (30–44 px). A la derecha (escritorio), **vista previa fija**: arco 4:5 con la foto del servicio y `.foto-tratada` común para unificar calidad dispar. Datos cortos: Tomografía «7 am–5 pm», Video endoscopia «Lunes a viernes, 8 am–2 pm», Laboratorio «7 am–5 pm · Emergencias 24 h», Especialidades «Directorio por especialidad», Cirugía «Electivas y de urgencia», UCI «Medicina crítica», Unidad de Cirugía Bariátrica «Equipo multidisciplinario», Rayos X «7 am–5 pm», Unidad Obstétrica Neonatal «Embarazo, parto y puerperio».
**Capas.** D0 `--cal`; D2 filetes; D3 arco con foto (`position: sticky; top: 12vh; height: 76vh`); D4 lista.
**Escritorio.** Un `ScrollTrigger.create` por fila: `{ trigger: fila, start: 'top 50%', end: 'bottom 50%', onToggle: self => self.isActive && activar(i) }`; también `mouseenter`/`focus` con puntero fino. `activar(i)`: dos capas apiladas; la nueva entra con `clip-path circle(0 → 75% at 50% 60%)` (0.7 s `power3.inOut`) y la anterior se retira al terminar. Entrada del bloque: filas alternan `x ±40 → 0`, `stagger .06`, `once`. Transición de página entre documentos: ver 8.6.
**Móvil.** Sin vista previa fija: nueve tarjetas verticales (`ServicioCard variante="arco"`, foto 4:3, nombre 32 px, dato, flecha), entrada una vez por tarjeta (`y 40→0`, `skewY 4→0`, `back.out(1.2)`) con `ScrollTrigger.batch`. **Reduced/sin JS:** lista completa y primera foto visible.

### H7 · Encuentra a tu médico (`Medicos.astro` + `CintaMedicos.astro`)

**Contenido.** Fondo `--lago`. Título «Encuentra a tu médico»; `Buscador variante="hero"` (campo de 64 px + selector de 56 px + `Buscar` sol); chips de las 8 especialidades con más médicos y su cuenta, de `resumen.top` (hoy: Ginecología y obstetricia 17, Medicina interna 15, Traumatología 13, Pediatría 10, Cardiología 8, Cirugía general 7, Gastroenterología 6, Odontología 6; **siempre leer de D1**); enlace «Ver los {medicos} médicos». Debajo, la **cinta de retratos** con `retratosDelDia(db, 12)` (`MedicoCard variante="retrato"`; los sin foto usan `Monograma`), tamaños alternos 120/160 px y desfase vertical de 24 px en `nth-child` pares.
**Capas.** D0 lago; D1 círculo grande `--sol-claro` al 8 % tras el buscador; D3 cinta; D4 formulario.
**Escritorio.** Cinta reactiva a la velocidad de scroll: dos copias de la pista, velocidad base `0.6 px/frame` + `ScrollTrigger.getVelocity()` acotado a ±1.5 px/frame con decaimiento; **se pausa** con `:hover`, `:focus-within`, fuera de viewport (IO) y con un **botón visible «Pausar movimiento»** (48 px, `aria-pressed`) junto a la cinta (WCAG 2.2.2). Título con `data-revelar="linea"`.
**Móvil.** Sin movimiento automático: tira horizontal con `scroll-snap-type: x proximity`, los 8 primeros retratos y botón de 56 px «Ver los {medicos} médicos». **Reduced/sin JS:** cuadrícula estática de 6 retratos + botón al directorio; el formulario funciona (GET a `/directorio/?q=&esp=`).

### H8 · Afiliación (teaser) (`Afiliacion.astro`)

**Contenido (de `site.ts → afiliacion`).** Eyebrow «Afiliación Policlínica»; título «Todos los servicios en un solo plan.»; `afiliacion.idea` («Todos los servicios de la Policlínica a un único precio, con telemedicina incluida.»); los tres `incluye[]` como lista con `.mas`; precio: **«Consulta el precio»** mientras `afiliacion.precio === null` (nunca una cifra); botones `Conocer la afiliación` (`.btn--lago`, → `/afiliacion/`) y `Consultar el precio por WhatsApp` (`.btn--sol`, `afiliacion.cta.href`). Visual: diagrama de anillo de **9 arcos** (uno por servicio, folios 01–09) alrededor de un `.mas` central y un disco `--sol` «Telemedicina».
**Técnica.** Una vez (`start 'top 70%'`, `once`): los 9 arcos se dibujan (`strokeDashoffset`, 1.4 s `power2.inOut`, `stagger .1`) y el disco entra con `scale .6→1` (`back.out(1.4)`). **Móvil/reduced/sin JS:** diagrama completo y estático.

### H9 · Familia · testimonios (`Testimonios.astro`)

Tres citas reales de `testimonios`, una por bloque, en Fraunces cursiva (`wght-italic.css`) de `--t-xl`→48 px, con **comilla gigante `--sol-claro`** detrás del texto y filete de anillo; **sin avatares, sin nombres, sin cargos** (ver 1.5). Layout Offset Diagonal (citas alternan izquierda/derecha con padding asimétrico) solo en escritorio. Entrada: **CSS puro** `animation-timeline: view(); animation-range: entry 0% entry 40%` (Theatrical Enter) bajo `@supports (animation-timeline: view())`, con respaldo de `IntersectionObserver`. **Móvil:** citas de 28 px una tras otra, solo fundido de opacidad. **Reduced/sin JS:** estáticas (`@media (prefers-reduced-motion: reduce)` anula `animation-timeline`).

### H10 · Te esperamos · cierre (`Cierre.astro`, lleva `data-fab-hide`)

Campo `--sol` a pantalla completa con un **semicírculo de amanecer** y tres anillos concéntricos (`--linea`, tinta al 14 %) detrás de los botones. Título «Te esperamos en la Av. 8 Santa Rita, entre calles 70 y 71, Maracaibo». `ContactoCTA variante="cierre"` con tres botones de 72 px (Llamar a la central, Pedir cita por WhatsApp, Emergencias), `Cómo llegar` (`clinica.mapa`), «Citas: lunes a viernes, 8 am–4 pm», correo e Instagram. **Escritorio:** `.amanecer` `yPercent 40→0` con `ScrollTrigger { start:'top bottom', end:'center center', scrub:true }`; los botones **no** animan opacidad. **Móvil:** botones apilados de 72 px, semicírculo estático, la barra de acción se oculta aquí. **Reduced/sin JS:** todo estático.

Luego el `Footer` global (4.4).

---

## 6. Páginas internas

Todas usan `Layout.astro`, `Migas` (excepto 404) y cierran con `ContactoCTA variante="compacto"`. Animación de las páginas internas = solo los helpers declarativos de 4.13 más lo indicado aquí; **sin pins, sin scrub** salvo donde se dice. Todos los textos de servicio se copian **tal cual** de `site.ts`.

| Ruta | Render | Dueño | Datos |
|---|---|---|---|
| `/servicios/` | estática | C | `indiceServicios` |
| `/servicios/[slug]/` | **SSR** | C | `servicios`, `horarios`, `medicos(db, {esp})` |
| `/especialidades/` | **SSR** | C | `especialidades(db)`, `resumen(db)` |
| `/directorio/` | **SSR** | D | `medicos(db, {q, esp})`, `especialidades(db)` |
| `/nosotros/` | estática | C | `clinica`, `hitos`, `instalaciones`, `anos()` |
| `/afiliacion/` | estática | C | `afiliacion`, `servicios` |
| `/404` | estática | C | — |

### 6.1 `/servicios/` (índice)

Banda `--brisa` con `Migas`, H1 «Nuestros servicios» (`data-revelar="linea"`) y lede «Nueve servicios, una misma casa.». Rejilla de los 9 `ServicioCard variante="arco"` (1 columna móvil, 2 desde 600 px, 3 desde 900 px) con entrada `data-revelar="arriba"` escalonada solo en escritorio. Sin cifras de D1 (página estática). Cierre `ContactoCTA`.

### 6.2 Plantilla de servicio `/servicios/[slug]/` (los textos actuales, tal cual)

Validación: `slug` en `servicios` → página; `especialidades` → redirección 301 a `/especialidades/`; cualquier otro → 404.

1. **Cabecera** en bloque de color según `servicio.tema` (`lago`, `sol` o `brisa`; **rojo nunca**): `Migas` (Inicio / Servicios / {nombre}), folio «Servicio 02 de 09», H1 en Fraunces `--t-4xl` con `data-revelar="linea"`, y a la derecha la foto en `Apertura forma="arco"` (4:5) con `view-transition-name: srv` (único; es el destino del arco compartido, 8.6). Al cargar, la foto se abre con una variante de **Window Pane Iris**: `clip-path inset(40% 30% 40% 30% round 999px) → inset(0 round 999px 999px 0 0)`, 1.1 s `expo.out` (0.8 s en móvil; sin animación en reduced). Reglas por foto en 4.0.2 (UCI y Obstétrica ≤ 360 px de ancho; Video endoscopia vertical, máx. 420 px de alto; Cirugía con `brightness(1.25)` y panel sólido para cualquier texto; Tomografía y Rayos X ya desenfocadas).
2. **Cuerpo.** `detalle[]` en párrafos a **28–36 px** Fraunces 600 cuando son 1–2 frases (Tomografía, Video endoscopia, Laboratorio, Rayos X) y a 21 px/1.6 con medida `--medida` cuando son largos (Cirugía, Bariátrica, Obstétrica). **UCI:** sus tres frases pasan a tres filas grandes con `.mas` de viñeta; la tercera («…disponibles las 24 horas») lleva un anillo «24 h». No se rellena: si el servicio tiene dos frases, la página es corta y honesta.
3. **Datos del servicio** (tarjeta lateral en escritorio, bloque propio en móvil): si el servicio tiene `horario`, muestra el horario en Fraunces 56 px y un **mini dial** (`Dial mini`, un solo arco; es el horario hecho gráfico) y la nota real («Algunos estudios requieren cita previa»); sin `horario` (Cirugía, UCI, Bariátrica, Obstétrica) muestra «Para citas y consultas» con los botones. Siempre: `Pedir cita por WhatsApp` con texto prellenado «Solicitud de cita - {Servicio}» (`waHref`), `Llamar a la central` y, en servicios con 24 h (Laboratorio, UCI), `Emergencias`.
4. **Especialistas de {especialidad}** (solo si `servicio.especialidad` y D1 devuelve médicos): hasta 6 `MedicoCard variante="tarjeta"` + enlace «Ver los {N} médicos» → `/directorio/?esp={slug}`. Laboratorio no tiene especialidad asignada: la sección se omite (decisión a confirmar con la clínica).
5. **Siguiente servicio**: nombre gigante del siguiente en `indiceServicios` (circular; si es Especialidades, enlaza a `/especialidades/`) con su arco; entrada `data-revelar="iris"`.

### 6.3 `/especialidades/` (índice A–Z)

Banda con H1 «Especialidades» y lede «{especialidades} especialidades y {medicos} médicos en una misma casa.». Campo de filtro de **64 px** («Buscar especialidad», etiqueta visible). Lista agrupada por inicial (orden de `clave`, sin acentos): cada fila de **64 px** con nombre en Fraunces `--t-xl` (~28 px) y a la derecha un chip «N médicos» (de `total`); toda la fila es el enlace a `/directorio/?esp={slug}`. **Especialidades sin médicos** (hoy 8: Cirugía de tórax, Inmunología y alergias, Nutrición, Oncología, Psicología clínica infantil, Psicopedagogía, Psiquiatría, Terapia de lenguaje): la fila no es enlace a un directorio vacío; muestra «Consulta disponibilidad por WhatsApp» como enlace a `waHref('Consulta de especialidad - {nombre}')` (texto en `--texto-2`, **sin bajar opacidad**).
**Riel de letras** sticky (a la derecha desde 1200 px; en móvil, tira horizontal sticky de 48 px bajo el header) con enlaces de ancla a `#letra-a`…; la letra activa lleva `aria-current="true"` (IO por grupo, sin scrub). Foco/hover de fila: relleno `--sol-claro` con **wipe circular desde el puntero** (CSS `clip-path: circle(0 → 150% at var(--x) var(--y))`; `--x/--y` los escribe un `pointerenter` de 10 líneas; sin JS, solo cambio de fondo). Filtro en vivo (JS): oculta filas y grupos vacíos, `aria-live="polite"` con «Mostrando N especialidades». Entrada: `ScrollTrigger.batch` de máx. 12 elementos con fundido de 200 ms. **Sin JS:** lista completa.

### 6.4 `/directorio/` (D) — buscador y tarjetas

- **Cabecera**: banda `--brisa`, H1 «Encuentra a tu médico», `Buscador variante="pagina"` pegajoso bajo el header en escritorio (`top: var(--header-h)`).
- **Chips**: «Todas ({medicos})» + las 10 especialidades con más médicos (con su cuenta); el seleccionado lleva `aria-current` y estilo de 4.7.
- **Conteo** en `<p aria-live="polite">`: «Mostrando 12 de 125 médicos» (solo el conteo se anuncia, nunca la lista).
- **Resultados**: `<ul>` de `MedicoCard variante="tarjeta"`; 1 columna en móvil, 2 desde 600 px, 3 desde 900 px; `li { content-visibility: auto; contain-intrinsic-size: auto 220px }`; imágenes `loading="lazy"`. **Se renderizan todos los resultados** (≈ 125 tarjetas ≈ 75 KB de HTML); sin paginación.
- **SSR**: `q` (máx. 80 caracteres) y `esp` (se valida contra `especialidades(db)`; slug desconocido se ignora) → `medicos(env.DB, { q, esp })`. Orden alfabético por `clave`. `cache={false}` (el admin edita este contenido).
- **Vacíos**: sin coincidencias → «No encontramos médicos con esa búsqueda. Prueba con otra palabra o escríbenos por WhatsApp.»; especialidad válida con 0 médicos → «Aún no tenemos médicos de {especialidad} en el directorio. Consulta disponibilidad por WhatsApp.» (+ botón).
- **JS** (`src/components/directorio/filtro.ts`, importa `gsap` y `gsap/Flip` por su cuenta, sin pasar por el motor de escenas): filtra en vivo sobre las tarjetas ya renderizadas con `data-clave` (minúsculas sin acentos y sin «Dr./Dra.», igual que `clave()` de `lib/db.ts`) y `data-esp` (slugs); debounce 120 ms; actualiza el conteo (throttle 400 ms) y la URL con `history.replaceState` (`?q=&esp=`, compartible); reordenamiento con **GSAP Flip** (`Flip.getState(visibles)` → alternar `hidden` → `Flip.from(state, { duration: .5, ease: 'power2.inOut', absolute: true, onEnter: scale .9→1 + opacity, onLeave: opacity→0 })`) **solo si quedan ≤ 40 tarjetas** y no hay reduced; si no, se alterna `hidden` sin animar. Entrada inicial: las primeras 12 tarjetas con `data-revelar="arriba"` (stagger de rejilla `.06`).
- **Sin JS**: el formulario GET hace la búsqueda en servidor (`?q=&esp=`); todo funciona.
- **Médicos sin foto**: `Monograma`. **Teléfono**: botón `Llamar` de 48 px con `telHref`.

### 6.5 `/nosotros/`

1. **Banda de apertura** (`--cal`): H1 «{anos()} años acompañando a Maracaibo», lede «Desde 1952 en la Av. 8 Santa Rita.», `Apertura forma="circulo"` con `inst-1` (≤ 560 px de ancho) y anillos al fondo.
2. **Misión y Visión como Cascading Card Stack** (escritorio): dos paneles `position: sticky; top: calc(var(--header-h) + 1rem)`; la **Misión** (`--lago`, texto cal, 28–32 px) y la **Visión** (`--sol`, texto tinta) que se desliza encima. `ScrollTrigger { trigger: panelVision, start: 'top 75%', end: 'top 25%', scrub: true }` anima el panel de Misión `scale 1 → .94` y un velo `--tinta` de `opacity 0 → .35` (tope: no pasar de .35; con ese velo el texto cal sobre lago mide 5.31:1; con .5 baja a 3.83). Textos de `clinica.mision` y `clinica.vision`. **Móvil:** dos bloques normales apilados, sin sticky ni scrub.
3. **Línea de anillos** (`LineaAnillos.astro`, propia de C; versión corta y sin escena larga): línea horizontal con los hitos de `hitos` (hoy 1952, 2022, año actual) sobre anillos concéntricos; **soporta N hitos** (hueco previsto para los que aporte la clínica; no se muestra ningún marcador vacío). Se dibuja una vez (`strokeDashoffset`, 1.2 s `power2.inOut`).
4. **Las ventanas**: galería de las 7 fotos de `instalaciones` con su `pie` y `alt` (4.0.3), alternando `Apertura circulo` y `arco` de tamaños distintos, 1 columna en móvil, 2 desde 600 px, 3–4 desde 1200 px con desfase vertical (Offset Diagonal). Entrada `data-revelar="iris"`. Sin lightbox.
5. **Cifras fijas**: `Cifra` de «{anos()} años», «24 h de emergencias» y «9 servicios» (**sin** 125 ni 50: página estática).
6. **Visítanos**: dirección, `Cómo llegar`, horarios, `ContactoCTA compacto`.

### 6.6 `/afiliacion/` (plan único con telemedicina)

Contenido de `site.ts → afiliacion`. **Precio: nunca una cifra inventada.** Mientras `afiliacion.precio === null` se muestra «Consulta el precio» y el botón de WhatsApp (`afiliacion.cta`). Todo lo marcado **[POR CONFIRMAR]** se escribe con el texto seguro indicado.

1. **Cabecera** (`--cal`): eyebrow `afiliacion.titulo`; H1 «Todos los servicios, un solo precio.»; lede `afiliacion.idea`; botones `Consultar precio y afiliarme` (`.btn--sol .btn--grande`, `afiliacion.cta`) y `Ya soy afiliado: entrar` (`.btn--borde`, → `/acceso/`). A la derecha, la **tarjeta del plan**: círculo `--papel` de ~420 px con anillos detrás (≤ 14 %, nunca bajo el texto), «Plan de afiliación», «Precio», **«Consulta el precio»** y la lista `incluye`.
2. **Qué incluye** (`--brisa`): los tres `incluye[]` en filas grandes con `.mas`: acceso a todos los servicios (con el **diagrama de anillo de 9 arcos** y enlaces a cada servicio), telemedicina (disco `--sol` destacado) e historial de consultas en tu panel. No se prometen descuentos, coberturas ni cantidades de consultas.
3. **Telemedicina, paso a paso** (`--lago`): 3 pasos con numeral en anillo — (1) «Entra a tu panel» «Con tu cédula o tu correo y tu contraseña, en Acceso.»; (2) «Pulsa Entrar a la videollamada» «Quedas en la sala de espera y ves tu lugar en la fila.»; (3) «Tu médico te atiende» «Cuando te toque, aparece el botón para abrir la videollamada.». Debajo, «Qué necesitas»: «Un teléfono o una computadora con cámara, micrófono e internet.» y el **aviso de emergencia** (tarjeta `--papel`, borde izquierdo de 6 px `--rojo`, texto `--tinta`): «La telemedicina no es para emergencias. Si es urgente, llama al +58 (0261) 700-5141 o ven a Emergencias, abiertas las 24 horas.» con botón `Emergencias`.
4. **Cómo afiliarte** (`--cal`) **[POR CONFIRMAR el proceso]**: (1) «Escríbenos por WhatsApp o llama a la central»; (2) «La clínica registra tus datos y te entrega tu usuario y tu contraseña»; (3) «Entra a tu panel». Lista «Datos que te pediremos»: nombre completo, cédula, fecha de nacimiento, teléfono, correo y dirección (son los campos reales del admin).
5. **Preguntas** (`<details>`, nativo, sin JS): «¿Cuánto cuesta?» → «Escríbenos por WhatsApp y te informamos el precio vigente.» · «¿Cuánto dura la afiliación?» → «Cada afiliación tiene una fecha de vencimiento que ves en tu panel. Para renovarla, escríbenos.» **[POR CONFIRMAR periodicidad]** · «¿En qué horario hay telemedicina?» → «Te lo confirmamos por WhatsApp o al llamar a la central.» **[POR CONFIRMAR]** · «¿Qué necesito para la videollamada?» · «¿Y si es una emergencia?».
6. `ContactoCTA compacto`.
Movimiento: el diagrama de 9 arcos se dibuja una vez (H8); lo demás `data-revelar="arriba"`. Estática, sin cifras de D1.

### 6.7 404

`Layout` con `tira` y `barra`. Campo de anillos con un `.mas` grande al centro (la médula). H1 «Esta página no está en ninguno de nuestros {anos()} anillos.» (año calculado en el build). Tres botones de 72 px: `Inicio`, `Buscar un médico`, `Llamar al (0261) 700-5100`. Respuesta HTTP 404. Solo una animación: los anillos se abren una vez desde la médula (`clip-path`, 1.4 s); nada más.

---

## 7. Zonas privadas: acceso, panel del cliente, panel del médico y admin

### 7.1 Principios comunes (D y E)

- **Mismo sistema, otra marcha**: mismos tokens, Atkinson a 17–19 px, Fraunces solo en títulos de página y numerales (peso `wght.css`). **Cero GSAP, cero Lenis, cero scroll animado**: solo CSS (`latido`, `respira`, destello de guardado) y JS vanilla para formularios y sondeo. Todo movimiento CSS se anula con `html[data-fx="reduced"]` y `prefers-reduced-motion`.
- Layout: `Privado.astro` (4.1; con `<slot name="head">` para el `<noscript>` de refresco) + un shell propio: D `AdminShell.astro`, E `TeleShell.astro`. Sin tira ni barra de acción públicas. Siempre `noindex` (el middleware ya añade `Cache-Control: no-store` y `X-Robots-Tag`).
- **Formularios = POST normal** (funcionan sin JS) → 303 a la misma página con `?ok=…` o `?error=…` (nunca reenviar al recargar). Astro bloquea POST de otro origen (no desactivar `security.checkOrigin`). Errores de validación: la lib devuelve **un solo mensaje de texto**, así que se muestra en un resumen `.aviso--error` (`role="alert"`, `tabindex="-1"`, con foco al cargar) encima del formulario y se **conservan los valores escritos** (renderizar la misma página con estado 422 en vez de redirigir).
- Fechas: SQLite guarda UTC sin zona → `aFecha()` y `fechaCaracas()` (4.0); nunca mostrar «2026-10-19 19:20:00» crudo.
- Botones: primarios 56 px (cliente y médico: 72 px en la acción principal); tablas 16 px; radios `--r-1` (8 px) en el admin y `--r-2` en el panel del cliente; chips de estado con icono **y** texto.
- Cuenta/salida: botón «Salir» = `<form method="post" action="/api/sesion"><input type="hidden" name="accion" value="salir">`.
- Rutas protegidas ya por el middleware: `/admin` (admin), `/medico` (médico), `/panel` (cliente), `/api/cola`, `/api/espera`. Con rol equivocado redirige a su propio panel.

### 7.2 `/acceso/` · inicio de sesión único (E)

SSR. Si `Astro.locals.usuario` existe → `Astro.redirect(inicioDe(rol), 303)`. Query que muestra: `?error=datos` · `?error=limite` · `?salio=1` · `?volver=` (se reenvía en un `hidden`).
**Escritorio**: dos paneles. Izquierda `--lago` con `Anillos` grande, el `.mas` central y el texto «Bienvenido de vuelta.» / «Entra con tu correo o tu cédula. Te llevamos a tu panel.». Derecha: tarjeta `--papel` con logo, formulario y ayuda. **Móvil**: tarjeta sobre `--cal` con logo arriba y **un solo anillo decorativo al 6 %** detrás (nunca bajo el texto).
Formulario `method="post" action="/api/sesion"`: «Correo o cédula» (`name="usuario"`, `autocomplete="username"`, `autocapitalize="none"`, `spellcheck="false"`, 56 px), «Contraseña» (`name="clave"`, `type="password"`, `autocomplete="current-password"`, 56 px) con botón **«Mostrar»** de texto (`aria-pressed`; sin JS el botón no se muestra), `hidden volver`, botón `Entrar` (`.btn--lago .btn--grande .btn--bloque`; con JS pasa a «Entrando…» + `aria-busy`).
Mensajes (`.aviso`, `role="alert"` para errores): `datos` → «No pudimos entrar con esos datos. Revisa tu correo o cédula y tu contraseña.» (no revela si el usuario existe) · `limite` → «Hiciste demasiados intentos. Espera un minuto e inténtalo de nuevo.» · `salio` → «Cerraste tu sesión.» (`--info`, `role="status"`).
Ayuda debajo: «¿Olvidaste tu contraseña? Escríbenos por WhatsApp y te ayudamos.» (WhatsApp con texto «Ayuda con mi acceso»; **[POR CONFIRMAR]** el proceso de restablecimiento), «¿Quieres afiliarte? Conoce el plan» (→ `/afiliacion/`) y «Emergencias: +58 (0261) 700-5141» (`tel:`). Los tres roles usan **la misma pantalla**; no hay selector de rol.

### 7.3 `/panel/` · panel del cliente y sala de espera (E)

SSR; rol `cliente`. **Solo** dos cosas (más lo mínimo de seguridad): el botón grande «Entrar a la videollamada» y su historial de conexiones. Lee `estado(env.DB, id)` (que además es el latido), `historial(env.DB, { clienteId })` y `usuario(env.DB, id)` (para `afiliacion_vence`).
`TeleShell` (cliente): barra `--lago-2` de 64 px con logo blanco, «Hola, {primer nombre}» y botón `Salir`; contenido centrado `max-inline-size: 40rem`, fondo `--cal`, texto de 19–20 px. Siempre visible bajo el contenido: franja «¿Es una emergencia? Llama al +58 (0261) 700-5141» (tarjeta `--papel`, borde izquierdo 6 px `--rojo`, botón `Emergencias`).

**Línea de afiliación** (bajo el título «Hola, …»): chip de estado (4.7) + «Vigente hasta el 31 de diciembre de 2026». Estados derivados de `afiliacion_vence` y la fecha de hoy en Caracas: `Vigente`, `Por vencer` (≤ 30 días), `Vencida`. Si no hay fecha, no se muestra línea.

**Estados de la pantalla** (el servidor decide el inicial según `estado()`; JS cambia entre ellos sin recargar):

| Estado | Condición | Pantalla |
|---|---|---|
| **0 · Inicio** | `estado()` es `null` | Tarjeta «Consulta por videollamada»: «Pulsa el botón. Quedarás en la sala de espera y un médico te atenderá por orden de llegada.»; `<details>` «¿Quieres contarle algo al médico? (opcional)» con `<textarea name="motivo" maxlength="200">`; botón **«Entrar a la videollamada»** (`.btn--lago .btn--grande .btn--bloque`, 88 px de alto, icono `video`) dentro de `<form method="post" action="/api/espera">` con `hidden accion=entrar`. Si llega `?error=…` se muestra tal cual (viene de `entrar()`: p. ej. «Tu afiliación venció el 30/09/2026. Escríbenos para renovarla.») en `.aviso--error role="alert"` con botón `Escribir por WhatsApp` («Renovar mi afiliación»). |
| **1 · Sala de espera** | `estado === 'espera'` | Ver abajo. |
| **2 · Te atienden** | `estado === 'atendiendo'` | Pantalla `--sol`: «**{Dr./Dra. Nombre} te está esperando.**» y un botón gigante **«Abrir la videollamada»** (`<a href="{enlace}" target="_blank" rel="noopener">`, `.btn--lago .btn--grande`, icono `video`; **no se abre solo**: los navegadores bloquean ventanas sin gesto). Debajo, el enlace en texto seleccionable («Si no se abre, copia este enlace») y botón `Copiar enlace`. `role="alert"` (anuncia al lector de pantalla), `document.title = '¡Te están esperando! · Policlínica Maracaibo'`, `navigator.vibrate?.([200, 100, 200])` y el foco pasa al botón. |
| **3 · Terminó / saliste** | La consulta pasó a `null` | Desde 2: «La consulta terminó. Gracias por conectarte.» Desde 1: «Saliste de la sala (cerraste o dejaste esta página). Cuando quieras, vuelve a entrar.» → recarga `/panel/` con el botón del estado 0. |

**Sala de espera (estado 1), «viva y tranquilizadora».** Fondo `--lago`, pantalla completa bajo la barra.
- **Visual: un anillo por persona delante de ti.** Un disco central `--sol` (tú) con tu posición en Fraunces 700 (`--t-num-m`) y, a su alrededor, `min(posicion − 1, 7)` anillos concéntricos finos (2 px, `--cal` al 45 %; decorativos). El disco **respira** (`@keyframes respira`: `scale 1 → 1.06 → 1`, 5 s `ease-in-out`, infinito; solo `transform`). Cuando tu posición baja, el anillo exterior se desvanece hacia afuera (`opacity → 0`, `scale 1.1`, 0.8 s) y el resto se acerca (transición de `transform`). Nada parpadea (WCAG 2.3.1).
- Título «Estás en la sala de espera». Línea grande: posición 1 → «**Eres el siguiente.**»; si no → «Hay {n} persona(s) antes que tú.» (`n = posicion − 1`, singular/plural).
- «Esperando: 04:12» (`esperando(creada)`, `<time>` en `aria-hidden`; no se anuncia cada segundo).
- «No cierres esta página. Cuando un médico te atienda, aquí aparecerá el botón para entrar a la videollamada.»
- «Mientras esperas»: (1) «Permite el uso de la cámara y el micrófono si tu navegador te lo pide.» (2) «Busca un lugar con buena luz y poco ruido.» (3) «Ten a mano tus informes o estudios, si los tienes.»
- Botón `Salir de la sala` (`.btn--borde`, 56 px; `<form method="post" action="/api/espera">` con `accion=cancelar`).
- **Si esperas más de 10 minutos** aparece (una vez) «Está tardando más de lo normal. Puedes seguir esperando o escribirnos por WhatsApp.» con botón WhatsApp («Consulta de telemedicina»). No se saca a nadie ni se promete un tiempo.
- Región `role="status" aria-live="polite"` (visualmente oculta) que anuncia **solo cambios de posición**: «Tu posición cambió: ahora hay 2 personas antes que tú.».
- **Latido**: `fetch('/api/espera')` cada **4 s** con la pestaña visible (cada 15 s oculta; al volver a visible, de inmediato por `visibilitychange`). Sin sondeo el servidor lo saca a los **2 min** (`tele.ts`). Si falla la red: banda «Sin conexión. Seguimos intentando…» (`aria-live`) y reintento; no se abandona la sala en el cliente. `navigator.wakeLock?.request('screen')` para que el teléfono no se apague (mejora progresiva; se libera al salir).
- **Sin JS**: `<noscript><meta http-equiv="refresh" content="10"></noscript>` en el `<slot name="head">`; cada recarga SSR también hace de latido.
- **Opcional (fase 2)**: botón «Probar mi cámara» (`getUserMedia` local; vista previa en un `<video>` en círculo; se detienen las pistas al salir; nada se sube).

**Historial de conexiones** (siempre, debajo): título «Mis conexiones»; lista de `historial({ clienteId })` sin las activas. Cada ítem (tarjeta de 72 px+, apilada en móvil, tabla en ≥ 900 px): fecha («19 de octubre de 2026»), hora («3:20 p. m.»), médico («Dra. Nuris Añez» o «—»), duración («18 min», de `atendida` a `finalizada`) y chip de estado: `Finalizada` (brisa + check) o `Saliste de la sala` (`cancelada`; papel + borde). Vacío: «Aún no te has conectado. Cuando lo hagas, tu historial aparecerá aquí.».

### 7.4 `/medico/` · cola en vivo (E)

SSR; rol `medico`. Lee `cola(env.DB, id)` y `historial(env.DB, { medicoId: id })`. `TeleShell` (médico): barra `--lago-2` con logo, «{Dr./Dra. nombre}» y `Salir`. Escritorio en dos columnas (cola 8/12 · en curso y ajustes 4/12); móvil una columna con **En curso primero**.

- **Encabezado**: H1 «Sala de espera», chip «{n} en espera», indicador «En vivo» con `.latido` (decorativo) y «Actualizado 3:20:12 p. m.» (`<time>`).
- **Mi enlace de Google Meet (opcional)**: campo `type="url"` `name="enlace"` (dentro del `<form id="cola">`), con ayuda «Si lo dejas vacío, se crea una sala de videollamada automática (Jitsi).». JS lo recuerda en `localStorage['pm-meet']`. Inválido → vuelve `?error=El enlace debe ser de Google Meet (https://meet.google.com/abc-defg-hij) o de Jitsi.`. *Nota de diseño*: Meet no permite crear salas desde la web sin la API de Google; por eso se pega el enlace propio del médico o se usa Jitsi.
- **Cola** = **un único `<form id="cola" method="post" action="/api/cola">`** con `hidden accion=atender`. Cada fila lleva `<button type="submit" name="consulta" value="{id}" class="btn btn--lago">Atender</button>` (56 px, `aria-label="Atender a {paciente}"`). Escritorio: `<table>` con columnas Orden · Paciente · Edad · Esperando · Motivo · acción (`<caption>` «Pacientes en espera, por orden de llegada»). Móvil: tarjetas (nombre en Fraunces 22 px, «67 años · esperando 07:32», motivo, botón a todo el ancho). La primera fila lleva el chip «Siguiente». **Espera larga** (siempre con texto, no solo color): ≥ 10 min → chip «Más de 10 min» (`--sol-claro`); ≥ 20 min → chip «Más de 20 min» + icono `alerta`. Edad «—» si no hay fecha de nacimiento.
- **En vivo**: `fetch('/api/cola')` cada **4 s** visible (15 s oculta), reconciliación **por `id`** (no se reconstruye la tabla; así no se pierde el foco ni el texto del enlace). Llegada nueva: la fila destella `--sol-claro` 1.2 s (solo `background-color`), se anuncia en un `aria-live="polite"` oculto («Llegó un paciente: {nombre}») y `document.title = '({n}) Sala de espera · Policlínica Maracaibo'`. **Sonido de aviso** (conmutador de 48 px «Sonido de aviso: Activado/Desactivado», `localStorage['pm-aviso']`, **desactivado por defecto**): un tono de 0.25 s generado con WebAudio (sin archivo) solo cuando llega alguien nuevo y el usuario ya interactuó con la página.
- **Vacío**: `.anillos` en reposo (estáticos) + «No hay pacientes en espera. Esta página se actualiza sola.».
- **En curso** (columna lateral / primero en móvil): una tarjeta por consulta (`enCurso[]`): paciente, edad, motivo, botón **«Abrir videollamada»** (`<a href="{enlace}" target="_blank" rel="noopener">`, `.btn--lago .btn--grande`), `Copiar enlace` (48 px) y **«Finalizar consulta»** (`.btn--borde`, `<form method="post" action="/api/cola">` con `accion=finalizar` y `consulta`). Con JS, «Finalizar» abre un `<dialog>`: «¿Finalizar la consulta con {paciente}?» con `Cancelar` (foco inicial) y `Sí, finalizar` (`.btn--lago`); sin JS envía directo. Si llega **`?atendiendo=<id>`** tras «Atender», esa tarjeta se resalta (`aria-current="true"`, borde 3 px `--sol`), el foco va a su botón «Abrir videollamada» y un `.aviso--ok role="status"` dice «Paciente tomado. Abre la videollamada para atenderlo.». **Conflicto** (otro médico se adelantó): `?error=Ese paciente ya fue tomado por otro médico o salió de la sala.` en `.aviso--error role="alert"`.
- **Mi historial**: tabla de las últimas 50 (`historial({ medicoId })`): Fecha, Hora, Paciente, Duración, Estado. Vacío: «Todavía no has atendido consultas.».
- **Sin JS**: la página SSR sirve; `<noscript><meta http-equiv="refresh" content="10">` la actualiza; todo se envía con formularios.

### 7.5 `/admin/` · panel del administrador ampliado (D)

**Estilo**: calmado y funcional. Fondo `--cal`, superficies `--papel` con borde 1 px `--linea`, texto `--tinta`; botones primarios `--lago` de 48–52 px; `--sol` solo para el foco y para resaltar el registro recién guardado (flash de 1.2 s); `--rojo` solo en eliminar y errores. Fraunces solo en títulos de página (28 px, `opsz` 36, `SOFT` 50, `wght` 600); todo lo demás Atkinson 17 px (tablas 16 px). Radios de 8 px (chips: píldora). Inputs de 52 px con borde 2 px `--tinta-2` y etiqueta **siempre visible** arriba (nunca solo placeholder). Foco: contorno de 3 px (3.1). Transiciones de 150 ms como máximo. Login = `/acceso/` (7.2).

**`AdminShell.astro`**: escritorio con barra lateral `--lago-2` de 248 px (logo blanco; ítems con icono y texto: **Resumen** · **Directorio médico** · **Especialidades** · **Clientes** (`/admin/usuarios/?rol=cliente`) · **Usuarios** · **Consultas**; abajo «{nombre} · Administrador» y `Salir`); el activo lleva `aria-current="page"` y marcador `--sol`. Móvil: barra superior `--lago-2` con logo y botón «Menú» (con texto) que abre un `<dialog>` con la misma navegación; sin JS, la navegación queda como fila envuelta. Cabecera de página: título (Fraunces 28 px) y a la derecha la acción primaria.

**Rutas y tareas**

| Ruta | Qué hace | Funciones (`src/lib`) |
|---|---|---|
| `/admin/` | **Resumen**: tarjetas con médicos del directorio, especialidades (y «N sin médicos»), clientes con afiliación vigente, afiliaciones que vencen en ≤ 30 días, personas en sala de espera ahora, consultas de hoy; lista «Por vencer» con enlace de WhatsApp al cliente (opcional, fase 2) | `resumen`, `usuarios`, `historial`; **D añade** `resumenAdmin(db)` a `usuarios.ts` con su caso en `tests/db.check.mjs` |
| `/admin/medicos/` | Tabla del directorio con búsqueda `?q=` y filtro `?esp=`; 25 por página (`?p=`) | `medicos`, `especialidades` |
| `/admin/medicos/nuevo/`, `/admin/medicos/[id]/` | Formulario agregar/editar + eliminar | `validarMedico`, `guardarMedico`, `borrarMedico`, `guardarFoto`, `quitarFoto` |
| `/admin/especialidades/` | Lista con cuenta de médicos + alta + baja | `especialidades`, `crearEspecialidad`, `borrarEspecialidad` |
| `/admin/usuarios/` | Todos los usuarios, pestañas por rol (`?rol=`), búsqueda (`?q=`) | `usuarios` |
| `/admin/usuarios/nuevo/`, `/admin/usuarios/[id]/` | Formulario agregar/editar + eliminar/desactivar (admin, médico o cliente) | `validarUsuario`, `guardarUsuario`, `borrarUsuario` |
| `/admin/consultas/` | Historial de telemedicina de toda la clínica (últimas 50) con filtro `?estado=`; solo lectura | `historial(db)` |

**Directorio médico (tabla)**: columnas Foto (miniatura circular de 48 px; sin foto = `Monograma`), Nombre, Especialidades (chips), Teléfono, Consultorio, Acciones. Acciones con **texto visible** («Editar», «Eliminar»), nunca solo iconos; nombres accesibles que incluyen al médico («Editar a Dr. Román de Vicente»). Filas de 64 px. En móvil la tabla se apila en tarjetas (`.tabla` con `data-etiqueta`). Botón primario **«Nuevo médico»** con `.mas`.

**Formulario de médico** (una columna, etiquetas arriba): Nombre (ayuda «Ej.: Dra. Nuris Añez»); **Especialidades** como `fieldset` con campo de filtro y lista de casillas (son 50; al menos una; mostrar las marcadas arriba); Teléfono (`inputmode="tel"`, ayuda «0414-0000000»); Consultorio (texto libre); **Foto** con vista previa circular «Así se verá en el directorio» (160 px) y guía «Cuadrada, 480×480»: con JS, un `<canvas>` recorta al centro, reduce a **480×480 WebP** (calidad .85) y reemplaza el archivo del `<input type="file">` (`DataTransfer`); sin JS se sube el original (el servidor valida ≤ 1 MB y WebP/JPG/PNG). Botón `Quitar foto` si ya hay. `Guardar médico` (`.btn--lago`) y `Cancelar`.
**Guardado**: redirección `?ok=guardado` → `.aviso--ok role="status"` («Guardado») con un anillo que da **un latido** (`.latido`, una vez), y la fila del médico guardado destella `--sol-claro` 1.2 s.
**Eliminar**: `<dialog>` nativo «¿Eliminar a Dra. Nombre Apellido? Esta acción no se puede deshacer.» con `Cancelar` (**foco inicial**) y `Sí, eliminar` (`.btn--rojo`). Sin JS: en `/admin/medicos/[id]/` hay una sección «Eliminar este médico» (`<details>`) con su propio formulario. **No hay «Deshacer»**: el esquema usa borrado duro (un «Deshacer» exigiría borrado lógico y migración).

**Especialidades**: formulario «Nueva especialidad» arriba (campo + `Agregar especialidad`); tabla Nombre · Médicos · Acción. `Eliminar` solo si tiene 0 médicos; si no, el botón queda `aria-disabled` con el texto «Tiene {N} médicos: quítasela primero» (la lib además lo impide). No hay renombrar (la lib no lo soporta).

**Usuarios y clientes**
- **Pestañas** (enlaces con `aria-current`): Todos · Clientes · Médicos · Administradores, con búsqueda por nombre, correo o cédula.
- **Tabla**: Nombre, Rol (chip), Correo, Cédula, Teléfono, Estado. En la pestaña **Clientes** se añaden **Afiliación** (chip `Vigente` / `Por vencer` / `Vencida` / `Suspendida`) y **Vence** (fecha). Estado de afiliación derivado de `activo` y `afiliacion_vence` (hoy en Caracas); `Suspendida` = `activo = 0`.
- **Formulario** (`fieldset` con leyenda): *Cuenta* — Rol (select 52 px), Nombre completo, Correo, Cédula (ayuda «V-12345678»; obligatoria para clientes), Contraseña (nuevo: obligatoria, ≥ 8; edición: vacía = no cambia) con botones `Mostrar` y **`Generar contraseña`** (JS: 12 caracteres legibles sin símbolos ambiguos, se muestra en claro para que el administrador la entregue; **no se puede recuperar después**). *Datos personales* — Teléfono, Fecha de nacimiento (`type="date"`), Dirección (`textarea` de 2 filas). *Afiliación* (solo clientes) — Vencimiento (`type="date"`) con chip de estado que se actualiza al cambiar la fecha. *Ficha del directorio* (solo rol médico) — `select name="medico_id"` con los médicos del directorio. *Estado* (solo edición) — casilla «Cuenta activa» («Si la desactivas, no podrá entrar y se cierran sus sesiones»). Con JS se muestran/ocultan los bloques según el rol (`data-solo-rol`); **sin JS están todos con la leyenda «(solo clientes)» / «(solo médicos)»** y el servidor valida todo (`validarUsuario`).
- **Eliminar usuario**: `<dialog>` «¿Eliminar a {nombre}?». Para clientes añade «También se borra su historial de consultas. Si solo quieres que no pueda entrar, desactiva la cuenta.» con el botón secundario **«Desactivar en lugar de eliminar»**. Errores de la lib (último administrador, no borrarse a sí mismo) en `.aviso--error`.
- Botón primario **«Nuevo cliente»** en la pestaña Clientes (prellena `rol=cliente`) y **«Nuevo usuario»** en las demás.

**Consultas**: tabla Fecha y hora · Paciente · Médico · Duración · Estado (chip: `En espera`, `Atendiendo`, `Finalizada`, `Cancelada`) · Motivo; cabecera con «En espera ahora: N · Atendiendo ahora: N». Móvil: tarjetas.

**Estados de carga/vacío**: toda tabla tiene estado vacío con texto («Aún no hay clientes. Agrega el primero con “Nuevo cliente”.»). Mientras se guarda: botón `aria-busy` y texto «Guardando…» (JS). Un indicador de 2 px `--sol` sobre `--lago-2` en la barra superior marca «guardando».

---

## 8. Lenguaje de movimiento y motor de escenas

### 8.1 Principios

- **Unidad de tiempo: el latido de 0.6 s.** Micro 0.3 s · UI 0.6 s · revelado 1.2 s · intro del héroe 2.4 s. Lag de scrub 1 s (1.2 s en la escena de anillos). Escalonado 0.06–0.1 s.
- **Eases**: `expo.out` para todo lo que «sale» (sol, iris, aperturas); `power2.inOut` para anillos y `clip-path`; `power3.out` para texto; `power4.out` para cortinas de línea; `back.out(1.2–1.6)` solo en `+`, insignias y etiquetas pequeñas. **Nada elástico, rebotante ni con overshoot sobre texto** (cansa a lectores mayores).
- **Cinco transiciones firma**: (1) **Iris de anillo** (`clip-path: circle`) para fotos; (2) **Arco «puerta»** (`inset` con radio superior) para servicios; (3) **Palabra encendida** para la misión; (4) **Números que maduran** (ejes de Fraunces) para años; (5) **Latido** (anillo que sale del punto vivo).
- **Solo se animan** `transform`, `opacity`, `clip-path` y dos variables CSS de eje sobre dos numerales. `will-change` solo mientras corre el tween (nunca fijo en CSS). `contain: paint` en contenedores recortados.
- **Dos escenas largas** (héroe→casa y anillos 1952→hoy), ambas con **CSS `position: sticky` + `ScrollTrigger` scrub, sin pin de GSAP** (no hay `pin-spacer`: no se rompe con Lenis ni con contenido dinámico). El resto son disparos únicos (`once: true`) o scrub corto.
- Los botones de Llamar, WhatsApp y Emergencias **nunca** se animan en opacidad ni empiezan escondidos.

### 8.2 `src/scripts/motion.js` (A)

Parte del motor de Proservi (`proservi-web/src/scripts/motion.js`, leído y verificado: registro `scene(fn)`, `gsap.matchMedia` con `desktop`/`mobile`/`reduced`, Lenis solo en escritorio enlazado a `gsap.ticker`, clase `.js`, anclas con Lenis, `document.fonts.ready → ScrollTrigger.refresh()`) y lo adapta:

| Parámetro | Valor |
|---|---|
| Plugins | `gsap`, `gsap/ScrollTrigger`, `gsap/SplitText` (GSAP 3.15; `Flip` solo lo importa `/directorio/`) |
| Condiciones | `desktop`: `(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)` y **no** `lite`; `mobile`: `(max-width: 899px), (pointer: coarse)`; `reduced`: `(prefers-reduced-motion: reduce)` o `pm-mov = reducido`. **`reduced` gana** a las otras. |
| Lenis (solo `desktop`) | `new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, syncTouch: false, autoRaf: false })`; `lenis.on('scroll', ScrollTrigger.update)`; `gsap.ticker.add(t => lenis.raf(t * 1000))`; `gsap.ticker.lagSmoothing(0)`; se destruye al salir de `desktop`. `lenis.stop()` con menú o `<dialog>` abierto. `data-lenis-prevent` en menús, diálogos y contenedores con scroll propio. |
| Anclas | `a[href^="#"]` → `lenis.scrollTo(destino, { offset: -88 })` (escritorio) o `scrollIntoView` (móvil); el destino recibe `tabindex="-1"` y `focus({ preventScroll: true })` |
| `ScrollTrigger.config` | `{ ignoreMobileResize: true }`; `refresh()` en `document.fonts.ready` y al cambiar `data-tam` |
| `data-fx` | El script inline (2.6) lo fija antes del primer pintado; el motor lo mantiene al cambiar la condición. CSS y escenas lo leen. |
| Exporta | `scene(fn)`, `scrollTo(sel)`, `setMovimiento('completo'\|'reducido')` (guarda `pm-mov`, hace `mm.revert()` y vuelve a ejecutar las escenas **sin recargar**), `observar(el, onEntra, onSale)` (IO para pausar bucles), `lite` (booleano) |
| Helpers declarativos | `data-revelar`, `data-delay`, `data-contar` (4.13) |

```js
// Cualquier componente: <script> al final del .astro
import { scene } from '../../scripts/motion.js';
scene(({ gsap, ScrollTrigger, SplitText, q, qa, mode, lite }) => {
  // mode: 'desktop' | 'mobile' | 'reduced'. El HTML ya es el estado final.
  const el = q('[data-escena="anillos"]');
  if (!el || mode === 'reduced') return;
  if (mode === 'mobile' || lite) { /* disparo único */ return; }
  // … timeline con ScrollTrigger (sin pin) …
  // No hace falta limpiar: gsap.matchMedia revierte tweens y triggers al cambiar de condición.
});
```

Reglas: crear **todo** (tweens, triggers, listeners) **dentro** de la función `scene` para que `matchMedia` lo revierta; `gsap.set` de estados iniciales solo en `desktop`/`mobile` (nunca en `reduced`); `invalidateOnRefresh: true` en todo lo que mida el DOM; `SplitText` con `autoSplit: true` y `aria: 'auto'` (3.13+; no añadir `aria-label` a mano).

### 8.3 Presupuesto de animación

| | Escritorio (`desktop`) | Móvil (`mobile`, incluye `lite`) | `reduced` / sin JS |
|---|---|---|---|
| Pins de GSAP | **0** | **0** | 0 |
| Escenas largas con sticky | 2 (260–300vh) | 0 | 0 (alto automático) |
| Scrubs activos | ≤ 6 en todo el sitio, **≤ 2 a la vez** | **1** (palabras encendidas de la misión) | 0 |
| Elementos animados a la vez | ≤ 12 (`stagger` .06–.1) | ≤ 8 | 0 |
| Bucles ambientales (`latido`, `respira`, sol, cinta, aguja) | ≤ 3 simultáneos; pausa fuera de viewport (IO) | `latido` solo si no es `lite` | ninguno |
| Parallax | Solo escena 1 | No | No |
| Lenis | Sí | No | No |
| Intro del héroe | 2.4 s, 1 vez por sesión | 1.2 s (solo «74») | Ninguna |
| Cursor/puntero | `quickTo` ±12 px en el campo de anillos | No | No |

`reduced`: se conservan los fundidos de opacidad de un solo disparo (0.2 s), las aperturas circulares instantáneas y los contadores en su valor final; los numerales se muestran en `wght 800 / SOFT 100`.

### 8.4 Qué se ancla (sticky) y qué no

- **Sticky CSS** (solo `desktop`): `.escena--inicio` (300vh), `.escena--anillos` (260vh), vista previa de H6, riel de letras de `/especialidades/`, pila Misión/Visión de `/nosotros/`, barra de búsqueda de `/directorio/`.
- **Nada** queda anclado en móvil salvo el header (que se esconde al bajar), la barra de acción inferior y, en `/especialidades/`, la tira de letras de 48 px.
- Los altos grandes solo existen bajo `html[data-fx="desktop"]`; sin JS o en móvil miden `auto`.

### 8.5 Catálogo de escenas de scroll (valores exactos)

| Id | Dónde | `trigger` | `start` | `end` | `scrub` | `pin` | Móvil |
|---|---|---|---|---|---|---|---|
| inicio | H1 | `.escena--inicio` | `top top` | `bottom bottom` | 1 | no (sticky CSS) | solo palabras: `start 'top 80%'`, `end 'bottom 55%'`, `scrub: true` |
| anillos | H2 | `.escena--anillos` | `top top` | `bottom bottom` | 1.2 | no (sticky CSS) | disparo único `top 60%`, `once` |
| hoy | H3 | `.hoy` | `top 75%` | — | — (`once`) | no | igual |
| puertas | H4 | `.puertas` | `top 80%` | — | `once` | no | sin animación |
| reloj | H5 | sección | IO (`.is-in`) | — | `once` | no | igual |
| servicios (filas) | H6 | cada `<a>` de fila | `top 50%` | `bottom 50%` | — (`onToggle`) | no | `ScrollTrigger.batch`, `once` |
| cinta | H7 | ticker + `getVelocity()` | — | — | — | no | tira con snap, sin movimiento |
| afiliación | H8 | sección | `top 70%` | — | `once` | no | estático |
| cierre | H10 | `.cierre` | `top bottom` | `center center` | `true` | no | estático |
| footer | global | `footer` | `top bottom` | `bottom bottom` | `true` | no | estático |
| pila | `/nosotros/` | `.panel--vision` | `top 75%` | `top 25%` | `true` | no (sticky CSS) | bloques normales |
| revelar | helper 4.13 | el elemento | `top 85%` | — | `once` | no | `once` |
| Flip | `/directorio/` | evento de filtro | — | — | — | no | sin Flip si > 40 resultados |

### 8.6 Transición entre páginas (entre documentos; solo sitio público)

Mejora progresiva con **View Transitions nativas** (Chrome/Edge, Safari 18+); Firefox navega normal. Solo dentro de `prefers-reduced-motion: no-preference`:

```css
@media (prefers-reduced-motion: no-preference) {
  @view-transition { navigation: auto; }
  ::view-transition-old(root) { animation: vt-sale .2s var(--ease-inout) both; }
  ::view-transition-new(root) { animation: vt-entra .3s var(--ease-out) both; }
  ::view-transition-group(srv) { animation-duration: .6s; animation-timing-function: var(--ease-out); }
  @keyframes vt-entra { from { opacity: 0; transform: translateY(12px); } }
  @keyframes vt-sale  { to   { opacity: 0; } }
}
.cabecera { view-transition-name: cabecera; } .barra-accion { view-transition-name: barra; }   /* no se barren */
.servicio-cabecera [data-vt-img] { view-transition-name: srv; }                                 /* destino: único por página */
```

**Arco compartido**: en `pageswap` (en `chrome.js`) se busca el enlace `[data-vt]` cuyo `href` coincide con la URL de destino (`event.activation.entry.url`) y se le pone `view-transition-name: srv` **a su imagen `[data-vt-img]` solo en ese momento** (los nombres deben ser únicos por documento). Así el arco del índice «viaja» a la cabecera del servicio. Las zonas privadas no declaran `@view-transition` (no participan).

### 8.7 Qué se recicla de las otras páginas de Diego (y qué no)

- **Se recicla** (solo mecánica y detallitos; ninguna paleta, fuente ni escena): `proservi-web/src/scripts/motion.js` (registro `scene`, `matchMedia` de tres casos, Lenis solo en escritorio enlazado al ticker, clase `.js`, anclas con Lenis, `fonts.ready → refresh`; se retocan `offset -88`, `lerp .085`, `wheelMultiplier .95`). Según lo documentado por los conceptos (A revisa el archivo antes de copiar): de `ssds-proyectos/src/components/chrome/WhatsAppFab.astro` y `scripts/chrome.js` la barra de acción que se oculta con `visibility:hidden` tras el slide-out, `[data-fab-hide]` con IO, `safe-area-inset-bottom`, el ayudante `raf()` y medir una vez por `refresh`; de `Loader.astro` la lógica de «solo la primera visita de la sesión (`sessionStorage`), nunca con reduced ni sin JS, se salta con clic/Esc, tope de seguridad de 2.8 s» (aquí aplicada a la intro del héroe, sin cortina aparte); de `chrome.js` el header que se esconde al bajar y cambia de tema por IO con `rootMargin -95%`, y `gsap.quickTo` para el puntero; de `engine.js` el patrón `data-count` (aquí `data-contar`).
- **Se evita a propósito**: el azul marino con naranja de SSDS, el loader hexagonal, La Línea, El Arco, cualquier héroe oscuro con pin, la pareja cal+tan de VisualDents, tilt/magnetic/cursores especiales, odómetro de dígitos, recorridos horizontales con pin.

---

## 9. Accesibilidad y rendimiento (reglas concretas)

### 9.1 Accesibilidad (WCAG 2.2 AA como mínimo)

1. **Estructura**: `<html lang="es-VE">`; un solo `<h1>` por página; landmarks (`header`, `nav`, `main#contenido`, `footer`); enlace «Saltar al contenido» como primer foco; `<title>` único («{Página} · Policlínica Maracaibo»).
2. **Contraste**: solo los pares de 2.1. Nada de texto sobre foto sin velo `--lago` ≥ .72 o panel sólido. Estados atenuados con opacidad < .5 prohibidos en texto.
3. **Foco** (2.4.7, 2.4.11): contorno de 3 px (tinta sobre claro, sol sobre lago), `outline-offset: 3px`; el aro nunca se pone en un elemento con `clip-path`/`overflow:hidden` (va en el `<a>`/`<button>` padre). `html { scroll-padding-top: calc(var(--header-h) + 1rem); scroll-padding-bottom: calc(var(--barra-h) + 1rem) }` para que el header y la barra no tapen el elemento enfocado. `scroll-margin-top` en anclas.
4. **Teclado**: todo operable con Tab/Enter/Espacio/Esc; orden de tabulación = orden visual; los `<dialog>` nativos atrapan el foco y devuelven el foco al disparador; lo que se esconde al hacer scroll (texto del héroe) recibe `inert`.
5. **Objetivos táctiles**: ≥ 48 px en todo lo interactivo (24 px es el mínimo de WCAG; este sitio usa 48); acciones principales 56–72 px; separación ≥ 8 px. Nada de botones magnéticos ni objetivos móviles (la cinta de retratos se detiene al enfocar y tiene botón de pausa).
6. **Sin hover-only**: todo `:hover` tiene `:focus-visible` y equivalente táctil. Sin tooltips para información esencial.
7. **Texto**: cuerpo 19 px / 1.6; medida ≤ 62ch; sin justificar; mayúsculas solo en `.eyebrow`; abreviaturas «a. m./p. m.»; sin números romanos. Con `A++` (125 %) y zoom del navegador al 200 % no hay scroll horizontal ni texto cortado (probar a 320 px de ancho).
8. **Imágenes**: alt descriptivo y real en toda foto informativa (tablas 4.0.2 y 4.0.3); `alt=""` en decorativas; en tarjetas de médico el nombre ya está en texto, así que el retrato lleva `alt=""`; SVG decorativo (`Anillos`, `Dial`, `Cifra` animada) `aria-hidden="true"` con su equivalente textual real al lado.
9. **Movimiento**: `prefers-reduced-motion` y conmutador visible «Movimiento: Activado/Reducido» en menú y pie; cinta con botón «Pausar movimiento» (2.2.2); ningún destello (2.3.1; el encendido de palabras es una rampa, no un parpadeo); animaciones autónomas > 5 s tienen pausa; parallax solo escritorio.
10. **Formularios**: etiqueta visible siempre; `autocomplete` correcto (`username`, `current-password`, `tel`, `bday`…); errores en `.aviso--error role="alert"` + texto (no solo color) y valores conservados; `inputmode`/`enterkeyhint`; sin CAPTCHA.
11. **Anuncios en vivo**: regiones `aria-live="polite"` pequeñas y separadas (conteo del directorio, posición en la fila, llegada de pacientes). Nunca se anuncia un cronómetro segundo a segundo. La alerta de «Te están esperando» usa `role="alert"` una sola vez.
12. **`prefers-contrast: more`**: `--tinta-2` pasa a `--tinta`, `--anillo` a transparente, bordes de 3 px, sin halos. **`forced-colors: active`**: `.anillos`, `.apertura::after` y `.amanecer` se ocultan; el foco usa `Highlight`; los botones conservan borde.
13. **Color nunca solo**: los chips de estado llevan icono y texto; los errores llevan icono y texto; «espera larga» lleva texto.
14. **Enlaces de llamada**: el texto del enlace incluye el número; `aria-label` incluye a quién se llama.
15. **Sin JS**: ver cada sección; la página es usable y los enlaces `tel:`/WhatsApp funcionan.

### 9.2 Rendimiento

- **Metas**: LCP < 2.5 s en 4G simulada (Lighthouse móvil ≥ 90 en `/` y `/directorio/`), CLS < 0.05 (≤ 0.02 atribuible a fuentes), INP < 200 ms.
- **JS**: GSAP core + ScrollTrigger + SplitText + Lenis ≈ 60 KB gz, como módulo diferido; **Flip** solo en `/directorio/`; **cero GSAP/Lenis** en zonas privadas; sin librerías de UI, sin analítica, sin mapas incrustados (el mapa es un enlace), sin iframes.
- **Imágenes**: todo por `astro:assets` (`<Picture formats={['avif','webp']}>`), `width`/`height` siempre, `sizes` correctos. LCP: la foto del héroe móvil a 640 px (≈ 40 KB, `fetchpriority="high"`, `loading="eager"`) y solo ella; el resto `loading="lazy" decoding="async"`. Retratos de médicos: ya son 480×480 (≈ 20 KB c/u): `lazy`. Nunca ampliar por encima de 1.25× la fuente (4.0.2).
- **Fuentes**: Fraunces `full.css` (121 KB) + Atkinson (34 KB) en las públicas; `wght.css` (37 KB) en las privadas; precarga de los dos `latin` normales; `font-display: swap`; fallbacks con `size-adjust`. `WONK` no se anima; solo 2 nodos con ejes animados y con `contain`.
- **CSS**: `global.css` < 30 KB gz; estilos de componente con scope; `content-visibility: auto` + `contain-intrinsic-size` en secciones y tarjetas bajo el pliegue (nunca en el héroe ni en escenarios sticky).
- **Capas**: sin `backdrop-filter`; `mix-blend-mode` solo en elementos < 400 px y apagado en `lite`; `filter` solo en la imagen activa; campo de anillos ≤ 1300 px y estático en `lite`.
- **Modo `lite`** (`hardwareConcurrency ≤ 4`, `deviceMemory ≤ 4` o `saveData`): el escritorio recibe el tratamiento **móvil** (sin escenas de scroll, sin Lenis, sin latido ni bucles, sin blend).
- **SSR + D1**: la portada hace ≤ 4 consultas (agrupadas con `db.batch`); `/directorio/` una; cabeceras `Cache-Control` de 4.1. *Techo conocido*: Cloudflare no guarda en caché HTML de Workers sin regla; si la latencia molesta, añadir la Cache API.
- **Verificación**: `tools/qa/shoot.mjs` (capturas CDP) a 1366×820 y 390×844, con `--reduced` y `--lite`; Lighthouse móvil; JS desactivado; recorrido solo con teclado; contraste con DevTools sobre los pares de 2.1.

---

## 10. Reparto de archivos para 4–5 desarrolladores (sin solapamiento)

**Reglas.** Nadie edita un archivo que no es suyo; si hace falta algo en `global.css` o en `ui/*`, se pide a A en una línea. Estilos de componente con `<style>` con scope y clases BEM por zona (`.hero__…`, `.admin-…`, `.tele-…`, `.dir-…`) para no chocar. **No tocar** `src/lib/{auth,tele}.ts`, `src/middleware.ts`, `src/pages/api/*`, `src/pages/fotos/*`, `migrations/*` (backend, ya hecho y probado). Si falta una función de datos: añadir una función pequeña al módulo que corresponde **y su caso en `tests/db.check.mjs`** (`npm test` debe pasar).

| Dev | Archivos que **posee** | Depende de |
|---|---|---|
| **A · Sistema base** | `src/styles/global.css`, `src/styles/privado.css` · `src/layouts/Layout.astro`, `src/layouts/Privado.astro` · `src/components/Header.astro`, `Footer.astro`, `Logo.astro` · `src/components/ui/*` (`Tira`, `BarraAccion`, `Icono`, `Chip`, `ServicioCard`, `MedicoCard`, `Monograma`, `Buscador`, `ContactoCTA`, `Anillos`, `Apertura`, `Dial`, `Cifra`, `Migas`, `Seccion`) · `src/scripts/motion.js`, `src/scripts/chrome.js` · `src/data/site.ts` (extensiones 4.0) · `src/lib/sitio.ts` + `tests/sitio.check.mjs` · `resumen()` y `retratosDelDia()` en `src/lib/db.ts` (+ tests) · `public/robots.txt`, `src/assets/grano.svg`, retoques y desenfoques de imágenes (4.0.1) · `package.json` (fuentes) | — (publica primero) |
| **B · Home** | `src/pages/index.astro` · `src/components/home/*` (`Hero`, `Anillos`, `Hoy`, `Puertas`, `Reloj`, `Servicios`, `Medicos`, `CintaMedicos`, `Afiliacion`, `Testimonios`, `Cierre`) | A (layout, tokens, ui, motor, datos) |
| **C · Páginas internas** | `src/pages/servicios/index.astro`, `src/pages/servicios/[slug].astro`, `src/pages/especialidades.astro`, `src/pages/nosotros.astro`, `src/pages/afiliacion.astro`, `src/pages/404.astro` · `src/components/inner/*` | A |
| **D · Directorio + admin** | `src/pages/directorio/*`, `src/pages/admin/**` · `src/components/directorio/*`, `src/components/admin/*` (`AdminShell`, tablas, formularios, diálogos) · `resumenAdmin()` en `src/lib/usuarios.ts` (+ test) | A (`Privado`, `privado.css`, `MedicoCard`, `Buscador`, `Chip`) |
| **E · Telemedicina** | `src/pages/acceso.astro`, `src/pages/panel/*`, `src/pages/medico/*` · `src/components/tele/*` (`TeleShell`, `SalaEspera`, `EntrarVideollamada`, `HistorialCliente`, `ColaMedico`, `EnCursoCard`, scripts de sondeo) | A (`Privado`, `privado.css`, `Chip`, `Icono`, `Anillos`); backend ya hecho |

### 10.1 Lo que B, C, D y E pueden dar por hecho de A

**Tokens** (2.x): todas las variables CSS de 2.1–2.5; temas por `[data-tema]`; `--tap*`, `--header-h`, `--barra-h`.
**Clases** (4.14): `.contenedor`, `.seccion`, `.pila`, `.rejilla`, `.solo-lectores`, `.js-solo`, `.sin-js-solo`, `.eyebrow`, `.lede`, `.numeral`, `.folio`, `mark.subrayador`, `.medida`, `.tarjeta`, `.mas`, `.anillos`, `.apertura`, `.amanecer`, `.latido`, `.foto-tratada`, `.btn` y variantes (4.5), `.chip` (4.7), `.campo*`, `.entrada`, `.seleccion`, `.area`, `.fieldset`, `.casillas`, `.aviso*`, `.tabla`.
**Componentes** (props en 4.x): `Layout`, `Privado`, `Header`, `Footer`, `Logo`, `Tira`, `BarraAccion`, `Icono`, `Chip`, `ServicioCard`, `MedicoCard`, `Monograma`, `Buscador`, `ContactoCTA`, `Anillos`, `Apertura`, `Dial`, `Cifra`, `Migas`, `Seccion`.
**JS** (`src/scripts/motion.js`): `scene(fn)`, `scrollTo`, `setMovimiento`, `observar`, `lite`; atributos `data-revelar`, `data-delay`, `data-contar`, `data-fab-hide`, `data-lenis-prevent`, `data-vt`/`data-vt-img`, `data-insignia-74`, `data-tema`, `data-header-tema`.
**Datos** (`src/data/site.ts`): `clinica`, `anos()`, `servicios`, `indiceServicios`, `horarios`, `hitos`, `testimonios`, `instalaciones`, `afiliacion`, `nav`. **Funciones** (`src/lib/sitio.ts`): `telHref`, `waHref`, `iniciales`, `estaAbierto`, `fechaCaracas`, `duracion`, `esperando`. **D1** (`src/lib/db.ts` + `usuarios.ts` + `tele.ts` existentes): `especialidades`, `medicos`, `medico`, `resumen`, `retratosDelDia`, `usuarios`, `usuario`, `estado`, `cola`, `historial`, `aFecha`…
**Contratos de API** (ya hechos): `GET /api/espera` → `{ consulta: null | { id, estado: 'espera'|'atendiendo', posicion, enlace, medico, creada, atendida } }` (también es el latido); `POST /api/espera` `accion=entrar|cancelar` (+ `motivo`) → 303 `/panel/` (o `/panel/?error=…`). `GET /api/cola` → `{ espera: [{ id, paciente, edad, motivo, creada }], enCurso: [{ …, enlace }] }`; `POST /api/cola` `accion=atender` (+ `consulta`, `enlace?`) → 303 `/medico/?atendiendo=<id>` · `accion=finalizar` (+ `consulta`) → 303 `/medico/` · errores `/medico/?error=…`. `POST /api/sesion` (7.2).

### 10.2 Orden de entrega y definición de «hecho»

1. **A, primeras horas**: tokens + `global.css` + `Layout`/`Privado` + `Header`/`Footer` básicos + `ui/*` con **props congeladas** (aunque con estilo mínimo) + `site.ts`/`sitio.ts`/`db.ts` ampliados + imágenes retocadas. Con eso B–E avanzan en paralelo contra los stubs.
2. **B–E**: página sin JS correcta → móvil → escritorio estático → capa GSAP → reduced.
3. **A, final**: motor `motion.js` completo, helpers declarativos, view transitions, preferencias.
4. **Integración**: `npm test` pasa; `npm run build` sin errores.

**Hecha** = (a) sin JS: todo el contenido, enlaces `tel:`/WhatsApp y formularios funcionan; (b) 390×844 y 1366×820 sin scroll horizontal ni texto cortado, también con `A++`; (c) `prefers-reduced-motion` y el conmutador respetados; (d) teclado completo, foco visible; (e) contrastes solo de la tabla 2.1; (f) Lighthouse móvil ≥ 90 en la página; (g) capturas con `tools/qa/shoot.mjs` (normal, `--reduced`, `--lite`) revisadas; (h) ningún dato inventado (todo de `site.ts`/D1 o marcado POR CONFIRMAR).

---

## 11. Por confirmar con el profesor/la clínica y riesgos

| Pendiente | Texto temporal en el sitio |
|---|---|
| **Precio y periodicidad de la afiliación** | «Consulta el precio» + WhatsApp. Nunca una cifra. |
| Qué cubre exactamente la afiliación y condiciones | Solo lo de `afiliacion.incluye` (todos los servicios + telemedicina + historial). Sin descuentos ni cantidades. |
| Proceso de afiliación y de restablecer contraseña | Pasos genéricos de 6.6 y 7.2, marcados POR CONFIRMAR en el código. |
| Horario de la telemedicina y si hay médicos conectados siempre | «Te lo confirmamos por WhatsApp o al llamar a la central.» y aviso de espera > 10 min con WhatsApp. |
| Meet vs Jitsi | Se pega el enlace de Meet del médico o se usa Jitsi automático (Meet no se crea sin la API de Google). |
| Hitos históricos reales | Solo 1952 y 2022; el array `hitos` crece cuando la clínica los entregue. |
| Servicio ↔ especialidad (sección «Especialistas de…») | Los de `site.ts`; Laboratorio sin especialidad (omite la sección) hasta confirmar. |
| Fotos | Ideal: sesión de 12 fotos (manos, sala de espera, médicos trabajando). `home-1/2/3.jpg`: origen y consentimiento sin confirmar → no se usan. |
| Dominio y despliegue | `SITE_URL` y ruta en `wrangler.jsonc`; redesplegar cada 1 de enero (las páginas estáticas calculan `anos()` en el build). |

**Riesgos técnicos a vigilar**
1. **Latido vs pestañas congeladas en móvil**: el servidor saca de la sala tras 2 min sin sondeo (`tele.ts`). Si el paciente cambia de aplicación y el navegador congela la pestaña, pierde su turno. Mitigado con `visibilitychange`, wake lock y el estado 3 («Saliste de la sala»); **recomendación al backend**: subir la ventana a 5 min (un solo literal en `limpiar()` + su prueba).
2. **Fraunces completa (121 KB)** y el campo de anillos (moiré/estrés visual): reglas de 3.1 y modo `lite`.
3. **LCP de escritorio en primera visita**: `html.intro` esconde parte del héroe hasta que arranca el JS; red de seguridad de 3 s y compuerta `performance.now() < 1500`. Si Lighthouse de escritorio baja de 90, la intro pasa a una sola vez por *día* o se elimina.
4. **Fotos de teléfono**: cables, baja resolución y ampliación ≤ 1.25×; aperturas y velo las disimulan; la mejora real es una sesión nueva.
5. **Sticky + Lenis + imágenes**: `invalidateOnRefresh` y `ScrollTrigger.refresh()` tras `fonts.ready`; las imágenes llevan `width`/`height` para que el layout no se mueva.
6. **Compatibilidad**: View Transitions entre documentos (no en Firefox) y `@property --sweep` degradan a navegación normal / dial estático; `animation-timeline: view()` con respaldo IO.
7. **Cifras que cambian**: las páginas SSR leen D1; las estáticas no muestran cifras de la base.
8. **Símbolos**: la cruz roja sobre blanco y la cruz verde evocan emblemas protegidos/farmacia: el `+` vive en tinta, lago, cal o sol; el rojo y el verde son superficies o botones, nunca una cruz.

---

*Fin del documento. Cualquier cambio de diseño se hace aquí primero; el código sigue a este archivo.*
