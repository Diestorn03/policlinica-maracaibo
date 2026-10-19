import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

// Dos modos con el mismo código:
//  · servidor (por defecto): Cloudflare Workers + D1. Páginas públicas prerenderizadas; directorio, paneles y admin bajo demanda.
//  · demo (PUBLIC_DEMO=1): sitio 100 % estático para GitHub Pages; la base se arma al compilar con datos de ejemplo.
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
const DEMO = (process.env.PUBLIC_DEMO ?? env.PUBLIC_DEMO) === '1';
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
  site: DEMO ? 'https://diestorn03.github.io' : process.env.SITE_URL || 'https://www.policlinicamaracaibo.com',
  base: DEMO ? '/policlinica-maracaibo' : '/',
  trailingSlash: 'ignore',
  adapter: DEMO ? undefined : cloudflare({ imageService: 'compile', persistState: CF_STATE ? { path: CF_STATE } : undefined }),
  integrations: [modo],
  devToolbar: { enabled: false },
  server: { port: 4330 },
  vite: {
    resolve: { alias: { '#fuente': fileURLToPath(new URL(DEMO ? './src/lib/fuente-demo.ts' : './src/lib/fuente-cf.ts', import.meta.url)) } },
  },
});
