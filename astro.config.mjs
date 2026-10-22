import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

// Tres modos con el mismo código:
//  · servidor Node (`--mode node`, .env.node): servidor propio (Webuzo) con SQLite en archivo; paneles, login y videollamada reales.
//  · servidor Cloudflare (por defecto): Workers + D1. Páginas públicas prerenderizadas; directorio, paneles y admin bajo demanda.
//  · demo (PUBLIC_DEMO=1): sitio 100 % estático para GitHub Pages; la base se arma al compilar con datos de ejemplo.
// `astro dev|build --mode demo|node` carga .env.demo / .env.node; también valen PUBLIC_DEMO=1 y TARGET=node como variables de entorno
const i = process.argv.indexOf('--mode');
const env = loadEnv(i > 0 ? process.argv[i + 1] : (process.env.NODE_ENV ?? 'development'), process.cwd(), '');
const DEMO = (process.env.PUBLIC_DEMO ?? env.PUBLIC_DEMO) === '1';
const NODE = !DEMO && (process.env.TARGET ?? env.TARGET) === 'node';
// Detrás del proxy de Apache el servidor Node ve http y el host interno: se confía en X-Forwarded-* solo para el dominio del sitio (SITE_URL al compilar)
const sitio = new URL(process.env.SITE_URL || 'https://www.policlinicamaracaibo.com');
// CF_STATE (en .env): carpeta del D1 local si la ruta del proyecto es muy larga para Windows (usar la misma en wrangler --persist-to)
const CF_STATE = env.CF_STATE;

// Rutas que solo existen con servidor
const SERVIDOR = [
  ['/api/sesion', './src/server/api/sesion.ts'],
  ['/api/espera', './src/server/api/espera.ts'],
  ['/api/cola', './src/server/api/cola.ts'],
  ['/fotos/[id]', './src/server/fotos.ts'],
];

const modo = {
  name: 'policlinica-modo',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      if (!DEMO) for (const [pattern, entrypoint] of SERVIDOR) injectRoute({ pattern, entrypoint, prerender: false });
    },
    // En la demo todo se prerenderiza, aunque la página diga prerender = false
    'astro:route:setup': ({ route }) => {
      if (DEMO) route.prerender = true;
    },
  },
};

export default defineConfig({
  site: DEMO ? 'https://diestorn03.github.io' : sitio.href,
  security: NODE ? { allowedDomains: [{ hostname: sitio.hostname, protocol: sitio.protocol.slice(0, -1) }] } : undefined,
  base: DEMO ? '/policlinica-maracaibo' : '/',
  trailingSlash: 'ignore',
  adapter: DEMO ? undefined : NODE ? node({ mode: 'standalone' }) : cloudflare({ imageService: 'compile', persistState: CF_STATE ? { path: CF_STATE } : undefined }),
  integrations: [modo],
  devToolbar: { enabled: false },
  server: { port: 4330 },
  vite: {
    // caché propia por modo: el servidor normal (4330) y el de la demo (4331) corren a la vez
    cacheDir: DEMO ? 'node_modules/.vite-demo' : NODE ? 'node_modules/.vite-node' : 'node_modules/.vite',
    resolve: { alias: { '#fuente': fileURLToPath(new URL(DEMO ? './src/lib/fuente-demo.ts' : NODE ? './src/lib/fuente-node.ts' : './src/lib/fuente-cf.ts', import.meta.url)) } },
  },
});
