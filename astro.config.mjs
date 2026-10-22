import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

// Cuatro modos con el mismo código:
//  · hosting PHP + MariaDB (`--mode php`, .env.php): sitio estático + zonas privadas en PHP (php/, docs/PHP.md). Es el que corre en el hosting del profesor.
//  · servidor Node (`--mode node`, .env.node): servidor propio (Webuzo) con SQLite en archivo; paneles, login y videollamada reales.
//  · servidor Cloudflare (por defecto): Workers + D1. Páginas públicas prerenderizadas; directorio, paneles y admin bajo demanda.
//  · demo (PUBLIC_DEMO=1): sitio 100 % estático para GitHub Pages; la base se arma al compilar con datos de ejemplo.
// `astro dev|build --mode demo|node` carga .env.demo / .env.node; también valen PUBLIC_DEMO=1 y TARGET=node como variables de entorno
const i = process.argv.indexOf('--mode');
const env = loadEnv(i > 0 ? process.argv[i + 1] : (process.env.NODE_ENV ?? 'development'), process.cwd(), '');
const DEMO = (process.env.PUBLIC_DEMO ?? env.PUBLIC_DEMO) === '1';
const NODE = !DEMO && (process.env.TARGET ?? env.TARGET) === 'node';
const PHP = !DEMO && (process.env.TARGET ?? env.TARGET) === 'php';
// Marcos de las zonas privadas: Astro los compila con las marcas @@…@@ y php/app/shell.php los rellena (tools/empaquetar-php.mjs los copia a app/shell/)
const MARCOS = ['acceso', 'panel', 'medico', 'secretaria', 'admin'];
// Detrás del proxy de Apache el servidor Node ve http y el host interno: se confía en X-Forwarded-* solo para el dominio del sitio (SITE_URL al compilar)
const sitio = new URL(process.env.SITE_URL || 'https://www.policlinicamaracaibo.com');
// CF_STATE (en .env): carpeta del D1 local si la ruta del proyecto es muy larga para Windows (usar la misma en wrangler --persist-to)
const CF_STATE = env.CF_STATE;

// Rutas que solo existen con servidor
const SERVIDOR = [
  ['/api/sesion', './src/server/api/sesion.ts'],
  ['/api/espera', './src/server/api/espera.ts'],
  ['/api/cola', './src/server/api/cola.ts'],
  ['/api/senal', './src/server/api/senal.ts'],
  ['/fotos/[id]', './src/server/fotos.ts'],
];

const modo = {
  name: 'policlinica-modo',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      if (!DEMO && !PHP) for (const [pattern, entrypoint] of SERVIDOR) injectRoute({ pattern, entrypoint, prerender: false });
      if (PHP) for (const a of MARCOS) injectRoute({ pattern: `/shell/${a}`, entrypoint: `./src/shell/${a}.astro`, prerender: true });
    },
    // En la demo y en el modo PHP todo se prerenderiza, aunque la página diga prerender = false (en PHP las zonas privadas reales las dibuja PHP; sus copias estáticas se descartan al empaquetar)
    'astro:route:setup': ({ route }) => {
      if (DEMO || PHP) route.prerender = true;
    },
  },
};

export default defineConfig({
  site: DEMO ? 'https://diestorn03.github.io' : sitio.href,
  security: NODE ? { allowedDomains: [{ hostname: sitio.hostname, protocol: sitio.protocol.slice(0, -1) }] } : undefined,
  base: DEMO ? '/policlinica-maracaibo' : '/',
  trailingSlash: 'ignore',
  adapter: DEMO || PHP ? undefined : NODE ? node({ mode: 'standalone' }) : cloudflare({ imageService: 'compile', persistState: CF_STATE ? { path: CF_STATE } : undefined }),
  integrations: [modo],
  devToolbar: { enabled: false },
  server: { port: 4330 },
  vite: {
    // caché propia por modo: el servidor normal (4330) y el de la demo (4331) corren a la vez
    cacheDir: DEMO ? 'node_modules/.vite-demo' : PHP ? 'node_modules/.vite-php' : NODE ? 'node_modules/.vite-node' : 'node_modules/.vite',
    resolve: { alias: { '#fuente': fileURLToPath(new URL(DEMO ? './src/lib/fuente-demo.ts' : PHP ? './src/lib/fuente-php.ts' : NODE ? './src/lib/fuente-node.ts' : './src/lib/fuente-cf.ts', import.meta.url)) } },
  },
});
